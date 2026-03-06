
'use client';

import { useEffect } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function usePresence() {
  const { firestore } = useFirebase();
  const { user } = useUser();

  useEffect(() => {
    if (!firestore || !user) {
      return;
    }

    const statusRef = doc(firestore, 'status', user.id);

    const goOnline = () => {
      const onlineData = { state: 'online' as 'online', last_changed: serverTimestamp() };
      setDoc(statusRef, onlineData)
        .catch(async (serverError) => {
            if(serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: statusRef.path,
                    operation: 'write',
                    requestResourceData: onlineData,
                });
                errorEmitter.emit('permission-error', permissionError);
            }
        });
    };

    const goOffline = () => {
      const offlineData = { state: 'offline' as 'offline', last_changed: serverTimestamp() };
      setDoc(statusRef, offlineData)
      .catch(async (serverError) => {
        if(serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: statusRef.path,
                operation: 'write',
                requestResourceData: offlineData,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
    });
    };

    goOnline();

    // Keep the user's status fresh by updating the timestamp every minute.
    const interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
            const updateData = { last_changed: serverTimestamp() };
            setDoc(statusRef, updateData, { merge: true })
            .catch(async (serverError) => {
                if(serverError.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({
                        path: statusRef.path,
                        operation: 'update',
                        requestResourceData: updateData,
                    });
                    errorEmitter.emit('permission-error', permissionError);
                }
            });
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
