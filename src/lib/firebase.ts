import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDummyKeyForLocalTestingOnly',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'kinnect-mvp.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'kinnect-mvp',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'kinnect-mvp.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789012:web:abcdef123456',
};

// Initialize or reuse default Firebase App instance
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

// Connect to local emulators when VITE_USE_EMULATOR is enabled or in test environment
const useEmulator = import.meta.env.VITE_USE_EMULATOR === 'true' || typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

if (useEmulator) {
  const authEmulatorUrl = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL || 'http://127.0.0.1:9099';
  const firestoreHost = import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST || '127.0.0.1';
  const firestorePort = Number(import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT || 8085);

  try {
    connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });
  } catch {
    // Emulator already connected in fast refresh
  }

  try {
    connectFirestoreEmulator(db, firestoreHost, firestorePort);
  } catch {
    // Emulator already connected in fast refresh
  }
}
