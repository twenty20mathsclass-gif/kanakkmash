'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import type { User as AuthUser } from 'firebase/auth';
import type { User } from '@/lib/definitions';

export function useUser() {
  const { auth, firestore } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(true);
      setAuthUser(user);
    });
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    async function fetchUserProfile() {
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
            email: authUser.email,
            role: 'admin',
            avatarUrl: authUser.photoURL || `https://picsum.photos/seed/${authUser.uid}/100/100`,
          };
          await setDoc(userDocRef, adminProfile);
          setUser(adminProfile);
        } else {
          // User is authenticated but has no profile in Firestore.
          // This could be a new sign-up, profile creation is handled in sign-up form.
          // Or an error state. For now, we treat them as logged out from the app's perspective.
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    }
    if(firestore) {
      fetchUserProfile();
    }
  }, [authUser, firestore]);

  return { user, authUser, loading };
}
