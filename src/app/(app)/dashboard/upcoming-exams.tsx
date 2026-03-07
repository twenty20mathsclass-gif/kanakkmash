
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, Timestamp, onSnapshot, orderBy, getDoc, doc } from 'firebase/firestore';
import { format, parse } from 'date-fns';
import type { Schedule, User } from '@/lib/definitions';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, Clock, Loader2, User as UserIcon, Award, FileText } from "lucide-react";
import { Reveal } from "@/components/shared/reveal";
import { Badge } from '@/components/ui/badge';

const iconMap: { [key: string]: React.ElementType } = {
  BookText: BookOpen,
  User: UserIcon,
  Award: Award,
  BookOpen: BookOpen,
  FileText: FileText,
};

type ScheduleWithTeacher = Schedule & { teacherName?: string };

export function UpcomingExams() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [upcomingExams, setUpcomingExams] = useState<ScheduleWithTeacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !user) {
      setLoading(false);
      setUpcomingExams([]);
      return;
    }

    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const schedulesQuery = query(
      collection(firestore, 'schedules'),
      where('date', '>=', Timestamp.fromDate(today)),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(schedulesQuery, async (snapshot) => {
      const allUpcomingSchedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule));

      const filteredSchedules = allUpcomingSchedules.filter(schedule => {
        // Only show exams
        if (schedule.type !== 'exam') {
            return false;
        }

        // Personal schedule check
        if (schedule.studentId === user.id) {
          return true;
        }

        // Group schedule check
        if (!schedule.studentId && schedule.courseModel === user.courseModel) {
            if (user.courseModel === 'COMPETITIVE EXAM') {
                return schedule.competitiveExam === user.competitiveExam;
            }

            if (schedule.class === user.class) {
                // For non-DEGREE classes, syllabus must also match
                if (user.class !== 'DEGREE') {
                    return schedule.syllabus === user.syllabus;
                }
                // For DEGREE classes, just matching class is enough
                return true;
            }
        }
        
        return false;
      });

      if (filteredSchedules.length === 0) {
        setUpcomingExams([]);
        setLoading(false);
        return;
      }

      const teacherIds = [...new Set(filteredSchedules.map(s => s.teacherId))];
      const teacherDocs = await Promise.all(
        teacherIds.map(id => getDoc(doc(firestore, 'users', id)))
      );
      
      const teachersMap = new Map<string, string>();
      teacherDocs.forEach(docSnap => {
        if (docSnap.exists()) {
          teachersMap.set(docSnap.id, docSnap.data().name);
        }
      });
      
      const schedulesWithTeacherNames: ScheduleWithTeacher[] = filteredSchedules.map(schedule => ({
        ...schedule,
        teacherName: teachersMap.get(schedule.teacherId) || 'Unknown'
      }));

      schedulesWithTeacherNames.sort((a, b) => {
        const dateA = a.date.toMillis();
        const dateB = b.date.toMillis();
        if (dateA !== dateB) return dateA - dateB;
        return a.startTime.localeCompare(b.startTime);
      });
      setUpcomingExams(schedulesWithTeacherNames.slice(0, 3));
      setLoading(false);
    },
    (serverError: any) => {
      if (serverError.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: 'schedules',
          operation: 'list',
        }, { cause: serverError });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        console.warn("Firestore error fetching upcoming exams:", serverError);
      }
      setLoading(false);
      setUpcomingExams([]);
    });

    return () => unsubscribe();
  }, [firestore, user]);

  return (
    <section>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold font-headline">Upcoming Exams</h2>
            <Link href="/courses" className="text-sm font-medium text-primary hover:underline">
                View Schedule
            </Link>
        </div>
      
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : upcomingExams.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                {upcomingExams.map((item, index) => {
                    const IconComponent = iconMap[item.icon] || FileText;
                    return (
                        <Reveal key={item.id} delay={0.2 + index * 0.1} className="min-w-[280px] w-[280px] flex-shrink-0">
                            <Link href={item.meetLink} className="block h-full">
                                <Card style={{ backgroundColor: item.color }} className="text-primary-foreground shadow-lg h-full">
                                    <CardContent className="p-6 flex flex-col justify-between h-full">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-background/20 rounded-lg p-2.5 flex items-center justify-center">
                                                    <IconComponent className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-xs opacity-80">{item.subject}</p>
                                                    <h3 className="font-bold font-headline text-lg leading-tight">{item.title}</h3>
                                                    <p className="text-xs opacity-80 font-medium">by {item.teacherName}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {item.class && <Badge variant="secondary" className="bg-primary-foreground/20 border-none text-xs font-normal text-primary-foreground">{item.class}</Badge>}
                                                {item.syllabus && <Badge variant="secondary" className="bg-primary-foreground/20 border-none text-xs font-normal text-primary-foreground">{item.syllabus}</Badge>}
                                                {item.competitiveExam && <Badge variant="secondary" className="bg-primary-foreground/20 border-none text-xs font-normal text-primary-foreground">{item.competitiveExam}</Badge>}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-end mt-4">
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
                        </Reveal>
                    )
                })}
            </div>
        ) : (
            <Reveal>
                <Card className="flex items-center justify-center h-40 bg-muted/50">
                    <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground">No upcoming exams scheduled.</p>
                        <Button asChild variant="link">
                            <Link href="/courses">View Full Schedule</Link>
                        </Button>
                    </CardContent>
                </Card>
            </Reveal>
        )}
    </section>
  );
}
