'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format, addDays, startOfWeek, isToday, isSameDay } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Clock, MoreHorizontal, BookText, AppWindow, FlaskConical, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/shared/reveal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';


const today = new Date();
const todayDayOfWeek = today.getDay(); // 0 for Sunday, 1 for Monday, etc.

const weeklyScheduleData = [
  {
    id: 1,
    courseId: 'geometry-fundamentals',
    subject: 'Geometry',
    title: 'Geometry Fundamentals',
    time: '08:00am',
    startTime: '8:00',
    endTime: '8:45',
    icon: BookText,
    color: 'hsl(30 95% 55%)',
    textColor: 'hsl(var(--primary-foreground))',
    dayOfWeek: todayDayOfWeek, 
  },
  {
    id: 2,
    courseId: 'advanced-math-framework',
    subject: 'Maths',
    title: 'Advanced Math Framework',
    time: '09:00am',
    startTime: '9:00',
    endTime: '9:45',
    icon: AppWindow,
    color: 'hsl(270 80% 65%)',
    textColor: 'hsl(var(--primary-foreground))',
    dayOfWeek: todayDayOfWeek,
  },
  {
    id: 3,
    courseId: 'calculus-essentials',
    subject: 'Calculus',
    title: 'Calculus Essentials',
    time: '11:00am',
    startTime: '11:00',
    endTime: '11:45',
    icon: FlaskConical,
    color: 'hsl(340 80% 65%)',
    textColor: 'hsl(var(--primary-foreground))',
    dayOfWeek: todayDayOfWeek,
  },
   {
    id: 4,
    courseId: 'geometry-fundamentals',
    subject: 'Geometry',
    title: 'Extra Geometry Session',
    time: '08:00am',
    startTime: '8:00',
    endTime: '8:45',
    icon: BookText,
    color: 'hsl(30 95% 55%)',
    textColor: 'hsl(var(--primary-foreground))',
    dayOfWeek: (todayDayOfWeek + 2) % 7, // An event two days from today
  },
];

const timeSlots = ['08:00am', '09:00am', '10:00am', '11:00am', '12:00pm'];

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const startOfSelectedWeek = startOfWeek(selectedDate, { weekStartsOn: 0 }); // Sunday
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfSelectedWeek, i));
  
  const learningProgress = 88;
  const learningTotal = 180;
  
  const selectedDayOfWeek = selectedDate.getDay();
  const eventsForSelectedDay = weeklyScheduleData.filter(e => e.dayOfWeek === selectedDayOfWeek);

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
                <p className="text-lg font-bold">{learningProgress}min / {learningTotal}min</p>
              </div>
            </div>
            <Progress value={(learningProgress/learningTotal) * 100} className="mt-2 h-1.5 [&>*]:bg-primary-foreground" />
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
        {timeSlots.map((time) => {
          const event = eventsForSelectedDay.find(e => e.time === time);
          return (
            <div key={time} className="flex gap-4 items-stretch min-h-[4rem]">
              <div className="text-xs font-medium text-muted-foreground w-16 text-right pt-1">{time}</div>
              <div className="relative flex-1 border-l-2 border-dashed border-border pl-6 py-2">
                
                {event ? (
                  <Link href={`/courses/${event.courseId}`} className="block">
                    <Card style={{backgroundColor: event.color}} className="shadow-lg">
                        <CardContent className="p-3" style={{color: event.textColor}}>
                            <div className="flex gap-3 items-center">
                                <div className="bg-background/20 rounded-lg p-2.5 flex items-center justify-center">
                                    <event.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs opacity-80">{event.subject}</p>
                                    <p className="font-bold text-sm leading-tight">{event.title}</p>
                                    <div className="flex items-center gap-1 text-xs opacity-80 mt-1">
                                        <Clock className="h-3 w-3" />
                                        <span>{event.startTime}-{event.endTime}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                  </Link>
                ) : (
                   <div className="h-full w-full" />
                )}
              </div>
            </div>
          )
        })}
         {eventsForSelectedDay.length === 0 && (
            <div className="text-center text-muted-foreground text-sm pt-8">
                You have no lectures scheduled for this day.
            </div>
        )}
      </Reveal>
    </div>
  );
}
