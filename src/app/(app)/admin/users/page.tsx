'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { User } from '@/lib/definitions';
import { UsersTable } from "@/components/admin/users-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddUserDialog } from "@/components/admin/add-user-dialog";
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminUsersPage() {
  const { firestore } = useFirebase();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;
    const fetchUsers = async () => {
      try {
        const usersCollection = collection(firestore, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setUsers(usersList);
      } catch (e) {
        console.error("Failed to fetch users:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [firestore]);

  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold font-headline">User Management</h1>
                <p className="text-muted-foreground">View and manage all user accounts.</p>
            </div>
            <AddUserDialog />
        </div>
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>A list of all users in the system.</CardDescription>
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
    </div>
  );
}
