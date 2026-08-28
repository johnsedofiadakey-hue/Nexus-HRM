import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Environment variable validation
const isPlaceholder = (val?: string) => !val || val === 'PLACEHOLDER' || val.includes('REPLACE_ME');

// Firebase client config is not a secret — it only identifies the project; access
// control is enforced by Firebase Auth + Security Rules, not by hiding these values
// (this is Firebase's own documented guidance). There's no CI wiring for the frontend
// deploy (see PRODUCTION_MAINTENANCE_GUIDE.md), so relying solely on VITE_FIREBASE_*
// env vars meant every manual `npm run build` shipped without them — Firestore/Storage
// (drafts, real-time telemetry) silently never worked in production. These are the
// real values for the `nexus-hrm` Firebase project, used as defaults; VITE_FIREBASE_*
// env vars still take precedence if set (e.g. to point at a different project).
const FALLBACK_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDoeVLWzF7YtEwiwC-mTomEwg9XpyJRHa0',
  authDomain: 'nexus-hrm.firebaseapp.com',
  projectId: 'nexus-hrm',
  storageBucket: 'nexus-hrm.firebasestorage.app',
  messagingSenderId: '705398470201',
  appId: '1:705398470201:web:562acf0a4bb87145ecffe8'
};

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || FALLBACK_FIREBASE_CONFIG.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || FALLBACK_FIREBASE_CONFIG.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || FALLBACK_FIREBASE_CONFIG.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || FALLBACK_FIREBASE_CONFIG.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || FALLBACK_FIREBASE_CONFIG.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || FALLBACK_FIREBASE_CONFIG.appId
};

const hasCredentials = !isPlaceholder(config.apiKey) && !isPlaceholder(config.appId);

if (!hasCredentials) {
  const missing = [];
  if (isPlaceholder(config.apiKey)) missing.push('API_KEY');
  if (isPlaceholder(config.appId)) missing.push('APP_ID');
  if (isPlaceholder(config.projectId)) missing.push('PROJECT_ID');

  if ((import.meta as any).env.DEV) {
    console.warn(`%c[Firebase]%c Warning: Critical synchronization parameters are missing or set to PLACEHOLDER: ${missing.join(', ')}. Persistent drafts and real-time IT telemetry will be unavailable.`, 'color: #ff9800; font-weight: bold', 'color: inherit');
  } else {
    // Production diagnostic check
    console.error(`[Firebase] Critical synchronization parameters missing: ${missing.join(', ')}`);
  }
}

const firebaseConfig = config;

import { getStorage } from 'firebase/storage';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const isFirebaseReady = hasCredentials;

// Diagnostic: Force a fresh connection if we were stuck in offline mode
if (hasCredentials && (import.meta as any).env.DEV) {
    console.log('[Firebase] Initializing Sync Protocol for Project:', firebaseConfig.projectId);
}

export default app;
