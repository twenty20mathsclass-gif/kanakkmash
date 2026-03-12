
'use client';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";
import { format } from 'date-fns';
import type { ReferredStudent } from "@/lib/definitions";


export function ReferralsChart({ referrals }: { referrals: ReferredStudent[] }) {
    
    const chartData = useMemo(() => {
        const monthlyData: { [month: string]: { month: string, count: number } } = {};
        
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        // Initialize last 6 months
        for (let i = 0; i < 6; i++) {
            const date = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i, 1);
            const monthKey = format(date, 'MMM yy');
            monthlyData[monthKey] = { month: monthKey, count: 0 };
        }

        referrals.forEach(referral => {
            if (referral.referredAt) {
                const enrollmentDate = referral.referredAt.toDate();
                if (enrollmentDate >= sixMonthsAgo) {
                    const monthKey = format(enrollmentDate, 'MMM yy');
                    if (monthlyData[monthKey]) {
                        monthlyData[monthKey].count += 1;
                    }
                }
            }
        });

        return Object.values(monthlyData);
    }, [referrals]);

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-xl">Referrals Joined</CardTitle>
                <CardDescription>New students who joined using your link over the last 6 months.</CardDescription>
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
                            formatter={(value) => [value, "Students"]}
                            cursor={{fill: 'hsl(var(--muted))'}}
                        />
                        <Bar dataKey="count" fill="hsl(var(--chart-1))" name="Students" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
