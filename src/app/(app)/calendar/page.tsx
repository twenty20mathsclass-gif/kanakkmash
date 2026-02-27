'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format, addDays, startOfWeek, isToday, isSameDay } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Clock, MoreHorizontal, BookText, AppWindow, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/shared/reveal';

const scheduleData = [
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
    textColor: 'hsl(var(--primary-foreground))'
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
    textColor: 'hsl(var(--primary-foreground))'
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
    textColor: 'hsl(var(--primary-foreground))'
  },
];

const timeSlots = ['08:00am', '09:00am', '10:00am', '11:00am', '12:00pm'];

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const startOfSelectedWeek = startOfWeek(selectedDate, { weekStartsOn: 0 }); // Sunday
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfSelectedWeek, i));
  
  const learningProgress = 88;
  const learningTotal = 180;
  
  return (
    <div className="space-y-6 max-w-lg mx-auto pb-24">
      <Reveal>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold font-headline">Schedule</h1>
          <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="border rounded-full">
                    <CalendarIcon className="h-5 w-5" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                />
            </PopoverContent>
          </Popover>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="flex justify-around bg-muted p-1 rounded-full">
          {weekDays.map((day) => (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={cn(
                'flex flex-col items-center justify-center w-12 h-16 rounded-full transition-colors relative',
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
            <h2 className="text-xl font-bold font-headline">My Schedule</h2>
            <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
            </Button>
        </div>
      </Reveal>

      <Reveal delay={0.4} className="space-y-1 relative">
        {timeSlots.map((time, index) => {
          // Note: The schedule is static. For a real app, this should filter events for `selectedDate`.
          const event = scheduleData.find(e => e.time === time);
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
                   index === 2 && (
                    <div className="text-center text-muted-foreground text-xs pt-8 relative -left-3">
                        <div className="h-px w-full bg-border/70 absolute top-1/2 left-0 -translate-y-1/2"></div>
                        <span className='bg-background px-2 relative z-10'>
                            You've no lectures from 10:00am to 11:00am
                        </span>
                    </div>
                   )
                )}
              </div>
            </div>
          )
        })}
      </Reveal>
    </div>
  );
}
