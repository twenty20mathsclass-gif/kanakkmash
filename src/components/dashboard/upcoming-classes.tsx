'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, Timestamp, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { format, parse } from 'date-fns';
import type { Schedule } from '@/lib/definitions';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, Clock, Loader2, User as UserIcon, Award } from "lucide-react";
import { Reveal } from "../shared/reveal";

const iconMap: { [key: string]: React.ElementType } = {
  BookText: BookOpen,
  User: UserIcon,
  Award: Award,
  BookOpen: BookOpen,
};

export function UpcomingClasses() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [upcomingClasses, setUpcomingClasses] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !user?.courseModel) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
      collection(firestore, 'schedules'),
      where('courseModel', '==', user.courseModel),
      where('date', '>=', Timestamp.fromDate(today)),
      orderBy('date', 'asc'),
      orderBy('startTime', 'asc'),
      limit(3)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const classes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule));
      setUpcomingClasses(classes);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching upcoming classes:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, user]);

  return (
    <section>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold font-headline">Upcoming Classes</h2>
            <Link href="/calendar" className="text-sm font-medium text-primary hover:underline">
                View Schedule
            </Link>
        </div>
      
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : upcomingClasses.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                {upcomingClasses.map((item, index) => {
                    const IconComponent = iconMap[item.icon] || BookOpen;
                    return (
                        <Reveal key={item.id} delay={0.2 + index * 0.1} className="min-w-[280px] w-[280px] flex-shrink-0">
                            <a href={item.meetLink} target="_blank" rel="noopener noreferrer" className="block h-full">
                                <Card style={{ backgroundColor: item.color }} className="text-primary-foreground shadow-lg h-full">
                                    <CardContent className="p-6 flex flex-col justify-between h-full">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className="bg-background/20 rounded-lg p-2.5 flex items-center justify-center">
                                                    <IconComponent className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-xs opacity-80">{item.subject}</p>
                                                    <h3 className="font-bold font-headline text-lg leading-tight">{item.title}</h3>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-end mt-6">
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
                            </a>
                        </Reveal>
                    )
                })}
            </div>
        ) : (
            <Reveal>
                <Card className="flex items-center justify-center h-40 bg-muted/50">
                    <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground">No upcoming classes scheduled.</p>
                        <Button asChild variant="link">
                            <Link href="/calendar">View Full Schedule</Link>
                        </Button>
                    </CardContent>
                </Card>
            </Reveal>
        )}
    </section>
  );
}
