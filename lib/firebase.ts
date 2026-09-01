import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, updateProfile, sendPasswordResetEmail, applyActionCode, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);
let firestoreDb: any = null;
export const getDb = async () => {
  if (firestoreDb) return firestoreDb;
  const { initializeFirestore } = await import('firebase/firestore');
  firestoreDb = initializeFirestore(app, {
    experimentalForceLongPolling: true
  });
  return firestoreDb;
};
let appStorage: any = null;
export const getAppStorage = async () => {
  if (appStorage) return appStorage;
  const { getStorage } = await import('firebase/storage');
  appStorage = getStorage(app);
  return appStorage;
};
export const auth = getAuth(app);

// Initialize Messaging only on the client and if supported
export const getMessagingInstance = async () => {
  if (typeof window === 'undefined') return null;
  try {
    const { getMessaging, isSupported } = await import('firebase/messaging');
    const supported = await isSupported();
    if (supported) {
      return getMessaging(app);
    }
    return null;
  } catch (err) {
    console.error('Firebase Messaging not supported:', err);
    return null;
  }
};
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});


// Note: testConnection removed — it was designed for AI Studio runtime, not local dev.

export { signInWithPopup, signInWithRedirect, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, updateProfile, sendPasswordResetEmail, applyActionCode, verifyPasswordResetCode, confirmPasswordReset };
