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
  ArrowRight,
  Clock,
  BookOpen,
  User as UserIcon,
  Award,
  CalendarPlus,
} from 'lucide-react';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, getDocs, Timestamp, documentId } from 'firebase/firestore';
import { useEffect, useState, type ReactNode, type ReactElement } from 'react';
import { Reveal } from '@/components/shared/reveal';
import { SchedulingChart } from '@/components/teacher/scheduling-chart';
import type { Schedule, User } from '@/lib/definitions';
import { format, parse } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useOnlineStatus } from '@/hooks/use-online-status';

const iconMap: { [key: string]: React.ElementType } = {
  BookText: BookOpen,
  User: UserIcon,
  Award: Award,
  BookOpen: BookOpen,
};

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
          <div className="text-4xl font-bold">{value}</div>
          <p className="text-xs text-primary-foreground/80 mt-1">{description}</p>
        </CardContent>
      </Card>
    </Reveal>
  );
};

function StudentAvatar({ contact }: { contact: User }) {
    const isOnline = useOnlineStatus(contact.id);
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Link href="/my-chat-room">
                    <div className="relative inline-block cursor-pointer">
                        <Avatar className="h-14 w-14 border-2 border-background ring-1 ring-primary/50 hover:ring-primary transition-all">
                            <AvatarImage src={contact.avatarUrl} alt={contact.name} />
                            <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {isOnline && (
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background" title="Online"/>
                        )}
                    </div>
                </Link>
            </TooltipTrigger>
            <TooltipContent>
                <p>{contact.name}</p>
            </TooltipContent>
        </Tooltip>
    )
}

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
  const [upcomingSchedules, setUpcomingSchedules] = useState<Schedule[]>([]);
  const [contacts, setContacts] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const schedulesQuery = query(
          collection(firestore, 'schedules'),
          where('teacherId', '==', user.id)
        );
        const salaryPaymentsQuery = query(
          collection(firestore, 'users', user.id, 'salaryPayments')
        );

        const [schedulesSnapshot, salaryPaymentsSnapshot] =
          await Promise.all([
            getDocs(schedulesQuery),
            getDocs(salaryPaymentsQuery),
          ]);
        
        let allStudents: User[] = [];
        if (user.assignedClasses && user.assignedClasses.length > 0) {
            const studentPromises = user.assignedClasses.map(assignedItem => {
                const q1 = query(collection(firestore, 'users'), where('role', '==', 'student'), where('class', '==', assignedItem));
                const q2 = query(collection(firestore, 'users'), where('role', '==', 'student'), where('competitiveExam', '==', assignedItem));
                const q3 = query(collection(firestore, 'users'), where('role', '==', 'student'), where('level', '==', assignedItem));
                return Promise.all([getDocs(q1), getDocs(q2), getDocs(q3)]);
            });

            const studentSnapshotsArray = await Promise.all(studentPromises);
            
            const studentMap = new Map<string, User>();
            studentSnapshotsArray.forEach(snapshots => {
                snapshots.forEach(snapshot => {
                     snapshot.forEach(doc => {
                        if (!studentMap.has(doc.id)) {
                            studentMap.set(doc.id, { id: doc.id, ...doc.data() } as User);
                        }
                    });
                });
            });

            allStudents = Array.from(studentMap.values());
        }

        let totalClasses = 0;
        let totalExams = 0;
        const allSchedules = schedulesSnapshot.docs.map(
          (doc) => {
            const schedule = { id: doc.id, ...doc.data() } as Schedule;
            if (schedule.type === 'class') {
              totalClasses++;
            } else if (schedule.type === 'exam') {
              totalExams++;
            }
            return schedule;
          }
        );
        setSchedules(allSchedules);
        
        const totalRevenue = salaryPaymentsSnapshot.docs.reduce(
          (sum, doc) => sum + (doc.data().amount || 0),
          0
        );

        setStats({
          students: allStudents.length,
          classes: totalClasses,
          exams: totalExams,
          revenue: totalRevenue,
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = allSchedules
            .filter(s => s.date.toDate() >= today)
            .sort((a,b) => {
                const dateA = a.date.toMillis();
                const dateB = b.date.toMillis();
                if (dateA !== dateB) return dateA - dateB;
                return a.startTime.localeCompare(b.startTime);
            })
            .slice(0, 10);
        setUpcomingSchedules(upcoming);
        
        setContacts(allStudents);


      } catch (error: any) {
        if (error.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError(
            { path: 'users, schedules, or salaryPayments', operation: 'list' },
            { cause: error }
          );
          errorEmitter.emit('permission-error', permissionError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [firestore, user]);

  return (
    <div className="space-y-10 w-full max-w-none">
      <Reveal>
        <div className="mb-6">
          <h1 className="text-4xl font-bold font-headline tracking-tight">
            Welcome, {user?.name || 'Teacher'}!
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Here's a comprehensive overview of your teaching activities and student performance.
          </p>
        </div>
      </Reveal>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="My Students"
          value={loading ? <Loader2 className="h-8 w-8 animate-spin"/> : stats.students}
          description="Total active students assigned to your classes"
          icon={Users}
          color="hsl(210 80% 65%)"
          delay={0}
        />
        <StatCard
          title="Classes Scheduled"
          value={loading ? <Loader2 className="h-8 w-8 animate-spin"/> : stats.classes}
          description="Total live sessions created on the platform"
          icon={CalendarCheck}
          color="hsl(270 80% 65%)"
          delay={0.1}
        />
        <StatCard
          title="Exams Scheduled"
          value={loading ? <Loader2 className="h-8 w-8 animate-spin"/> : stats.exams}
          description="Total assessments created for your students"
          icon={FilePenLine}
          color="hsl(30 95% 55%)"
          delay={0.2}
        />
        <StatCard
          title="Total Revenue"
          value={loading ? <Loader2 className="h-8 w-8 animate-spin"/> : `₹${stats.revenue.toLocaleString('en-IN')}`}
          description="Accumulated earnings from all sessions"
          icon={IndianRupee}
          color="hsl(140 60% 50%)"
          delay={0.3}
        />
      </div>

       <Reveal delay={0.4}>
        <section>
            <h2 className="text-2xl font-bold font-headline mb-6">Quick Actions</h2>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                <Card style={{ backgroundColor: 'hsl(210 80% 65%)' }} className="text-primary-foreground hover:shadow-xl transition-all border-none">
                    <CardHeader className="flex flex-row items-center gap-6 space-y-0 pb-4">
                        <div className="p-4 rounded-xl bg-background/20">
                            <CalendarPlus className="h-8 w-8" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl">Schedule a Class</CardTitle>
                            <CardDescription className="text-primary-foreground/80 text-base">Set up a new live session for your students.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
                            <Link href="/teacher/create-schedule">Create Class</Link>
                        </Button>
                    </CardContent>
                </Card>
                <Card style={{ backgroundColor: 'hsl(30 95% 55%)' }} className="text-primary-foreground hover:shadow-xl transition-all border-none">
                    <CardHeader className="flex flex-row items-center gap-6 space-y-0 pb-4">
                        <div className="p-4 rounded-xl bg-background/20">
                            <FilePenLine className="h-8 w-8" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl">Create an Exam</CardTitle>
                            <CardDescription className="text-primary-foreground/80 text-base">Assess student knowledge with a custom test.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
                            <Link href="/teacher/create-exam-schedule">Create Exam</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </section>
      </Reveal>

      <Reveal delay={0.5}>
        <section>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold font-headline">Upcoming Schedules</h2>
                <Button asChild variant="ghost" className="text-primary hover:text-primary/80 text-lg">
                    <Link href="/teacher/attendance">View All <ArrowRight className="ml-2 h-5 w-5"/></Link>
                </Button>
            </div>
        
            {loading ? (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
            ) : upcomingSchedules.length > 0 ? (
                <div className="flex gap-6 overflow-x-auto pb-6 -mx-4 px-4 scrollbar-hide">
                    {upcomingSchedules.map((item, index) => {
                        const IconComponent = iconMap[item.icon] || BookOpen;
                        return (
                            <div key={item.id} className="min-w-[320px] w-[320px] flex-shrink-0">
                                <Link href="/teacher/attendance" className="block h-full">
                                    <Card style={{ backgroundColor: item.color }} className={cn("text-primary-foreground shadow-lg h-full border-none hover:scale-[1.02] transition-transform")}>
                                        <CardContent className="p-8 flex flex-col justify-between h-full">
                                            <div>
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-background/20 rounded-xl p-3 flex items-center justify-center">
                                                        <IconComponent className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm opacity-80 font-semibold tracking-wide uppercase">{item.subject}</p>
                                                        <h3 className="font-bold font-headline text-xl leading-tight mt-1">{item.title}</h3>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-end mt-10">
                                                <div>
                                                    <p className="text-base font-bold">{format(item.date.toDate(), 'MMMM d, yyyy')}</p>
                                                    <div className="flex items-center gap-2 text-sm opacity-90 mt-1">
                                                        <Clock className="h-4 w-4" />
                                                        <span>{format(parse(item.startTime, 'HH:mm', new Date()), 'h:mm a')}</span>
                                                    </div>
                                                </div>
                                                <div className="bg-primary-foreground/20 rounded-full p-3 shadow-inner">
                                                    <ArrowRight className="h-6 w-6 text-primary-foreground" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <Card className="flex items-center justify-center h-48 bg-muted/30 border-2 border-dashed">
                    <CardContent className="p-8 text-center">
                        <p className="text-muted-foreground text-lg">No upcoming sessions found.</p>
                        <Button asChild variant="link" className="mt-2 text-primary font-bold">
                            <Link href="/teacher/create-schedule">Schedule your first class now</Link>
                        </Button>
                    </CardContent>
                </Card>
            )}
        </section>
      </Reveal>
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1">
            <Reveal delay={0.6}>
                <section className="h-full">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold font-headline">My Students</h2>
                    <Button asChild variant="link" className="text-primary text-lg">
                        <Link href="/my-chat-room">Connect</Link>
                    </Button>
                </div>
                {loading ? (
                    <Card className="flex justify-center items-center h-32">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </Card>
                ) : contacts.length > 0 ? (
                    <Card className="h-[calc(100%-4rem)] flex items-center justify-center">
                        <CardContent className="p-8 w-full">
                            <div className="flex flex-wrap items-center justify-center gap-4">
                                {contacts.map((contact) => (
                                    <StudentAvatar key={contact.id} contact={contact} />
                                ))}
                                {contacts.length > 12 && (
                                    <Link href="/my-chat-room">
                                        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center text-sm font-bold border-2 border-background hover:bg-muted/80 transition-colors">
                                            +{contacts.length - 12}
                                        </div>
                                    </Link>
                                )}
                            </div>
                            <p className="text-center text-muted-foreground mt-6 text-sm">
                                Click on a student to start a direct message.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="flex items-center justify-center h-32 bg-muted/30 border-2 border-dashed">
                        <CardContent className="p-6 text-center">
                            <p className="text-muted-foreground text-sm">Students will appear here once assigned.</p>
                        </CardContent>
                    </Card>
                )}
                </section>
            </Reveal>
        </div>

        <div className="xl:col-span-2">
            <Reveal delay={0.7}>
                <section className="h-full">
                    <h2 className="text-2xl font-bold font-headline mb-6">Performance Analytics</h2>
                    <SchedulingChart schedules={schedules} />
                </section>
            </Reveal>
        </div>
      </div>
    </div>
  );
}
