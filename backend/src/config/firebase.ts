import * as admin from 'firebase-admin';

// 1. Verify all three required environment variables are present
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (process.env.NODE_ENV === 'development') {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  console.log('⚠️ [Firebase Admin] Running in EMULATOR mode ⚠️');
}
if (!projectId || !clientEmail || !privateKey) {
  console.error('[Firebase Admin] Missing required Firebase environment variables. Check your .env file.');
} else {
  try {
    // 2. Initialize Firebase Admin if it hasn't been initialized yet
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId,
          clientEmail: clientEmail,
          // CRITICAL: .env files escape newlines. We must convert literal '\n' characters back into actual line breaks.
          privateKey: privateKey.replace(/\\n/g, '\n'),
        })
      });
      console.log('[Firebase Admin] Successfully initialized using individual .env variables.');
    }
  } catch (error) {
    console.error('[Firebase Admin] Initialization failed:', error);
  }
}

export default admin;