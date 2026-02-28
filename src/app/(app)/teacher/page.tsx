'use client';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, CalendarCheck, FilePenLine, Loader2 } from "lucide-react";
import { useFirebase, useUser } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Reveal } from "@/components/shared/reveal";

export default function TeacherDashboardPage() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const [stats, setStats] = useState({
        students: 0,
        classes: 0,
        exams: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore || !user) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // For this example, we count all students. In a real app, you might filter by teacherId if students were assigned to teachers.
                const studentsQuery = query(collection(firestore, 'users'), where('role', '==', 'student'));
                const studentsSnapshot = await getDocs(studentsQuery);
                const totalStudents = studentsSnapshot.size;

                const schedulesQuery = query(collection(firestore, 'schedules'), where('teacherId', '==', user.id));
                const schedulesSnapshot = await getDocs(schedulesQuery);
                
                let totalClasses = 0;
                let totalExams = 0;
                schedulesSnapshot.forEach(doc => {
                    if (doc.data().type === 'class') {
                        totalClasses++;
                    } else if (doc.data().type === 'exam') {
                        totalExams++;
                    }
                });

                setStats({
                    students: totalStudents,
                    classes: totalClasses,
                    exams: totalExams,
                });

            } catch (error) {
                console.error("Error fetching teacher dashboard stats:", error);
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
            <h1 className="text-3xl font-bold font-headline">Teacher Dashboard</h1>
            <p className="text-muted-foreground">An overview of your teaching activities.</p>
        </div>
      </Reveal>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Reveal>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{stats.students}</div>}
                <p className="text-xs text-muted-foreground">
                students on the platform
                </p>
            </CardContent>
            </Card>
        </Reveal>
        <Reveal delay={0.1}>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Classes Scheduled</CardTitle>
                <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{stats.classes}</div>}
                <p className="text-xs text-muted-foreground">
                total classes created
                </p>
            </CardContent>
            </Card>
        </Reveal>
        <Reveal delay={0.2}>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Exams Scheduled</CardTitle>
                <FilePenLine className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{stats.exams}</div>}
                <p className="text-xs text-muted-foreground">
                total exams created
                </p>
            </CardContent>
            </Card>
        </Reveal>
      </div>
    </div>
  );
}
