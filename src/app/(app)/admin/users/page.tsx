'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { User } from '@/lib/definitions';
import { UsersTable } from "@/components/admin/users-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Reveal } from '@/components/shared/reveal';

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
      let usersQuery;
      let pageTitle = 'User Management';
      let pageDescription = 'View and manage all user accounts.';

      if (roleFilter === 'student') {
        usersQuery = query(collection(firestore, 'users'), where('role', '==', 'student'));
        pageTitle = 'Student Data';
        pageDescription = 'A list of all students in the system.';
      } else if (roleFilter === 'teacher') {
        usersQuery = query(collection(firestore, 'users'), where('role', '==', 'teacher'));
        pageTitle = 'Teacher Data';
        pageDescription = 'A list of all teachers in the system.';
      } else {
        usersQuery = collection(firestore, 'users');
        pageTitle = 'All Users';
        pageDescription = 'A list of all users in the system.';
      }
      
      setTitle(pageTitle);
      setDescription(pageDescription);

      const usersSnapshot = await getDocs(usersQuery);
      const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(usersList);
    } catch (e) {
      console.error("Failed to fetch users:", e);
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
                  <UsersTable users={users} />
                )}
            </CardContent>
          </Card>
        </Reveal>
    </div>
  );
}
