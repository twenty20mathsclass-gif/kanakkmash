
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays, startOfWeek, isToday, isSameDay, startOfDay, endOfDay, parse } from 'date-fns';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, Timestamp, onSnapshot, getDoc, doc } from 'firebase/firestore';
import type { Schedule, User as UserType } from '@/lib/definitions';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, MoreHorizontal, BookText, AppWindow, FlaskConical, CalendarDays, Loader2, BarChart, User, Award, BookOpen } from 'lucide-react';
import { Reveal } from '@/components/shared/reveal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';

const iconMap: { [key: string]: React.ElementType } = {
  BookText,
  AppWindow,
  FlaskConical,
  BarChart,
  User,
  Award,
  BookOpen
};

type ScheduleWithTeacher = Schedule & { teacherName?: string };

export default function ExamSchedulePage() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleWithTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Schedule | null>(null);

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

    const unsubscribe = onSnapshot(schedulesQuery, async (snapshot) => {
      const allSchedulesForDay = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule));

      const filteredSchedules = allSchedulesForDay.filter(schedule => {
        if (schedule.type !== 'exam') {
            return false;
        }

        // Personal schedule check
        if (schedule.studentId === user.id) {
          return true;
        }

        if (!schedule.studentId && schedule.courseModel === user.courseModel) {
            if (user.courseModel === 'COMPETITIVE EXAM') {
                return schedule.competitiveExam === user.competitiveExam;
            }

            if (schedule.class === user.class) {
                if (user.class !== 'DEGREE') {
                    return schedule.syllabus === user.syllabus;
                }
                return true;
            }
        }
        
        return false;
      });

      if (filteredSchedules.length === 0) {
        setSchedules([]);
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


      schedulesWithTeacherNames.sort((a, b) => a.startTime.localeCompare(b.startTime));
      setSchedules(schedulesWithTeacherNames);
      setLoading(false);
    }, (serverError: any) => {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: 'schedules',
                operation: 'list',
            }, { cause: serverError });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.warn("Firestore error fetching exam schedule:", serverError);
        }
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
  
  const handleStartExam = () => {
    if (!selectedEvent || !selectedEvent.examId) return;
    router.push(`/exams/take/${selectedEvent.examId}`);
    setSelectedEvent(null);
  };

  return (
    <div className="space-y-6 md:max-w-lg md:mx-auto pb-24">
      <Reveal>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold font-headline">Exam Schedule</h1>
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

      <Reveal delay={0.3}>
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-headline">My Exam Schedule for {format(selectedDate, 'MMMM d')}</h2>
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
            return (
              <div key={event.id} className="flex gap-4 items-stretch min-h-[4rem]">
                <div className="text-xs font-medium text-muted-foreground w-16 text-right pt-1">{event.createdAt ? format(event.createdAt.toDate(), 'hh:mmaaa') : getFormattedTime(event.startTime)}</div>
                <div className="relative flex-1 border-l-2 border-dashed border-border pl-6 py-2">
                  <div
                    onClick={() => setSelectedEvent(event)}
                    className='block cursor-pointer'
                  >
                      <Card
                        style={{backgroundColor: event.color}}
                        className='shadow-lg transition-shadow hover:shadow-xl'
                      >
                          <CardContent className="p-3" style={{color: event.textColor}}>
                              <div className="flex gap-3 items-center">
                                  <div className="bg-background/20 rounded-lg p-2.5 flex items-center justify-center">
                                      <IconComponent className="h-5 w-5" />
                                  </div>
                                  <div>
                                      <p className="text-xs opacity-80">{event.subject}</p>
                                      <p className="font-bold text-sm leading-tight">{event.title}</p>
                                      <p className="text-xs opacity-80 font-medium">by {event.teacherName}</p>
                                      <div className="flex items-center gap-1 text-xs opacity-80 mt-1">
                                          <Clock className="h-3 w-3" />
                                          <span>{format(parse(event.startTime, 'HH:mm', new Date()), 'h:mm a')} - {format(parse(event.endTime, 'HH:mm', new Date()), 'h:mm a')}</span>
                                      </div>
                                      <div className="flex flex-wrap gap-1 pt-2">
                                          {event.class && <Badge variant="secondary" className="bg-background/20 border-none text-xs font-normal" style={{color: 'inherit'}}>{event.class}</Badge>}
                                          {event.syllabus && <Badge variant="secondary" className="bg-background/20 border-none text-xs font-normal" style={{color: 'inherit'}}>{event.syllabus}</Badge>}
                                          {event.competitiveExam && <Badge variant="secondary" className="bg-background/20 border-none text-xs font-normal" style={{color: 'inherit'}}>{event.competitiveExam}</Badge>}
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
                You have no exams scheduled for this day.
            </div>
        )}
      </Reveal>

      <AlertDialog open={!!selectedEvent} onOpenChange={(isOpen) => !isOpen && setSelectedEvent(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{selectedEvent?.title}</AlertDialogTitle>
                <AlertDialogDescription>
                    You are about to start the exam. Make sure you are ready. The timer will begin as soon as you start.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 text-sm">
                <p><strong>Subject:</strong> {selectedEvent?.subject}</p>
                <p><strong>Duration:</strong> {selectedEvent?.duration} minutes</p>
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button onClick={handleStartExam}>
                    Start Exam
                </Button>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
