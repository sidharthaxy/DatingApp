import { Stack } from 'expo-router';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import '@/global.css';
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

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GluestackUIProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
      </Stack>
    </GluestackUIProvider>
  );
}
