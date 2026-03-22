'use client';

import type { Schedule } from '@/lib/definitions';
import { format, parse } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Clock, BookOpen, User, Award, Users as UsersIcon, Loader2 } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useState, useEffect } from 'react';
import { getDocs, query, collection } from 'firebase/firestore';
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

    useEffect(() => {
        if (!firestore) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        const fetchAttendance = async () => {
            setLoading(true);

            try {
                // Get attendees count from the subcollection
                const attendeesQuery = query(collection(firestore, 'schedules', schedule.id, 'attendees'));
                const attendeesSnapshot = await getDocs(attendeesQuery);
                const count = attendeesSnapshot.size;

                // For one-on-one, total is 1. For group, we use -1 to indicate general count.
                const total = schedule.studentId ? 1 : -1;

                if (!cancelled) {
                    setAttendance({ count, total });
                }

            } catch (e: any) {
                if (e.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({ 
                        path: `schedules/${schedule.id}/attendees`, 
                        operation: 'list' 
                    }, { cause: e });
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

    }, [firestore, schedule]);

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
                        <div className="flex flex-wrap gap-1 pt-1">
                            {schedule.classes?.map(c => <Badge key={c} variant="secondary" className="text-[10px] px-1.5 py-0">{c}</Badge>)}
                            {schedule.syllabus && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{schedule.syllabus}</Badge>}
                            {schedule.competitiveExam && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{schedule.competitiveExam}</Badge>}
                        </div>
                        
                        <div className="text-xs text-muted-foreground pt-3 border-t mt-2">
                            {loading ? (
                                <div className="flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span>Updating attendance...</span>
                                </div>
                            ) : attendance ? (
                                <div className="flex items-center gap-1 font-bold text-primary">
                                    <UsersIcon className="h-3 w-3" />
                                    {attendance.total !== -1 ? (
                                        <span>{attendance.count} / {attendance.total} Joined</span>
                                    ) : (
                                         <span>{attendance.count} Student{attendance.count !== 1 ? 's' : ''} Joined</span>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 opacity-50">
                                    <UsersIcon className="h-3 w-3" />
                                    <span>0 Joined</span>
                                </div>
                            )}
                        </div>
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
        <CardDescription>View live session details and student engagement levels.</CardDescription>
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
          <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
            No classes scheduled yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
