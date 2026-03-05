import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

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
} else {
  app = null;
  auth = null;
  firestore = null;
  storage = null;
}


export { app, firestore, auth, storage, firebaseConfig };
