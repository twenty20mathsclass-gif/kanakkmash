'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { courses } from "@/lib/data";
import { Users, BookOpen, Loader2 } from "lucide-react";

export default function AdminDashboardPage() {
  const { firestore } = useFirebase();
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const totalCourses = courses.length;

  useEffect(() => {
    if (!firestore) return;
    const fetchUsers = async () => {
      try {
        const usersCollection = collection(firestore, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        setTotalUsers(usersSnapshot.size);
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
      <div>
        <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and management.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{totalUsers}</div>}
            <p className="text-xs text-muted-foreground">
              students and administrators
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCourses}</div>
            <p className="text-xs text-muted-foreground">
              math courses available
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
