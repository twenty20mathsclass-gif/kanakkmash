'use client';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal } from "../shared/reveal";
import { format } from 'date-fns';
import type { Schedule } from '@/lib/definitions';
import { useMemo } from "react";

export function SchedulingChart({ schedules }: { schedules: Schedule[] }) {
    
    const chartData = useMemo(() => {
        const monthlyData: { [month: string]: { month: string, classes: number, exams: number } } = {};
        const now = new Date();
        
        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = format(date, 'MMM yy');
            monthlyData[monthKey] = { month: monthKey, classes: 0, exams: 0 };
        }

        schedules.forEach(schedule => {
            const scheduleDate = schedule.date.toDate();
            const monthKey = format(scheduleDate, 'MMM yy');
            if (monthlyData[monthKey]) {
                if (schedule.type === 'class') {
                    monthlyData[monthKey].classes += 1;
                } else if (schedule.type === 'exam') {
                    monthlyData[monthKey].exams += 1;
                }
            }
        });

        return Object.values(monthlyData);
    }, [schedules]);

    if (!chartData || chartData.length === 0) {
        return (
            <Card className="shadow-lg h-full">
                <CardHeader>
                    <CardTitle className="font-headline text-xl">Monthly Scheduling Activity</CardTitle>
                    <CardDescription>Your class and exam activity for the last 6 months.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[250px]">
                    <p className="text-muted-foreground">Not enough data to display chart.</p>
                </CardContent>
            </Card>
        );
    }

  return (
    <Reveal>
        <Card className="shadow-lg h-full">
        <CardHeader>
            <CardTitle className="font-headline text-xl">Monthly Scheduling Activity</CardTitle>
            <CardDescription>Your class and exam activity for the last 6 months.</CardDescription>
        </CardHeader>
        <CardContent>
            <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
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
