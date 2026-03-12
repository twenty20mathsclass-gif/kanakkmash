
'use client';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";
import { format } from 'date-fns';
import type { Reward } from "@/lib/definitions";

export function RevenueChart({ rewards }: { rewards: Reward[] }) {
    
    const chartData = useMemo(() => {
        const monthlyData: { [month: string]: { month: string, revenue: number } } = {};
        
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        // Initialize last 6 months
        for (let i = 0; i < 6; i++) {
            const date = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i, 1);
            const monthKey = format(date, 'MMM yy');
            monthlyData[monthKey] = { month: monthKey, revenue: 0 };
        }

        rewards.forEach(reward => {
            if (reward.createdAt) {
                const rewardDate = reward.createdAt.toDate();
                if (rewardDate >= sixMonthsAgo) {
                    const monthKey = format(rewardDate, 'MMM yy');
                    if (monthlyData[monthKey]) {
                        monthlyData[monthKey].revenue += reward.rewardAmount;
                    }
                }
            }
        });

        return Object.values(monthlyData);
    }, [rewards]);

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-xl">Revenue Generated</CardTitle>
                <CardDescription>Your monthly reward earnings over the last 6 months.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(value) => `₹${value}`}
                        />
                        <Tooltip 
                            contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                borderColor: 'hsl(var(--border))'
                            }}
                            formatter={(value) => [`₹${(value as number).toLocaleString('en-IN')}`, "Revenue"]}
                            cursor={{fill: 'hsl(var(--muted))'}}
                        />
                        <Bar dataKey="revenue" fill="hsl(var(--chart-2))" name="Revenue" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
