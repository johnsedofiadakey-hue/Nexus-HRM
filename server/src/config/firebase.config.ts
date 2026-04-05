import * as admin from 'firebase-admin';

let isInitialized = false;

const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

const config = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: privateKey,
};

if (!admin.apps.length) {
  if (!config.projectId || !config.clientEmail || !config.privateKey) {
    console.warn('[Firebase] Warning: Firebase environment variables are missing. Cloud storage will be disabled.');
  } else {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(config as any),
        storageBucket: `${config.projectId}.firebasestorage.app`,
      });
      isInitialized = true;
      console.log('[Firebase] Admin SDK Initialized Successfully');
    } catch (error) {
      console.error('[Firebase] Admin SDK Initialization Failed:', error);
    }
  }
} else {
  isInitialized = true;
}

export const getBucket = () => {
  if (!isInitialized) {
    console.error('[Firebase] Attempted to access bucket without initialization.');
    return null;
  }
  return admin.storage().bucket();
};

export default admin;
