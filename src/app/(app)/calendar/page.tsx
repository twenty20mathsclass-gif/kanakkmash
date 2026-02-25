'use client';

import { useState } from 'react';
import { format, addDays, startOfWeek, isToday, isSameDay } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, ArrowRight, Clock, MoreHorizontal, BookText, AppWindow, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/shared/reveal';

const scheduleData = [
  {
    id: 1,
    subject: 'Language',
    title: 'The Language Lecture Series',
    time: '08:00am',
    startTime: '8:00',
    endTime: '8:45',
    icon: BookText,
    color: 'hsl(30 95% 55%)',
    textColor: 'hsl(var(--primary-foreground))'
  },
  {
    id: 2,
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
    subject: 'Chemistry',
    title: 'Chemistry Concepts Series',
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
  const [selectedDate, setSelectedDate] = useState(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 0));

  const startOfCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 0 }); // Sunday
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfCurrentWeek, i));
  
  const learningProgress = 88;
  const learningTotal = 180;
  
  const upNextEvent = scheduleData.sort((a,b) => a.startTime.localeCompare(b.startTime)).find(event => {
      const [hour] = event.startTime.split(':').map(Number);
      return new Date().getHours() < hour;
  }) || scheduleData[0];

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-24">
      <Reveal>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold font-headline">Schedule</h1>
          <Button variant="ghost" size="icon" className="border rounded-full">
            <CalendarIcon className="h-5 w-5" />
          </Button>
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
              <Button size="icon" variant="ghost" className="bg-primary-foreground/20 hover:bg-primary-foreground/30 rounded-full">
                <ArrowRight className="h-5 w-5" />
              </Button>
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
          const event = scheduleData.find(e => e.time === time);
          return (
            <div key={time} className="flex gap-4 items-stretch min-h-[4rem]">
              <div className="text-xs font-medium text-muted-foreground w-16 text-right pt-1">{time}</div>
              <div className="relative flex-1 border-l-2 border-dashed border-border pl-6 py-2">
                
                {event ? (
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

       {upNextEvent && (
        <div className="fixed bottom-[7rem] md:bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg z-20">
           <Reveal>
                <div className="bg-card text-card-foreground rounded-full p-2 pr-3 shadow-2xl flex items-center justify-between border">
                    <div className='flex items-center gap-2'>
                        <span className="text-xs font-bold bg-muted text-muted-foreground rounded-full px-3 py-1.5">Up Next</span>
                        <p className="font-bold text-sm">{upNextEvent.subject}</p>
                    </div>
                    <Button variant="link" size="icon" className="text-card-foreground">
                        <span className='font-bold text-sm mr-2'>{upNextEvent.title}</span>
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
           </Reveal>
        </div>
       )}
    </div>
  );
}
