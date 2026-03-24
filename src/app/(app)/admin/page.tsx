
'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { User, Schedule } from '@/lib/definitions';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { courses } from "@/lib/data";
import { Users, BookOpen, Loader2 } from "lucide-react";
import { Reveal } from '@/components/shared/reveal';
import { StudentEnrollmentChart } from '@/components/admin/student-enrollment-chart';
import { format } from 'date-fns';
import { SchedulingActivityChart } from '@/components/admin/scheduling-activity-chart';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type ScheduleWithAttendance = Schedule & { attendanceCount: number, teacherName?: string };

const StatCard = ({
  title,
  value,
  icon,
  description,
  color,
  delay,
}: {
  title: string;
  value: string | number | React.ReactNode;
  icon: React.ElementType;
  description: string;
  color: string;
  delay: number;
}) => {
  const Icon = icon;
  return (
    <Reveal delay={delay}>
      <Card
        style={{ backgroundColor: color }}
        className="text-primary-foreground shadow-lg border-none"
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-5 w-5 text-primary-foreground/80" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl md:text-4xl font-bold">{value}</div>
          <p className="text-[10px] md:text-xs text-primary-foreground/80 mt-1">{description}</p>
        </CardContent>
      </Card>
    </Reveal>
  );
};

export default function AdminDashboardPage() {
  const { firestore } = useFirebase();
  const [stats, setStats] = useState({ students: 0, teachers: 0, courses: 0 });
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
  const [recentSchedules, setRecentSchedules] = useState<ScheduleWithAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!firestore) return;

    const fetchData = async () => {
      try {
        // 1. Fetch all users and calculate stats
        const usersCollection = collection(firestore, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        
        const students = usersList.filter(u => u.role === 'student');
        const teachers = usersList.filter(u => u.role === 'teacher');
        
        setAllUsers(usersList);
        setStats({ students: students.length, teachers: teachers.length, courses: courses.length });
        
        // 2. Fetch all schedules
        const schedulesQuery = query(collection(firestore, 'schedules'), orderBy('date', 'desc'));
        const schedulesSnapshot = await getDocs(schedulesQuery);
        const allSchedulesList = schedulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule));
        setAllSchedules(allSchedulesList);

        // 3. Process 5 most recent schedules for the table
        const recentSchedulesList = allSchedulesList.slice(0, 5);
        const schedulesWithAttendance: ScheduleWithAttendance[] = await Promise.all(
          recentSchedulesList.map(async (schedule) => {
            const attendeesQuery = collection(firestore, 'schedules', schedule.id, 'attendees');
            const attendeesSnapshot = await getDocs(attendeesQuery);
            const teacher = teachers.find(t => t.id === schedule.teacherId);
            return {
              ...schedule,
              attendanceCount: attendeesSnapshot.size,
              teacherName: teacher?.name || 'Unknown',
            };
          })
        );
        setRecentSchedules(schedulesWithAttendance);

      } catch (e: any) {
        if (e.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError(
            { path: 'users or schedules', operation: 'list' },
            { cause: e }
          );
          errorEmitter.emit('permission-error', permissionError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [firestore]);

  return (
    <div className="space-y-10 w-full max-w-none overflow-x-hidden px-1">
      <Reveal>
        <div>
          <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>
          <p className="text-muted-foreground">Platform overview and management.</p>
        </div>
      </Reveal>

      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Total Students"
          value={loading ? <Loader2 className="h-8 w-8 animate-spin"/> : stats.students}
          description="Total active students enrolled on the platform"
          icon={Users}
          color="hsl(210 80% 65%)"
          delay={0.1}
        />
        <StatCard
          title="Total Teachers"
          value={loading ? <Loader2 className="h-8 w-8 animate-spin"/> : stats.teachers}
          description="Total active instructors and subject experts"
          icon={Users}
          color="hsl(270 80% 65%)"
          delay={0.2}
        />
        <StatCard
          title="Total Courses"
          value={loading ? <Loader2 className="h-8 w-8 animate-spin"/> : stats.courses}
          description="Curated courses and competitive materials"
          icon={BookOpen}
          color="hsl(30 95% 55%)"
          delay={0.3}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Reveal delay={0.3}>
            <StudentEnrollmentChart users={allUsers} role="student" />
        </Reveal>
        <Reveal delay={0.4}>
            <StudentEnrollmentChart users={allUsers} role="teacher" />
        </Reveal>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <Reveal delay={0.5}>
                <SchedulingActivityChart schedules={allSchedules} />
            </Reveal>
        </div>
        <div className="lg:col-span-1">
            <Reveal delay={0.6}>
                 <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Recent Schedules</CardTitle>
                                <CardDescription>The 5 most recent schedules.</CardDescription>
                            </div>
                            <Button asChild variant="outline" size="sm">
                                <Link href="/admin/schedules">
                                    View All
                                </Link>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                         {loading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin"/></div> :
                          recentSchedules.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Class/Exam</TableHead>
                                        <TableHead>Teacher</TableHead>
                                        <TableHead>Attendees</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentSchedules.map(s => (
                                        <TableRow key={s.id}>
                                            <TableCell>
                                                <div className="font-medium">{s.title}</div>
                                                <div className="text-xs text-muted-foreground">{format(s.date.toDate(), 'MMM d, yyyy')}</div>
                                            </TableCell>
                                            <TableCell>{s.teacherName}</TableCell>
                                            <TableCell className="text-center">{s.attendanceCount}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                          ) : (
                             <p className="text-center text-muted-foreground py-8">No schedules found.</p>
                          )
                         }
                    </CardContent>
                </Card>
            </Reveal>
        </div>
      </div>
    </div>
  );
}
