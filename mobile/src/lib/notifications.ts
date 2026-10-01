/**
 * notifications.ts
 * 
 * Registers the device for push notifications and sends the FCM token
 * to the backend via POST /users/fcm-token.
 *
 * Currently implemented using expo-notifications (if available).
 * The `registerForPushNotifications` function is safe to call even if
 * expo-notifications is not installed — it will silently skip.
 *
 * To activate:
 *   1. (Done) npx expo install expo-notifications
 *   2. (Done) Add to app.json plugins: ["expo-notifications"]
 *   3. Re-run the dev server
 */

import { Platform } from 'react-native';
import { apiPost } from './api';

import * as Notifications from 'expo-notifications';

/**
 * Requests push notification permission, retrieves the Expo push token
 * (which resolves to an FCM token on Android / APNs token on iOS),
 * and sends it to the backend.
 *
 * Safe to call multiple times — the OS caches the token.
 */
export const registerForPushNotifications = async (): Promise<void> => {
  // Skip on Web to avoid VAPID key errors if not configured
  if (Platform.OS === 'web') {
    return;
  }
  try {
    // Android: set a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#414BEA',
      });
    }

    // Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[FCM] Push notification permission denied.');
      return;
    }

    // The backend pushes through Firebase Admin, which needs the NATIVE device token (an FCM
    // registration token on Android) — not an "ExponentPushToken[...]", which only Expo's
    // own push service understands.
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const deviceToken = typeof tokenData?.data === 'string' ? tokenData.data : null;

    if (!deviceToken) {
      console.log('[FCM] Could not obtain push token.');
      return;
    }

    // Send to backend
    const res = await apiPost('/api/v1/users/fcm-token', { fcm_token: deviceToken });
    const json = await res.json();

    if (json.success) {
      console.log('[FCM] Push token registered successfully');
    } else {
      console.warn('[FCM] Backend rejected FCM token:', json.error);
    }
  } catch (err) {
    // Non-blocking — a failure here should never crash the app
    console.warn('[FCM] Push token not registered:', err);
  }
};
