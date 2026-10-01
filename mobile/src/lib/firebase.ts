import { Platform } from 'react-native';

// ── Web SDK (Modular v9+) ────────────────────────────────────────────────────
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential
} from 'firebase/auth';
import { EMULATOR_URL, USE_EMULATOR } from './config';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// ── Native SDK (React Native Firebase) ────────────────────────────────────────
// Loaded lazily and defensively: the native module only exists in a custom dev build.
// Importing it at the top level crashed the whole app on launch in Expo Go, even though
// emulator sign-in (plain REST) never needs it.
let nativeAuthModule: any | null | undefined;

/** `@react-native-firebase/auth`, or null when the native module isn't in this build. */
export const getNativeAuth = (): any | null => {
  if (Platform.OS === 'web') return null;
  if (nativeAuthModule === undefined) {
    try {
      const mod = require('@react-native-firebase/auth');
      const nativeAuth = mod.default ?? mod;
      nativeAuth(); // throws if the native side is missing
      if (USE_EMULATOR) {
        try {
          nativeAuth().useEmulator(EMULATOR_URL);
        } catch {
          // Already connected
        }
      }
      nativeAuthModule = nativeAuth;
    } catch {
      nativeAuthModule = null;
    }
  }
  return nativeAuthModule;
};

let auth: any = null;

if (Platform.OS === 'web') {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);

  if (USE_EMULATOR) {
    try {
      connectAuthEmulator(auth, EMULATOR_URL, { disableWarnings: true });
    } catch {
      // Already connected (fast refresh)
    }
  }
}

export {
  auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential
};
