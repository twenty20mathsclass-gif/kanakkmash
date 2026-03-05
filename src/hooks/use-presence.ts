
'use client';

import { useEffect } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export function usePresence() {
  const { firestore } = useFirebase();
  const { user } = useUser();

  useEffect(() => {
    if (!firestore || !user) {
      return;
    }

    const statusRef = doc(firestore, 'status', user.id);

    const goOnline = () => {
      setDoc(statusRef, { state: 'online', last_changed: serverTimestamp() });
    };

    const goOffline = () => {
      setDoc(statusRef, { state: 'offline', last_changed: serverTimestamp() });
    };

    goOnline();

    // Keep the user's status fresh by updating the timestamp every minute.
    const interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
            setDoc(statusRef, { last_changed: serverTimestamp() }, { merge: true });
        }
    }, 60 * 1000); // every 1 minute

    // Use the visibility API to set status to offline when tab is in background
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            goOnline();
        } else {
            // Don't set to offline immediately, rely on timestamp becoming stale
            // This prevents flickering when user quickly switches tabs
        }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set offline on unmount (e.g., tab close, navigation)
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      goOffline();
    };

  }, [firestore, user]);
}
