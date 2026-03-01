'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFirebase } from '@/firebase';
import type { Firestore } from 'firebase/firestore';
import { collection, doc, getDoc, getDocs, query, orderBy } from 'firebase/firestore';

import type { Schedule, User, Exam, ExamSubmission } from '@/lib/definitions';
import { format } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Calendar, Clock, Users, FileText, CheckCircle, Percent } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type Attendee = { id: string; studentName: string; studentAvatar: string; attendedAt: { toDate: () => Date } };
type SubmissionWithStudentInfo = ExamSubmission & { student?: User; examTotalQuestions?: number };

const ScheduleDetails = ({ schedule, firestore, users }: { schedule: Schedule; firestore: Firestore; users: User[] }) => {
  const [details, setDetails] = useState<{ attendees?: Attendee[]; submissions?: SubmissionWithStudentInfo[] }>({});
  const [loading, setLoading] = useState(true);

  const teacher = useMemo(() => users.find((u) => u.id === schedule.teacherId), [users, schedule.teacherId]);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      if (schedule.type === 'class') {
        const attendeesQuery = query(collection(firestore, 'schedules', schedule.id, 'attendees'));
        const attendeesSnapshot = await getDocs(attendeesQuery);
        const attendeesList = attendeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendee));
        setDetails({ attendees: attendeesList });
      } else if (schedule.type === 'exam' && schedule.examId) {
        const examRef = doc(firestore, 'exams', schedule.examId);
        const submissionsQuery = query(collection(firestore, 'exams', schedule.examId, 'submissions'));

        const [examSnap, submissionsSnap] = await Promise.all([getDoc(examRef), getDocs(submissionsQuery)]);

        const examData = examSnap.exists() ? (examSnap.data() as Exam) : null;
        const totalQuestions = examData?.questions.length || 0;

        const submissionsList = submissionsSnap.docs.map(doc => {
          const submission = { id: doc.id, ...doc.data() } as ExamSubmission;
          const student = users.find(u => u.id === submission.studentId);
          return { ...submission, student, examTotalQuestions: totalQuestions };
        });
        setDetails({ submissions: submissionsList });
      }
      setLoading(false);
    };

    fetchDetails();
  }, [schedule, firestore, users]);

  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle className="font-headline text-xl">{schedule.title}</CardTitle>
        <CardDescription>
          {schedule.type.charAt(0).toUpperCase() + schedule.type.slice(1)} scheduled on {format(schedule.date.toDate(), 'PPP')} by {teacher?.name || 'Unknown Teacher'}
        </CardDescription>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground pt-2">
            <div className="flex items-center gap-1.5"><Clock className="h-4 w-4"/><span>{schedule.startTime} - {schedule.endTime}</span></div>
            {schedule.class && <Badge variant="secondary">{schedule.class}</Badge>}
            {schedule.syllabus && <Badge variant="secondary">{schedule.syllabus}</Badge>}
            {schedule.courseModel && <Badge variant="secondary">{schedule.courseModel}</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <Separator className="mb-4" />
        {loading ? (
            <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <>
            {schedule.type === 'class' && (
              <div>
                <h3 className="font-bold mb-2">Attendees ({details.attendees?.length || 0})</h3>
                {details.attendees && details.attendees.length > 0 ? (
                  <ScrollArea className="h-96">
                    <Table>
                        <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Joined At</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {details.attendees.map(attendee => (
                                <TableRow key={attendee.id}>
                                    <TableCell className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8"><AvatarImage src={attendee.studentAvatar} /><AvatarFallback>{attendee.studentName.charAt(0)}</AvatarFallback></Avatar>
                                        {attendee.studentName}
                                    </TableCell>
                                    <TableCell>{format(attendee.attendedAt.toDate(), 'p')}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                  </ScrollArea>
                ) : <p className="text-muted-foreground text-sm text-center py-8">No attendance records for this class.</p>}
              </div>
            )}
            {schedule.type === 'exam' && (
              <div>
                <h3 className="font-bold mb-2">Submissions ({details.submissions?.length || 0})</h3>
                {details.submissions && details.submissions.length > 0 ? (
                  <ScrollArea className="h-96">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Course Info</TableHead>
                                <TableHead className="text-right">Score</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {details.submissions.map(sub => {
                                const percentage = sub.examTotalQuestions && sub.examTotalQuestions > 0
                                    ? Math.round((sub.score / sub.examTotalQuestions) * 100)
                                    : 0;
                                return (
                                <TableRow key={sub.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8"><AvatarImage src={sub.student?.avatarUrl} /><AvatarFallback>{sub.student?.name.charAt(0)}</AvatarFallback></Avatar>
                                            <div className="font-medium">{sub.student?.name || 'Unknown Student'}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs text-muted-foreground">{sub.student?.courseModel}</div>
                                        <div className="text-xs text-muted-foreground">{sub.student?.class}</div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="font-bold">{sub.score} / {sub.examTotalQuestions}</div>
                                        <div className="text-sm text-primary">{percentage}%</div>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                  </ScrollArea>
                ) : <p className="text-muted-foreground text-sm text-center py-8">No submissions for this exam.</p>}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};


export default function AdminSchedulesHistoryPage() {
    const { firestore } = useFirebase();
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

    useEffect(() => {
        if (!firestore) return;
        
        const fetchData = async () => {
            try {
                const schedulesQuery = query(collection(firestore, 'schedules'), orderBy('date', 'desc'));
                const usersQuery = query(collection(firestore, 'users'));
                
                const [schedulesSnapshot, usersSnapshot] = await Promise.all([
                    getDocs(schedulesQuery),
                    getDocs(usersQuery),
                ]);

                const schedulesList = schedulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule));
                const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                
                setSchedules(schedulesList);
                setUsers(usersList);
            } catch (error) {
                console.error("Error fetching schedules history:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [firestore]);
    
    const schedulesWithTeachers = useMemo(() => {
        return schedules.map(schedule => {
            const teacher = users.find(u => u.id === schedule.teacherId);
            return {
                ...schedule,
                teacherName: teacher?.name || 'Unknown',
            };
        });
    }, [schedules, users]);

    if(loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Schedules History</h1>
                <p className="text-muted-foreground">Review history of all classes and exams created.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 items-start">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>All Scheduled Items</CardTitle>
                        <CardDescription>Select an item to view its details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[70vh]">
                            <div className="space-y-2 pr-4">
                                {schedulesWithTeachers.map(schedule => (
                                    <button
                                        key={schedule.id}
                                        className={cn(
                                            'w-full text-left p-3 rounded-lg border transition-colors',
                                            selectedSchedule?.id === schedule.id ? 'bg-accent border-primary ring-1 ring-primary' : 'hover:bg-accent/50'
                                        )}
                                        onClick={() => setSelectedSchedule(schedule)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold truncate">{schedule.title}</p>
                                            <Badge variant={schedule.type === 'exam' ? 'destructive' : 'default'} className="capitalize shrink-0">{schedule.type}</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{format(schedule.date.toDate(), 'MMM d, yyyy')}</p>
                                        <p className="text-xs text-muted-foreground">By {schedule.teacherName}</p>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
                <div className="md:col-span-2">
                    { selectedSchedule && firestore ? (
                        <ScheduleDetails schedule={selectedSchedule} firestore={firestore} users={users} />
                    ) : (
                        <Card className="flex items-center justify-center h-96 border-2 border-dashed">
                             <p className="text-muted-foreground">Select a schedule to see details</p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
