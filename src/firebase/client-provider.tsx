'use client';
import { ReactNode } from 'react';
import { FirebaseProvider } from './provider';
import { app, auth, firestore, storage } from './config';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  return <FirebaseProvider value={{ app, auth, firestore, storage }}>{children}</FirebaseProvider>;
}
