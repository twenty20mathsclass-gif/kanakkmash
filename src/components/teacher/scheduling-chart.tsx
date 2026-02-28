'use client';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal } from "../shared/reveal";
import { startOfWeek, format } from 'date-fns';
import type { Schedule } from '@/lib/definitions';
import { useMemo } from "react";

export function SchedulingChart({ schedules }: { schedules: Schedule[] }) {
    
    const chartData = useMemo(() => {
        const weeklyData: { [week: string]: { week: string, classes: number, exams: number } } = {};
        const now = new Date();
        const fourWeeksAgo = new Date(new Date().setDate(now.getDate() - 28));

        schedules.forEach(schedule => {
            const scheduleDate = schedule.date.toDate();
            if (scheduleDate >= fourWeeksAgo) {
                const weekStart = startOfWeek(scheduleDate, { weekStartsOn: 1 }); // Monday
                const weekKey = format(weekStart, 'MMM d');
                
                if (!weeklyData[weekKey]) {
                    weeklyData[weekKey] = { week: weekKey, classes: 0, exams: 0 };
                }

                if (schedule.type === 'class') {
                    weeklyData[weekKey].classes += 1;
                } else if (schedule.type === 'exam') {
                    weeklyData[weekKey].exams += 1;
                }
            }
        });

        const sortedData = Object.values(weeklyData).sort((a,b) => {
            const dateA = new Date(a.week + ' ' + new Date().getFullYear());
            const dateB = new Date(b.week + ' ' + new Date().getFullYear());
            return dateA.getTime() - dateB.getTime();
        });

        return sortedData.slice(-4); // Last 4 weeks
    }, [schedules]);

    if (!chartData || chartData.length === 0) {
        return (
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline text-xl">Scheduling Activity</CardTitle>
                    <CardDescription>Your class and exam schedule activity for the last 4 weeks.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[250px]">
                    <p className="text-muted-foreground">Not enough data to display chart.</p>
                </CardContent>
            </Card>
        );
    }

  return (
    <Reveal delay={0.3}>
        <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="font-headline text-xl">Scheduling Activity</CardTitle>
            <CardDescription>Your class and exam schedule activity for the last 4 weeks.</CardDescription>
        </CardHeader>
        <CardContent>
            <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip 
                        contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            borderColor: 'hsl(var(--border))'
                        }}
                    />
                    <Legend wrapperStyle={{fontSize: "12px"}}/>
                    <Bar dataKey="classes" fill="hsl(var(--chart-1))" name="Classes" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="exams" fill="hsl(var(--chart-2))" name="Exams" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </CardContent>
        </Card>
    </Reveal>
  );
}
