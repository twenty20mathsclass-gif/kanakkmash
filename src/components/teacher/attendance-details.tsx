'use client';
import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, query, getDocs, where } from 'firebase/firestore';
import type { Schedule } from '@/lib/definitions';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

type Attendee = {
    id: string;
    studentName: string;
    studentAvatar: string;
    attendedAt: { toDate: () => Date };
};

export function AttendanceDetails({ schedule }: { schedule: Schedule }) {
    const { firestore } = useFirebase();
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalStudents, setTotalStudents] = useState(0);

    useEffect(() => {
        if (!firestore) return;
        setLoading(true);
        
        const fetchDetails = async () => {
            try {
                // Fetch total students for this schedule's group
                let studentsQuery;
                if (schedule.studentId) {
                     setTotalStudents(1);
                } else {
                    if (schedule.courseModel === 'COMPETITIVE EXAM') {
                        studentsQuery = query(collection(firestore, 'users'), where('role', '==', 'student'), where('courseModel', '==', 'COMPETITIVE EXAM'));
                    } else if (schedule.class === 'DEGREE') {
                        studentsQuery = query(collection(firestore, 'users'), where('role', '==', 'student'), where('class', '==', 'DEGREE'));
                    } else {
                        studentsQuery = query(collection(firestore, 'users'), where('role', '==', 'student'), where('class', '==', schedule.class), where('syllabus', '==', schedule.syllabus));
                    }
                    const studentsSnapshot = await getDocs(studentsQuery);
                    setTotalStudents(studentsSnapshot.size);
                }

            } catch (e) {
                console.error("Could not fetch total students for schedule", e);
                setTotalStudents(0);
            }
        };

        fetchDetails();

        const attendeesQuery = query(collection(firestore, 'schedules', schedule.id, 'attendees'));

        const unsubscribe = onSnapshot(attendeesQuery, (snapshot) => {
            const attendeesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendee));
            setAttendees(attendeesList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching attendees:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, schedule]);

    const attendancePercentage = totalStudents > 0 ? Math.round((attendees.length / totalStudents) * 100) : 0;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Attendance for: {schedule.title}</CardTitle>
                <CardDescription className="capitalize">
                    {schedule.type} on {schedule.date.toDate().toLocaleDateString()}
                </CardDescription>
                 <div className="text-sm pt-2">
                    <p>
                        <span className="font-bold">{attendees.length}</span> out of {' '}
                        <span className="font-bold">{totalStudents}</span> student(s) attended.
                    </p>
                    <p className="font-bold text-primary">{attendancePercentage}% attendance</p>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : attendees.length > 0 ? (
                    <ul className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {attendees.map(attendee => (
                            <li key={attendee.id} className="flex items-center gap-4 p-2 rounded-md border">
                                <Avatar>
                                    <AvatarImage src={attendee.studentAvatar} alt={attendee.studentName} />
                                    <AvatarFallback>{attendee.studentName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="font-medium">{attendee.studentName}</p>
                                    <p className="text-sm text-muted-foreground">
                                        Joined at: {format(attendee.attendedAt.toDate(), 'p')}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-muted-foreground text-center py-8">No attendance records found.</p>
                )}
            </CardContent>
        </Card>
    );
}
