import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';

const SECONDARY_APP_NAME = 'kinnect-secondary-app';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDummyKeyForLocalTestingOnly',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'kinnect-mvp.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'kinnect-mvp',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'kinnect-mvp.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789012:web:abcdef123456',
};

/**
 * Returns a secondary Auth instance to register caretakers or patient logins
 * without terminating or replacing the family member's active session.
 */
export function getSecondaryAuth(): Auth {
  const existingApp = getApps().find((a) => a.name === SECONDARY_APP_NAME);
  const secondaryApp = existingApp || initializeApp(firebaseConfig, SECONDARY_APP_NAME);
  const secondaryAuth = getAuth(secondaryApp);

  const useEmulator = import.meta.env.VITE_USE_EMULATOR === 'true' || typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
  if (useEmulator) {
    const authEmulatorUrl = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL || 'http://127.0.0.1:9099';
    try {
      connectAuthEmulator(secondaryAuth, authEmulatorUrl, { disableWarnings: true });
    } catch {
      // Ignored if already connected
    }
  }

  return secondaryAuth;
}
