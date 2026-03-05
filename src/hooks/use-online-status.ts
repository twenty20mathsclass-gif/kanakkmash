
'use client';
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { Timestamp } from 'firebase/firestore';

interface UserStatus {
  state: 'online' | 'offline';
  last_changed: Timestamp;
}

// A user is considered online if their status is 'online' and was updated in the last 2 minutes.
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

export function useOnlineStatus(userId: string | null): boolean {
  const { firestore } = useFirebase();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!firestore || !userId) {
      setIsOnline(false);
      return;
    }

    const statusRef = doc(firestore, 'status', userId);
    const unsubscribe = onSnapshot(statusRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as UserStatus;
        if (data.state === 'online' && data.last_changed) {
            const lastChanged = data.last_changed.toDate().getTime();
            const now = new Date().getTime();
            
            if ((now - lastChanged) < ONLINE_THRESHOLD_MS) {
                setIsOnline(true);
            } else {
                setIsOnline(false);
            }
        } else {
            setIsOnline(false);
        }
      } else {
        setIsOnline(false);
      }
    });

    return () => unsubscribe();
  }, [firestore, userId]);

  return isOnline;
}
