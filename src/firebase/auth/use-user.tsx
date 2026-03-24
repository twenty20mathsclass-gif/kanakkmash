
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
      try {
        if (authUser) {
          const userDocRef = doc(firestore, 'users', authUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setUser({ id: userDoc.id, ...userDoc.data() } as User);
          } else if (authUser.email === 'kanakkmash@gmail.com') {
            // Special case for the hardcoded admin user. Create their profile on first login.
            const adminProfile: User = {
              id: authUser.uid,
              name: authUser.displayName || 'Kanakkmash Admin',
              email: authUser.email!,
              role: 'admin',
              avatarUrl: authUser.photoURL || `https://i.ibb.co/688z9X5/user.png`,
            };
            await setDoc(userDocRef, adminProfile);
            setUser(adminProfile);
          } else {
            // User is authenticated but has no profile in Firestore.
            // This could be a new sign-up where profile creation is pending,
            // or an error state. We'll treat them as not having a profile.
            setUser(null);
          }
        } else {
          // User is not authenticated.
          setUser(null);
        }
      } catch (error: any) {
        if (error.code === 'permission-denied' && authUser) {
            const permissionError = new FirestorePermissionError(
                { path: `users/${authUser.uid}`, operation: 'get' },
                { cause: error }
            );
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.error("Error fetching user profile:", error);
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  return { user, loading };
}
