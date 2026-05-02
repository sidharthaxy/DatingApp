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
import auth from '@react-native-firebase/auth';
import { useAuthStore } from '@/src/store/authStore';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// ─── Connect to Firebase Auth Emulator in local dev ───────────────────────────
// Uses the same LAN IP as the backend, port 9099.
if (process.env.EXPO_PUBLIC_USE_EMULATOR === 'true') {
  const emulatorUrl = process.env.EXPO_PUBLIC_EMULATOR_URL || 'http://localhost:9099';
  try {
    auth().useEmulator(emulatorUrl);
    console.log(`[Firebase Auth] Connected to emulator at ${emulatorUrl}`);
  } catch (e) {
    // Already connected on hot reload — safe to ignore
  }
}


export default function RootLayout() {
  const [fontsLoaded] = useFonts({
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

  // Route guard: run whenever auth state or current route changes
  useEffect(() => {
    if (isLoading) return; // Wait until auth has been resolved

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const inAppealScreen = segments[0] === 'appeal';

    if (!user && !inAuthGroup) {
      // Not logged in — send to login
      router.replace('/(auth)/login');
    } else if (user && user.status === 'REJECTED' && !inAppealScreen && !inAuthGroup) {
      // Banned user — redirect to appeal screen
      router.replace('/appeal' as any);
    } else if (user && inAuthGroup) {
      // Logged in but on auth screen — send to app
      if (user.is_profile_complete && user.status === 'APPROVED') {
        router.replace('/(tabs)/discovery');
      } else {
        router.replace('/onboarding');
      }
    }
  }, [user, isLoading, segments]);


  if (!fontsLoaded || isLoading) {
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
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="kyc" />
          <Stack.Screen name="subscription" />
          <Stack.Screen name="chat/[id]" />
        </Stack>
      </GluestackUIProvider>
    </GestureHandlerRootView>
  );
}
