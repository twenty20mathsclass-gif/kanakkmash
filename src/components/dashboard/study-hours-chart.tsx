'use client';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal } from "../shared/reveal";
import { useFirebase, useUser } from "@/firebase";
import { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { startOfWeek, format, subWeeks } from 'date-fns';
import { Loader2 } from "lucide-react";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

type AttendanceRecord = {
    attendedAt: Timestamp;
    durationMinutes: number;
}

export function StudyHoursChart() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore || !user) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const sixWeeksAgo = subWeeks(new Date(), 5);
        sixWeeksAgo.setHours(0,0,0,0);
        
        const q = query(
            collection(firestore, 'users', user.id, 'attendance'),
            where('attendedAt', '>=', Timestamp.fromDate(sixWeeksAgo))
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => doc.data() as AttendanceRecord);
            setAttendanceData(data);
            setLoading(false);
        }, (err) => {
            if (err.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: `users/${user.id}/attendance`,
                    operation: 'list',
                }, { cause: err });
                errorEmitter.emit('permission-error', permissionError);
            } else {
                console.error("Failed to fetch study hours data:", err);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, user]);

    const chartData = useMemo(() => {
        const weeklyData: { [week: string]: number } = {};

        // Group attendance records by week and sum the duration
        attendanceData.forEach(record => {
            if (record.attendedAt && record.durationMinutes) {
                const weekStart = startOfWeek(record.attendedAt.toDate(), { weekStartsOn: 1 }); // Monday
                const weekKey = format(weekStart, 'MMM d');
                
                if (!weeklyData[weekKey]) {
                    weeklyData[weekKey] = 0;
                }
                weeklyData[weekKey] += record.durationMinutes;
            }
        });

        // Generate data for the last 6 weeks, filling in zeros for weeks with no activity
        const result = [];
        for (let i = 5; i >= 0; i--) {
            const weekStartDate = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
            const weekKey = format(weekStartDate, 'MMM d');
            const minutes = weeklyData[weekKey] || 0;
            result.push({
                name: weekKey,
                hours: parseFloat((minutes / 60).toFixed(1)),
            });
        }

        return result;
    }, [attendanceData]);

    const totalHoursInPeriod = useMemo(() => {
        return chartData.reduce((acc, curr) => acc + curr.hours, 0);
    }, [chartData]);


  return (
    <Reveal delay={0.5}>
        <Card className="shadow-lg">
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="font-headline text-xl">Study Hours</CardTitle>
                    <CardDescription>Your weekly study time from attended classes.</CardDescription>
                </div>
                <p className="text-primary font-bold text-sm whitespace-nowrap">{totalHoursInPeriod.toFixed(1)} hrs</p>
            </div>
        </CardHeader>
        <CardContent>
            {loading ? (
                <div className="flex items-center justify-center h-[200px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}h`} domain={[0, 'dataMax + 1']} />
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <Tooltip 
                            contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                borderColor: 'hsl(var(--border))'
                            }}
                            formatter={(value) => [`${value} hours`, "Study Time"]}
                        />
                        <Area type="monotone" dataKey="hours" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorHours)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex items-center justify-center h-[200px]">
                    <p className="text-muted-foreground text-center">No study data yet. Attend some classes to see your progress!</p>
                </div>
            )}
        </CardContent>
        </Card>
    </Reveal>
  );
}
