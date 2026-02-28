'use client';

import { useState, useEffect } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import type { Schedule } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { AttendanceDetails } from '@/components/teacher/attendance-details';
import { Reveal } from '@/components/shared/reveal';

export default function AttendancePage() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

    useEffect(() => {
        if (!firestore || !user) return;
        setLoading(true);

        const schedulesQuery = query(
            collection(firestore, 'schedules'),
            where('teacherId', '==', user.id),
            orderBy('date', 'desc')
        );

        const unsubscribe = onSnapshot(schedulesQuery, (snapshot) => {
            const schedulesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule));
            setSchedules(schedulesList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching schedules for attendance:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, user]);
    
    return (
        <div className="space-y-8">
            <Reveal>
                <div>
                    <h1 className="text-3xl font-bold font-headline">Students' Attendance</h1>
                    <p className="text-muted-foreground">Select a class or exam to view attendance details.</p>
                </div>
            </Reveal>

            <div className="grid md:grid-cols-2 gap-8 items-start">
                <Reveal delay={0.2}>
                    <Card>
                        <CardHeader>
                            <CardTitle>My Scheduled Items</CardTitle>
                            <CardDescription>A list of your past and upcoming classes/exams.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex justify-center items-center h-40">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : schedules.length > 0 ? (
                                <ul className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                                    {schedules.map(schedule => (
                                        <li key={schedule.id}>
                                            <button 
                                                className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedSchedule?.id === schedule.id ? 'bg-accent border-primary' : 'hover:bg-accent/50'}`}
                                                onClick={() => setSelectedSchedule(schedule)}
                                            >
                                                <p className="font-semibold">{schedule.title}</p>
                                                <p className="text-sm text-muted-foreground capitalize">{schedule.date.toDate().toLocaleDateString()} - {schedule.type}</p>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-center text-muted-foreground py-10">You have not scheduled any items yet.</p>
                            )}
                        </CardContent>
                    </Card>
                </Reveal>
                <Reveal delay={0.4} className="sticky top-20">
                    {selectedSchedule ? (
                        <AttendanceDetails schedule={selectedSchedule} />
                    ) : (
                        <Card className="flex items-center justify-center h-64 border-2 border-dashed">
                             <p className="text-muted-foreground">Select an item to see details</p>
                        </Card>
                    )}
                </Reveal>
            </div>
        </div>
    );
}
