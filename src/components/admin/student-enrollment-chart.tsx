'use client';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";
import { format } from 'date-fns';
import type { User } from "@/lib/definitions";

export function StudentEnrollmentChart({ users }: { users: User[] }) {
    
    const chartData = useMemo(() => {
        const monthlyData: { [month: string]: { month: string, students: number, teachers: number } } = {};
        
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        // Initialize last 6 months
        for (let i = 0; i < 6; i++) {
            const date = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i, 1);
            const monthKey = format(date, 'MMM yy');
            monthlyData[monthKey] = { month: monthKey, students: 0, teachers: 0 };
        }

        users.forEach(user => {
            if (user.createdAt) {
                const enrollmentDate = user.createdAt.toDate();
                if (enrollmentDate >= sixMonthsAgo) {
                    const monthKey = format(enrollmentDate, 'MMM yy');
                    if (monthlyData[monthKey]) {
                        if (user.role === 'student') {
                             monthlyData[monthKey].students += 1;
                        } else if (user.role === 'teacher') {
                            monthlyData[monthKey].teachers += 1;
                        }
                    }
                }
            }
        });

        return Object.values(monthlyData);
    }, [users]);

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-xl">User Enrollment</CardTitle>
                <CardDescription>New students and teachers over the last 6 months.</CardDescription>
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
                        <Bar dataKey="students" fill="hsl(var(--chart-1))" name="Students" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="teachers" fill="hsl(var(--chart-2))" name="Teachers" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
