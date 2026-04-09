import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Environment variable validation
const isPlaceholder = (val?: string) => !val || val === 'PLACEHOLDER' || val.includes('REPLACE_ME');

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const hasCredentials = !isPlaceholder(config.apiKey) && !isPlaceholder(config.appId);

if (!hasCredentials && (import.meta as any).env.DEV) {
  console.info('%c[Firebase]%c Synchronization parameters are missing (PLACEHOLDER detected). Persistent drafts and real-time IT telemetry are disabled.', 'color: #ffca28; font-weight: bold', 'color: inherit');
}

// Fallback config to prevent initialization crashes while allowing the app to run
const firebaseConfig = {
  apiKey: config.apiKey || "PLACEHOLDER",
  authDomain: config.authDomain || "nexus-hrm.firebaseapp.com",
  projectId: config.projectId || "nexus-hrm",
  storageBucket: config.storageBucket || "nexus-hrm.firebasestorage.app",
  messagingSenderId: config.messagingSenderId || "PLACEHOLDER",
  appId: config.appId || "PLACEHOLDER"
};

import { getStorage } from 'firebase/storage';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const isFirebaseReady = hasCredentials;

export default app;
