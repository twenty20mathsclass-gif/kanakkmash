
'use client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
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
} from 'lucide-react';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
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
        className="text-primary-foreground shadow-lg"
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-5 w-5 text-primary-foreground/80" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{value}</div>
          <p className="text-xs text-primary-foreground/80">{description}</p>
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
                        <Avatar className="h-12 w-12 border-2 border-background ring-1 ring-primary/50 hover:ring-primary transition-all">
                            <AvatarImage src={contact.avatarUrl} alt={contact.name} />
                            <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {isOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" title="Online"/>
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

        const allStudents = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

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

        // Filter for upcoming schedules
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
            .slice(0, 5);
        setUpcomingSchedules(upcoming);
        
        // Determine contacts
        const studentIds = new Set<string>();
        allSchedules.forEach(schedule => {
            if (schedule.studentId) {
                studentIds.add(schedule.studentId);
            } else {
                allStudents.forEach(student => {
                    if (schedule.courseModel !== student.courseModel) return;
        
                    if (student.courseModel === 'COMPETITIVE EXAM') {
                        if (schedule.competitiveExam === student.competitiveExam) {
                            studentIds.add(student.id);
                        }
                    } else {
                        if (schedule.class === student.class && (student.class === 'DEGREE' || schedule.syllabus === student.syllabus)) {
                            studentIds.add(student.id);
                        }
                    }
                });
            }
        });
        const teacherContacts = allStudents.filter(student => studentIds.has(student.id));
        setContacts(teacherContacts.slice(0, 8));


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
        <StatCard
          title="Platform Students"
          value={loading ? <Loader2 className="h-6 w-6 animate-spin"/> : stats.students}
          description="Total students on platform"
          icon={Users}
          color="hsl(210 80% 65%)"
          delay={0}
        />
        <StatCard
          title="Classes Scheduled"
          value={loading ? <Loader2 className="h-6 w-6 animate-spin"/> : stats.classes}
          description="Total classes you've created"
          icon={CalendarCheck}
          color="hsl(270 80% 65%)"
          delay={0.1}
        />
        <StatCard
          title="Exams Scheduled"
          value={loading ? <Loader2 className="h-6 w-6 animate-spin"/> : stats.exams}
          description="Total exams you've created"
          icon={FilePenLine}
          color="hsl(30 95% 55%)"
          delay={0.2}
        />
        <StatCard
          title="Total Revenue"
          value={loading ? <Loader2 className="h-6 w-6 animate-spin"/> : `₹${stats.revenue.toLocaleString('en-IN')}`}
          description="Total earnings received"
          icon={IndianRupee}
          color="hsl(140 60% 50%)"
          delay={0.3}
        />
      </div>

       <Reveal delay={0.4}>
        <section>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold font-headline">Upcoming Schedules</h2>
                <Button asChild variant="link" className="text-primary">
                    <Link href="/teacher/attendance">View All</Link>
                </Button>
            </div>
        
            {loading ? (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            ) : upcomingSchedules.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                    {upcomingSchedules.map((item, index) => {
                        const IconComponent = iconMap[item.icon] || BookOpen;
                        return (
                            <div key={item.id} className="min-w-[280px] w-[280px] flex-shrink-0">
                                <Link href="/teacher/attendance" className="block h-full">
                                    <Card style={{ backgroundColor: item.color }} className={cn("text-primary-foreground shadow-lg h-full", item.type === 'exam' && 'border-4 border-destructive/50')}>
                                        <CardContent className="p-6 flex flex-col justify-between h-full">
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-background/20 rounded-lg p-2.5 flex items-center justify-center">
                                                        <IconComponent className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs opacity-80">{item.subject}</p>
                                                        <h3 className="font-bold font-headline text-lg leading-tight">{item.title}</h3>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-end mt-6">
                                                <div>
                                                    <p className="text-sm font-medium">{format(item.date.toDate(), 'MMM d, yyyy')}</p>
                                                    <div className="flex items-center gap-1 text-sm opacity-80">
                                                        <Clock className="h-3 w-3" />
                                                        <span>{format(parse(item.startTime, 'HH:mm', new Date()), 'h:mm a')}</span>
                                                    </div>
                                                </div>
                                                <div className="bg-primary-foreground/20 rounded-full p-3">
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
                <Card className="flex items-center justify-center h-40 bg-muted/50 border-2 border-dashed">
                    <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground">No upcoming schedules found.</p>
                        <Button asChild variant="link">
                            <Link href="/teacher/create-schedule">Schedule a Class</Link>
                        </Button>
                    </CardContent>
                </Card>
            )}
        </section>
      </Reveal>
      
      <Reveal delay={0.5}>
        <section>
          <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold font-headline">My Students</h2>
              <Button asChild variant="link" className="text-primary">
                  <Link href="/my-chat-room">View All & Chat</Link>
              </Button>
          </div>
          {loading ? (
              <Card className="flex justify-center items-center h-24">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </Card>
          ) : contacts.length > 0 ? (
              <Card>
                  <CardContent className="p-4">
                      <div className="flex items-center -space-x-2 overflow-hidden">
                          {contacts.map((contact) => (
                              <StudentAvatar key={contact.id} contact={contact} />
                          ))}
                      </div>
                  </CardContent>
              </Card>
          ) : (
              <Card className="flex items-center justify-center h-24 bg-muted/50 border-2 border-dashed">
                  <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground text-sm">Your students will appear here once you schedule classes for them.</p>
                  </CardContent>
              </Card>
          )}
        </section>
      </Reveal>

      <Reveal delay={0.6}>
          <SchedulingChart schedules={schedules} />
      </Reveal>

    </div>
  );
}
