'use client';
import { ReactNode } from 'react';
import { FirebaseProvider } from './provider';
import { app, auth, firestore, storage } from './config';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  return (
    <FirebaseProvider value={{ app, auth, firestore, storage }}>
      <FirebaseErrorListener />
      {children}
    </FirebaseProvider>
  );
}
