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

// ── Native SDK (React Native Firebase) ────────────────────────────────────────
import nativeAuth from '@react-native-firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let auth: any;

if (Platform.OS === 'web') {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  
  if (process.env.EXPO_PUBLIC_USE_EMULATOR === 'true') {
    // On Web, always use localhost to avoid CORS/Iframe security issues with IP addresses
    const emulatorUrl = process.env.EXPO_PUBLIC_EMULATOR_URL as string;
      
    connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
  }
} else {
  // On Native, we use the namespaced-like but safer getter from RN Firebase
  // Using nativeAuth() is the standard way for v12+
  auth = nativeAuth;
  
  if (process.env.EXPO_PUBLIC_USE_EMULATOR === 'true') {
    const emulatorUrl = process.env.EXPO_PUBLIC_EMULATOR_URL as string;
    try {
      auth().useEmulator(emulatorUrl);
    } catch (e) {
      // Already connected
    }
  }
}

export { 
  auth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithCredential 
};
