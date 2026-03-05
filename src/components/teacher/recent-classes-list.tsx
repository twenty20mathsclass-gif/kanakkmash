
'use client';

import type { Schedule } from '@/lib/definitions';
import { format, parse } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Clock, BookOpen, User, Award, Users as UsersIcon, Loader2 } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useState, useEffect } from 'react';
import { getDocs, query, where, collection } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const iconMap: { [key: string]: React.ElementType } = {
  BookText: BookOpen,
  User: User,
  Award: Award,
  BookOpen: BookOpen,
};

const getFormattedTime = (time: string) => {
    if (!time) return '';
    try {
      const date = parse(time, 'HH:mm', new Date());
      return format(date, 'h:mm a');
    } catch {
      return '';
    }
}

const ScheduleListItem = ({ schedule }: { schedule: Schedule }) => {
    const { firestore } = useFirebase();
    const [attendance, setAttendance] = useState<{count: number, total: number} | null>(null);
    const [loading, setLoading] = useState(true);

    const isPastOrToday = schedule.date.toDate() <= new Date();

    useEffect(() => {
        if (!firestore || !isPastOrToday) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        const fetchAttendance = async () => {
            setLoading(true);
            let total = 0;
            let count = 0;

            try {
                // Get attendees count
                const attendeesQuery = query(collection(firestore, 'schedules', schedule.id, 'attendees'));
                const attendeesSnapshot = await getDocs(attendeesQuery);
                count = attendeesSnapshot.size;

                // Get total students
                let studentsQuery;
                if (schedule.studentId) {
                     total = 1;
                } else {
                    if (schedule.courseModel === 'COMPETITIVE EXAM') {
                        studentsQuery = query(collection(firestore, 'users'), where('role', '==', 'student'), where('courseModel', '==', 'COMPETITIVE EXAM'));
                    } else if (schedule.class === 'DEGREE') {
                        studentsQuery = query(collection(firestore, 'users'), where('role', '==', 'student'), where('class', '==', 'DEGREE'));
                    } else {
                        studentsQuery = query(collection(firestore, 'users'), where('role', '==', 'student'), where('class', '==', schedule.class), where('syllabus', '==', schedule.syllabus));
                    }
                    const studentsSnapshot = await getDocs(studentsQuery);
                    total = studentsSnapshot.size;
                }
                
                if (!cancelled) {
                    setAttendance({ count, total });
                }

            } catch (e: any) {
                if (e.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({ path: `schedules/${schedule.id}/attendees or users`, operation: 'list' }, { cause: e });
                    errorEmitter.emit('permission-error', permissionError);
                } else {
                    console.warn("Error fetching attendance for schedule item", e);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchAttendance();

        return () => {
            cancelled = true;
        }

    }, [firestore, schedule, isPastOrToday]);

    const IconComponent = iconMap[schedule.icon] || BookOpen;

    return (
        <Card className="shadow-sm" style={{borderColor: schedule.color}}>
            <CardContent className="p-4">
                <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-lg flex items-center justify-center" style={{backgroundColor: schedule.color, color: schedule.textColor}}>
                        <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                        <p className="font-bold leading-tight">{schedule.title}</p>
                        <p className="text-xs text-muted-foreground">{schedule.subject}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                            <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{format(schedule.date.toDate(), 'MMM d, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{getFormattedTime(schedule.startTime)}</span>
                            </div>
                        </div>
                        {(schedule.class || schedule.syllabus) && (
                            <div className="flex flex-wrap gap-1 pt-1">
                                {schedule.class && <Badge variant="secondary">{schedule.class}</Badge>}
                                {schedule.syllabus && <Badge variant="secondary">{schedule.syllabus}</Badge>}
                            </div>
                        )}
                        {isPastOrToday && (
                            <div className="text-xs text-muted-foreground pt-2">
                                {loading ? (
                                    <div className="flex items-center gap-1">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span>Loading attendance...</span>
                                    </div>
                                ) : attendance ? (
                                    <div className="flex items-center gap-1 font-medium">
                                        <UsersIcon className="h-3 w-3" />
                                        <span>{attendance.count} / {attendance.total} attended</span>
                                        {attendance.total > 0 && <span className="text-primary">({Math.round(attendance.count / attendance.total * 100)}%)</span>}
                                    </div>
                                ) : (
                                    <p>No attendance data.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export function RecentClassesList({ schedules }: { schedules: Schedule[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Classes</CardTitle>
        <CardDescription>A list of your most recent classes with attendance for past sessions.</CardDescription>
      </CardHeader>
      <CardContent>
        {schedules.length > 0 ? (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {schedules.map((schedule) => (
                  <ScheduleListItem key={schedule.id} schedule={schedule} />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center text-muted-foreground py-16">
            No classes scheduled yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
