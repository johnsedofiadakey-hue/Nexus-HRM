import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Placeholder config for the user to complete
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "PLACEHOLDER",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "nexus-hrm.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "nexus-hrm",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "nexus-hrm.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "PLACEHOLDER",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "PLACEHOLDER"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;
