import { Stack, useRouter, useSegments } from 'expo-router';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import '@/global.css';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { 
  useFonts, 
  SpaceGrotesk_400Regular, 
  SpaceGrotesk_700Bold 
} from '@expo-google-fonts/space-grotesk';
import { 
  Manrope_400Regular, 
  Manrope_500Medium, 
  Manrope_700Bold 
} from '@expo-google-fonts/manrope';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
import { useAuthStore } from '@/src/store/authStore';
import { useChatStore } from '@/src/store/chatStore';
import { homeRouteFor } from '@/src/lib/routing';
import { installWebDialogs } from '@/src/lib/dialog';
import IncomingCallModal from '@/src/components/IncomingCallModal';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

installWebDialogs();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_700Bold,
    SpaceMono_400Regular,
  });

  const { user, isLoading, loadPersistedAuth } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  // On first mount, try to silently restore session from stored refresh token
  useEffect(() => {
    loadPersistedAuth();
  }, []);

  // The realtime connection lives for the whole signed-in session, so messages and
  // incoming calls arrive on any screen; it is dropped when the session ends.
  const canUseRealtime = !!user && user.status !== 'REJECTED' && user.is_profile_complete;
  useEffect(() => {
    if (canUseRealtime) useChatStore.getState().connectSocket();
    else if (!user) useChatStore.getState().disconnectSocket();
  }, [canUseRealtime, !!user]);

  // Fonts are cosmetic: never hold the whole app hostage if one fails to load
  const ready = (fontsLoaded || !!fontError) && !isLoading;

  // Route guard: run whenever auth state or current route changes
  useEffect(() => {
    if (!ready) return; // Wait until auth has been resolved

    const root = segments[0] as string | undefined;
    const inAuthGroup = root === '(auth)';

    if (!user) {
      // Not logged in — send to login
      if (!inAuthGroup) router.replace('/(auth)/login');
      return;
    }

    if (user.status === 'REJECTED') {
      // Banned user — only the appeal screen is available
      if (root !== 'appeal') router.replace('/appeal');
      return;
    }

    if (inAuthGroup || root === 'appeal') {
      // Logged in but on an auth screen (or no longer banned) — send to wherever they belong
      router.replace(homeRouteFor(user));
      return;
    }

    // An unfinished profile may only be on the terms / onboarding screens.
    // (/kyc comes AFTER onboarding and is deliberately not forced: it can be skipped, and
    // the server keeps discovery locked until a video has been submitted.)
    if (!user.is_profile_complete && root !== 'terms' && root !== 'onboarding') {
      router.replace('/terms');
    }
  }, [user, ready, segments]);


  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f6f5' }}>
        <ActivityIndicator size="large" color="#414BEA" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GluestackUIProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="terms" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="kyc" />
          <Stack.Screen name="subscription" />
          <Stack.Screen name="chat/[id]" />
          <Stack.Screen name="call/[id]" />
        </Stack>
        {user && <IncomingCallModal />}
      </GluestackUIProvider>
    </GestureHandlerRootView>
  );
}
