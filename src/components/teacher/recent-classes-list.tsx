'use client';

import type { Schedule } from '@/lib/definitions';
import { format, parse, isToday, isFuture, isPast, addMinutes } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Clock, BookOpen, User, Award, Users as UsersIcon, Loader2, Video, ExternalLink } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useState, useEffect, useMemo } from 'react';
import { getDocs, query, collection } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';

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

/** Determines the session status based on date + start/end times */
function getSessionStatus(schedule: Schedule): 'upcoming' | 'live' | 'ended' {
    if (!schedule.date) return 'ended';
    try {
        const classDate = schedule.date.toDate();
        const now = new Date();

        // Build full datetime for start and end
        const [startH = '0', startM = '0'] = (schedule.startTime || '00:00').split(':');
        const [endH = '0', endM = '0'] = (schedule.endTime || '23:59').split(':');

        const startDt = new Date(classDate);
        startDt.setHours(parseInt(startH), parseInt(startM), 0, 0);

        const endDt = new Date(classDate);
        endDt.setHours(parseInt(endH), parseInt(endM), 0, 0);

        // Allow "live" window: 15 min before start → end time
        const liveWindowStart = addMinutes(startDt, -15);

        if (now >= liveWindowStart && now <= endDt) return 'live';
        if (now > endDt) return 'ended';
        return 'upcoming';
    } catch {
        return 'ended';
    }
}

const ScheduleListItem = ({ schedule }: { schedule: Schedule }) => {
    const { firestore } = useFirebase();
    const [attendance, setAttendance] = useState<{count: number, total: number} | null>(null);
    const [loading, setLoading] = useState(true);

    const status = useMemo(() => getSessionStatus(schedule), [schedule]);

    useEffect(() => {
        if (!firestore) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        const fetchAttendance = async () => {
            setLoading(true);
            try {
                const attendeesQuery = query(collection(firestore, 'schedules', schedule.id, 'attendees'));
                const attendeesSnapshot = await getDocs(attendeesQuery);
                const count = attendeesSnapshot.size;
                const total = schedule.studentId ? 1 : -1;
                if (!cancelled) setAttendance({ count, total });
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
                if (!cancelled) setLoading(false);
            }
        };

        fetchAttendance();
        return () => { cancelled = true; };
    }, [firestore, schedule]);

    const IconComponent = iconMap[schedule.icon] || BookOpen;

    const handleStartMeeting = () => {
        if (schedule.meetLink) {
            window.open(schedule.meetLink, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <Card
            className={cn(
                'shadow-sm transition-all duration-200',
                status === 'live' && 'ring-2 ring-green-500/60 shadow-green-100 dark:shadow-green-950/20'
            )}
            style={{ borderColor: schedule.color }}
        >
            <CardContent className="p-4">
                <div className="flex items-start gap-4">
                    <div className="relative">
                        <div className="p-2.5 rounded-lg flex items-center justify-center" style={{ backgroundColor: schedule.color, color: schedule.textColor }}>
                            <IconComponent className="h-5 w-5" />
                        </div>
                        {status === 'live' && (
                            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background animate-pulse" />
                        )}
                    </div>

                    <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <p className="font-bold leading-tight truncate">{schedule.title}</p>
                            {status === 'live' && (
                                <Badge className="shrink-0 bg-green-500 hover:bg-green-600 text-white text-[10px] px-1.5 py-0 animate-pulse">
                                    LIVE
                                </Badge>
                            )}
                            {status === 'upcoming' && (
                                <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
                                    Upcoming
                                </Badge>
                            )}
                            {status === 'ended' && (
                                <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 opacity-60">
                                    Ended
                                </Badge>
                            )}
                        </div>

                        <p className="text-xs text-muted-foreground">{schedule.subject}</p>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                            <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{schedule.date ? format(schedule.date.toDate(), 'MMM d, yyyy') : '—'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{getFormattedTime(schedule.startTime)}{schedule.endTime ? ` – ${getFormattedTime(schedule.endTime)}` : ''}</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-1 pt-1">
                            {schedule.classes?.map(c => <Badge key={c} variant="secondary" className="text-[10px] px-1.5 py-0">{c}</Badge>)}
                            {schedule.syllabus && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{schedule.syllabus}</Badge>}
                            {schedule.competitiveExam && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{schedule.competitiveExam}</Badge>}
                        </div>

                        {/* Start Meeting Button */}
                        {schedule.meetLink && (
                            <Button
                                size="sm"
                                variant={status === 'live' ? 'default' : status === 'upcoming' ? 'outline' : 'ghost'}
                                className={cn(
                                    'w-full mt-2 h-8 text-xs gap-1.5',
                                    status === 'live' && 'bg-green-600 hover:bg-green-700 text-white border-none',
                                    status === 'ended' && 'opacity-60',
                                )}
                                onClick={handleStartMeeting}
                            >
                                {status === 'live' ? (
                                    <><Video className="h-3.5 w-3.5" /> Start Meeting</>
                                ) : status === 'upcoming' ? (
                                    <><Video className="h-3.5 w-3.5" /> Open Meeting Room</>
                                ) : (
                                    <><ExternalLink className="h-3.5 w-3.5" /> View Recording</>
                                )}
                            </Button>
                        )}

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
                                    <span>0 Students Joined</span>
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
        <CardDescription>Start your meeting or view session details and student attendance.</CardDescription>
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