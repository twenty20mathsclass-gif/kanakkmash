'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import type { User } from '@/lib/definitions';

export function useUser() {
  const { auth, firestore } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !firestore) {
      // Firebase services might not be available immediately.
      // This effect will re-run when they are.
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      try {
        if (authUser) {
          const userDocRef = doc(firestore, 'users', authUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setUser({ id: userDoc.id, ...userDoc.data() } as User);
          } else if (authUser.email === 'mathsadmin@gmail.com') {
            // Special case for the hardcoded admin user. Create their profile on first login.
            const adminProfile: User = {
              id: authUser.uid,
              name: authUser.displayName || 'Admin User',
              email: authUser.email!,
              role: 'admin',
              avatarUrl: authUser.photoURL || `https://picsum.photos/seed/${authUser.uid}/100/100`,
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
      } catch (error) {
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
