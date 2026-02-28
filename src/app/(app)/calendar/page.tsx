'use client';

import { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, isToday, isSameDay, startOfDay, endOfDay, parse } from 'date-fns';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, Timestamp, onSnapshot } from 'firebase/firestore';
import type { Schedule } from '@/lib/definitions';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Clock, MoreHorizontal, BookText, AppWindow, FlaskConical, CalendarDays, Loader2, BarChart, User, Award, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/shared/reveal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

const iconMap: { [key: string]: React.ElementType } = {
  BookText,
  AppWindow,
  FlaskConical,
  BarChart,
  User,
  Award,
  BookOpen
};

export default function SchedulePage() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Schedule | null>(null);
  const [attendedClasses, setAttendedClasses] = useState<string[]>([]);

  useEffect(() => {
    if (!firestore || !user) {
      setSchedules([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);
    
    const schedulesQuery = query(
      collection(firestore, 'schedules'),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end))
    );

    const unsubscribe = onSnapshot(schedulesQuery, (snapshot) => {
      const allSchedulesForDay = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule));

      const filteredSchedules = allSchedulesForDay.filter(schedule => {
        // Personal schedule check
        if (schedule.studentId === user.id) {
          return true;
        }

        // Group schedule check
        if (!schedule.studentId && schedule.courseModel === user.courseModel) {
            if (user.courseModel === 'COMPETITIVE EXAM') {
                return true;
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

      filteredSchedules.sort((a, b) => b.startTime.localeCompare(a.startTime));
      setSchedules(filteredSchedules);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching schedules: ", error);
      setSchedules([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedDate, firestore, user]);

  const startOfSelectedWeek = startOfWeek(selectedDate, { weekStartsOn: 0 }); // Sunday
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfSelectedWeek, i));
  
  const getFormattedTime = (time: string) => {
    if (!time) return '';
    try {
      const date = parse(time, 'HH:mm', new Date());
      return format(date, 'hh:mmaaa');
    } catch {
      return '';
    }
  }

  const getDurationInMinutes = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    try {
        const start = parse(startTime, 'HH:mm', new Date());
        const end = parse(endTime, 'HH:mm', new Date());
        const diff = end.getTime() - start.getTime();
        return Math.round(diff / (1000 * 60));
    } catch (e) {
        console.error("Error calculating duration", e);
        return 0;
    }
  };

  const totalLearningMinutes = schedules.reduce((acc, event) => acc + getDurationInMinutes(event.startTime, event.endTime), 0);

  const attendedLearningMinutes = schedules
      .filter(event => attendedClasses.includes(event.id))
      .reduce((acc, event) => acc + getDurationInMinutes(event.startTime, event.endTime), 0);
  
  const handleJoinMeet = () => {
    if (!selectedEvent) return;

    // Mark attendance if not already marked
    if (!attendedClasses.includes(selectedEvent.id)) {
        setAttendedClasses([...attendedClasses, selectedEvent.id]);
        toast({
            title: 'Attendance Marked!',
            description: `You've marked your attendance for "${selectedEvent.title}".`,
        });
    }

    // Open meet link in a new tab
    if (selectedEvent.meetLink) {
        window.open(selectedEvent.meetLink, '_blank', 'noopener,noreferrer');
    }
    
    setSelectedEvent(null); // Close dialog
  };

  return (
    <div className="space-y-6 md:max-w-lg md:mx-auto pb-24">
      <Reveal>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold font-headline">Schedule</h1>
           <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <CalendarDays className="h-6 w-6" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                            if (date) setSelectedDate(date);
                            setIsCalendarOpen(false);
                        }}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="overflow-x-auto scrollbar-hide">
            <div className="flex w-max space-x-1 p-1 bg-muted rounded-full mx-auto">
                {weekDays.map((day) => (
                    <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                        'flex flex-col items-center justify-center w-12 h-16 rounded-full transition-colors relative shrink-0',
                        isSameDay(day, selectedDate)
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent/50'
                    )}
                    >
                    <span className="text-sm">{format(day, 'E')}</span>
                    <span className="font-bold text-lg">{format(day, 'd')}</span>
                    {isToday(day) && !isSameDay(day, selectedDate) && (
                        <div className="absolute bottom-1.5 h-1 w-1 rounded-full bg-primary"></div>
                    )}
                    </button>
                ))}
            </div>
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <Card className="bg-[hsl(270,80%,65%)] text-primary-foreground shadow-lg">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm">Today's Learning</p>
                <p className="text-lg font-bold">{attendedLearningMinutes}min / {totalLearningMinutes}min</p>
              </div>
            </div>
            <Progress value={totalLearningMinutes > 0 ? (attendedLearningMinutes/totalLearningMinutes) * 100 : 0} className="mt-2 h-1.5 [&>*]:bg-primary-foreground" />
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.3}>
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-headline">My Schedule for {format(selectedDate, 'MMMM d')}</h2>
            <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
            </Button>
        </div>
      </Reveal>

      <Reveal delay={0.4} className="space-y-1 relative">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : schedules.length > 0 ? (
          schedules.map((event) => {
            const IconComponent = iconMap[event.icon] || BookOpen;
            const isAttended = attendedClasses.includes(event.id);
            return (
              <div key={event.id} className="flex gap-4 items-stretch min-h-[4rem]">
                <div className="text-xs font-medium text-muted-foreground w-16 text-right pt-1">{getFormattedTime(event.startTime)}</div>
                <div className="relative flex-1 border-l-2 border-dashed border-border pl-6 py-2">
                  <div
                    onClick={() => !isAttended && setSelectedEvent(event)}
                    className={cn(
                      'block',
                      isAttended ? 'cursor-not-allowed' : 'cursor-pointer'
                    )}
                  >
                      <Card
                        style={{backgroundColor: event.color}}
                        className={cn(
                            'shadow-lg transition-shadow',
                            !isAttended && 'hover:shadow-xl',
                            isAttended && 'opacity-75'
                        )}
                      >
                          <CardContent className="p-3" style={{color: event.textColor}}>
                              <div className="flex gap-3 items-center">
                                  <div className="bg-background/20 rounded-lg p-2.5 flex items-center justify-center">
                                      <IconComponent className="h-5 w-5" />
                                  </div>
                                  <div>
                                      <p className="text-xs opacity-80">{event.subject}</p>
                                      <p className="font-bold text-sm leading-tight">{event.title}</p>
                                      <div className="flex items-center gap-1 text-xs opacity-80 mt-1">
                                          <Clock className="h-3 w-3" />
                                          <span>{format(parse(event.startTime, 'HH:mm', new Date()), 'h:mm a')} - {format(parse(event.endTime, 'HH:mm', new Date()), 'h:mm a')}</span>
                                      </div>
                                  </div>
                              </div>
                          </CardContent>
                      </Card>
                    </div>
                </div>
              </div>
            )
          })
        ) : (
            <div className="text-center text-muted-foreground text-sm pt-8">
                You have no lectures scheduled for this day.
            </div>
        )}
      </Reveal>

      <AlertDialog open={!!selectedEvent} onOpenChange={(isOpen) => !isOpen && setSelectedEvent(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{selectedEvent?.title}</AlertDialogTitle>
                <AlertDialogDescription>
                    Click 'Join Meet' to enter the class and automatically mark your attendance.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 text-sm">
                <p><strong>Subject:</strong> {selectedEvent?.subject}</p>
                <p><strong>Time:</strong> {selectedEvent ? `${getFormattedTime(selectedEvent.startTime)} - ${getFormattedTime(selectedEvent.endTime)}` : ''}</p>
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel>Close</AlertDialogCancel>
                <Button onClick={handleJoinMeet}>
                    Join Meet
                </Button>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
