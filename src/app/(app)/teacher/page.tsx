'use client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import {
  Users,
  CalendarCheck,
  FilePenLine,
  Loader2,
  IndianRupee,
} from 'lucide-react';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Reveal } from '@/components/shared/reveal';
import { SchedulingChart } from '@/components/teacher/scheduling-chart';
import type { Schedule } from '@/lib/definitions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type ScheduleWithAttendance = Schedule & { attendanceCount: number };

export default function TeacherDashboardPage() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [stats, setStats] = useState({
    students: 0,
    classes: 0,
    exams: 0,
    revenue: 0,
  });
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [recentSchedules, setRecentSchedules] =
    useState<ScheduleWithAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Query for students, schedules, and salary in parallel
        const studentsQuery = query(
          collection(firestore, 'users'),
          where('role', '==', 'student')
        );
        const schedulesQuery = query(
          collection(firestore, 'schedules'),
          where('teacherId', '==', user.id)
        );
        const salaryPaymentsQuery = query(
          collection(firestore, 'salaryPayments'),
          where('teacherId', '==', user.id)
        );

        const [studentsSnapshot, schedulesSnapshot, salaryPaymentsSnapshot] =
          await Promise.all([
            getDocs(studentsQuery),
            getDocs(schedulesQuery),
            getDocs(salaryPaymentsQuery),
          ]);

        // Process students
        const totalStudents = studentsSnapshot.size;

        // Process schedules
        let totalClasses = 0;
        let totalExams = 0;
        const allSchedules = schedulesSnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Schedule)
        );
        allSchedules.forEach((schedule) => {
          if (schedule.type === 'class') {
            totalClasses++;
          } else if (schedule.type === 'exam') {
            totalExams++;
          }
        });
        setSchedules(allSchedules);

        // Process salary
        const totalRevenue = salaryPaymentsSnapshot.docs.reduce(
          (sum, doc) => sum + (doc.data().amount || 0),
          0
        );

        // Update stats
        setStats({
          students: totalStudents,
          classes: totalClasses,
          exams: totalExams,
          revenue: totalRevenue,
        });

        // Process recent schedules for table
        const sortedSchedules = [...allSchedules].sort(
          (a, b) => b.date.toMillis() - a.date.toMillis()
        );
        const recentSchedulesList = sortedSchedules.slice(0, 5);
        const schedulesWithAttendance: ScheduleWithAttendance[] =
          await Promise.all(
            recentSchedulesList.map(async (schedule) => {
              let attendanceCount = 0;
              try {
                const attendeesQuery = query(
                  collection(firestore, 'schedules', schedule.id, 'attendees')
                );
                const attendeesSnapshot = await getDocs(attendeesQuery);
                attendanceCount = attendeesSnapshot.size;
              } catch (e: any) {
                if (e.code === 'permission-denied') {
                  const permissionError = new FirestorePermissionError(
                    {
                      path: `schedules/${schedule.id}/attendees`,
                      operation: 'list',
                    },
                    { cause: e }
                  );
                  errorEmitter.emit('permission-error', permissionError);
                } else {
                  console.warn(
                    `Could not fetch attendees for schedule ${schedule.id}`,
                    e
                  );
                }
              }
              return {
                ...schedule,
                attendanceCount,
              };
            })
          );
        setRecentSchedules(schedulesWithAttendance);
      } catch (error: any) {
        if (error.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError(
            { path: 'users, schedules, or salaryPayments', operation: 'list' },
            { cause: error }
          );
          errorEmitter.emit('permission-error', permissionError);
        } else {
          console.warn('Error fetching teacher dashboard stats:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [firestore, user]);

  return (
    <div className="space-y-8">
      <Reveal>
        <div>
          <h1 className="text-3xl font-bold font-headline">
            Welcome, {user?.name || 'Teacher'}!
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your teaching activities.
          </p>
        </div>
      </Reveal>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Reveal>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Students
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <div className="text-2xl font-bold">{stats.students}</div>
              )}
              <p className="text-xs text-muted-foreground">
                students on the platform
              </p>
            </CardContent>
          </Card>
        </Reveal>
        <Reveal delay={0.1}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Classes Scheduled
              </CardTitle>
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <div className="text-2xl font-bold">{stats.classes}</div>
              )}
              <p className="text-xs text-muted-foreground">
                total classes created
              </p>
            </CardContent>
          </Card>
        </Reveal>
        <Reveal delay={0.2}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Exams Scheduled
              </CardTitle>
              <FilePenLine className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <div className="text-2xl font-bold">{stats.exams}</div>
              )}
              <p className="text-xs text-muted-foreground">
                total exams created
              </p>
            </CardContent>
          </Card>
        </Reveal>
        <Reveal delay={0.3}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <div className="text-2xl font-bold">₹{stats.revenue.toLocaleString('en-IN')}</div>
              )}
              <p className="text-xs text-muted-foreground">
                total earnings received
              </p>
            </CardContent>
          </Card>
        </Reveal>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <Reveal delay={0.3}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Your 5 most recent schedules.
                  </CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/teacher/attendance">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="animate-spin" />
                </div>
              ) : recentSchedules.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class/Exam</TableHead>
                      <TableHead className="text-center">Attendees</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSchedules.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="font-medium">{s.title}</div>
                          <div className="text-xs capitalize text-muted-foreground">
                            {s.type} &bull;{' '}
                            {format(s.date.toDate(), 'MMM d, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {s.attendanceCount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-8 text-center text-muted-foreground">
                  No schedules found.
                </p>
              )}
            </CardContent>
          </Card>
        </Reveal>
        <Reveal delay={0.4}>
          <SchedulingChart schedules={schedules} />
        </Reveal>
      </div>
    </div>
  );
}
