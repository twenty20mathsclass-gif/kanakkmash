
'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import type { User } from '@/lib/definitions';
import { FirestorePermissionError } from '../errors';
import { errorEmitter } from '../error-emitter';

export function useUser() {
  const { auth, firestore } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !firestore) {
      // Firebase services might not be available immediately, or not at all.
      // To prevent sticking on the loader, we set loading to false.
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      let retryCount = 0;
      const maxRetries = 3;
      const retryDelay = 1000; // 1 second

      const fetchProfile = async (uid: string): Promise<boolean> => {
        try {
          const userDocRef = doc(firestore, 'users', uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setUser({ id: userDoc.id, ...userDoc.data() } as User);
            return true;
          }
          return false;
        } catch (error: any) {
          if (error.code === 'permission-denied') {
             // If we get permission-denied while authUser exists, it usually means 
             // the auth object is ready but some underlying Firebase state is still settling
             // OR the doc doesn't exist and rules are strict.
             return false;
          }
          throw error;
        }
      };

      try {
        if (authUser) {
          let found = await fetchProfile(authUser.uid);
          
          while (!found && retryCount < maxRetries) {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            found = await fetchProfile(authUser.uid);
          }

          if (!found) {
            if (authUser.email === 'kanakkmash@gmail.com') {
                const adminProfile: User = {
                    id: authUser.uid,
                    name: authUser.displayName || 'Kanakkmash Admin',
                    email: authUser.email!,
                    role: 'admin',
                    avatarUrl: authUser.photoURL || '',
                };
                await setDoc(doc(firestore, 'users', authUser.uid), adminProfile);
                setUser(adminProfile);
            } else {
                setUser(null);
            }
          }
        } else {
          setUser(null);
        }
      } catch (error: any) {
        console.error("Error fetching user profile:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  return { user, loading };
}
