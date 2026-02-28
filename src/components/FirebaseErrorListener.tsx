'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import type { FirestorePermissionError } from '@/firebase/errors';

export function FirebaseErrorListener() {
  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      if (process.env.NODE_ENV === 'development') {
        // In development, throw the error so Next.js can display its overlay.
        // This provides a rich debugging experience for security rules.
        console.error("Firestore Permission Error:", error);
        throw error;
      } else {
        // In production, you might log to an external service.
        // For now, we'll just log it to the console.
        console.error('A Firestore permission error occurred:', error.message);
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  return null; // This component does not render anything.
}
