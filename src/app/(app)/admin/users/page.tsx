
'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { User, TeacherPrivateDetails } from '@/lib/definitions';
import { UsersTable } from "@/components/admin/users-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Reveal } from '@/components/shared/reveal';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const AddUserDialog = nextDynamic(
    () => import('@/components/admin/add-user-dialog').then(mod => mod.AddUserDialog), 
    { 
        ssr: false,
        loading: () => (
            <Button disabled>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add User
            </Button>
        )
    }
);

export default function AdminUsersPage() {
  const { firestore } = useFirebase();
  const searchParams = useSearchParams();
  const roleFilter = searchParams.get('role');
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('User Management');
  const [description, setDescription] = useState('View and manage all user accounts.');

  const fetchUsers = useCallback(async () => {
    if (!firestore) return;
    setLoading(true);
    try {
      let usersList: User[] = [];

      if (roleFilter) {
        const usersQuery = query(collection(firestore, 'users'), where('role', '==', roleFilter));
        const usersSnapshot = await getDocs(usersQuery);
        usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        const pageTitle = `${roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)} Data`;
        const pageDescription = `A list of all ${roleFilter}s in the system.`;
        setTitle(pageTitle);
        setDescription(pageDescription);
      } else {
        const studentQuery = query(collection(firestore, 'users'), where('role', '==', 'student'));
        const teacherQuery = query(collection(firestore, 'users'), where('role', '==', 'teacher'));
        const adminQuery = query(collection(firestore, 'users'), where('role', '==', 'admin'));
        const [studentsSnap, teachersSnap, adminsSnap] = await Promise.all([
            getDocs(studentQuery),
            getDocs(teacherQuery),
            getDocs(adminQuery),
        ]);
        usersList = [
            ...studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)),
            ...teachersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)),
            ...adminsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)),
        ];
        setTitle('All Users');
        setDescription('A list of all users in the system.');
      }
      
      // If we are fetching teachers or all users, we also need to get their private details
      if (roleFilter === 'teacher' || !roleFilter) {
          const usersWithDetails = await Promise.all(usersList.map(async (user) => {
              if (user.role === 'teacher') {
                  const detailsRef = doc(firestore, 'users', user.id, 'teacher_details', 'payment');
                  const detailsSnap = await getDoc(detailsRef);
                  if (detailsSnap.exists()) {
                      return { ...user, ...(detailsSnap.data() as TeacherPrivateDetails) };
                  }
              }
              return user;
          }));
          setUsers(usersWithDetails);
      } else {
          setUsers(usersList);
      }

    } catch (e: any) {
      if (e.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: 'users or users/{userId}/teacher_details/payment',
          operation: 'list',
        }, { cause: e });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        console.warn("Failed to fetch users:", e);
      }
    } finally {
      setLoading(false);
    }
  }, [firestore, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="space-y-8">
        <Reveal>
          <div className="flex items-center justify-between">
              <div>
                  <h1 className="text-3xl font-bold font-headline">{title}</h1>
                  <p className="text-muted-foreground">{description}</p>
              </div>
              <AddUserDialog creatorRole="admin" onUserAdded={fetchUsers} />
          </div>
        </Reveal>
        <Reveal delay={0.2}>
          <Card>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <UsersTable users={users} onUserChanged={fetchUsers} />
                )}
            </CardContent>
          </Card>
        </Reveal>
    </div>
  );
}
