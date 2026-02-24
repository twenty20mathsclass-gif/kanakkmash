import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  getFirestore,
  enableMultiTabIndexedDbPersistence,
  type Firestore,
} from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | null;
let auth: Auth | null;
let firestore: Firestore | null;
let storage: FirebaseStorage | null;

if (firebaseConfig.apiKey) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  firestore = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);

  if (typeof window !== 'undefined') {
    // Enable multi-tab persistence
    enableMultiTabIndexedDbPersistence(firestore).catch((err) => {
      if (err.code == 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled
        // in one tab at a time.
        console.warn(
          'Firebase persistence failed to initialize. This is normal if you have multiple tabs open.'
        );
      } else if (err.code == 'unimplemented') {
        // The current browser does not support all of the
        // features required to enable persistence
        console.warn('Firebase persistence is not supported in this browser.');
      }
    });

    // Initialize Analytics only on the client side
    try {
      getAnalytics(app);
    } catch (error) {
      console.warn("Couldn't initialize analytics", error);
    }
  }
} else {
  app = null;
  auth = null;
  firestore = null;
  storage = null;
}


export { app, firestore, auth, storage, firebaseConfig };
