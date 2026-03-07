
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { collectionGroup, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import type { ExamSubmission } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Award, CheckCircle, Percent, Hourglass, FileText } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/shared/reveal';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

export const dynamic = 'force-dynamic';


function ScoreBadge({ score, total }: { score: number, total: number }) {
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const colorClass = 
        percentage >= 80 ? 'bg-green-500/10 text-green-700 border-green-500/20' :
        percentage >= 50 ? 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' :
        'bg-red-500/10 text-red-700 border-red-500/20';

    return (
        <Badge variant="outline" className={cn("text-base font-bold", colorClass)}>
            {score} / {total}
        </Badge>
    )
}


export default function MyResultsPage() {
    const { firestore } = useFirebase();
    const { user, loading: userLoading } = useUser();
    const router = useRouter();
    const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userLoading) {
            return;
        }
        if (!firestore || !user) {
            router.push('/sign-in');
            return;
        }

        setLoading(true);
        const submissionsQuery = query(
            collectionGroup(firestore, 'submissions'),
            where('studentId', '==', user.id),
            orderBy('submittedAt', 'desc')
        );

        const unsubscribe = onSnapshot(submissionsQuery, (snapshot) => {
            const subs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamSubmission));
            setSubmissions(subs);
            setLoading(false);
        }, (serverError: any) => {
            if (serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: 'submissions collection group',
                    operation: 'list',
                }, { cause: serverError });
                errorEmitter.emit('permission-error', permissionError);
            } else {
                console.warn("Firestore error fetching results:", serverError);
            }
            setLoading(false);
        });

        return () => unsubscribe();

    }, [firestore, user, userLoading, router]);
    
    const { averageScore, totalExamsTaken, chartData } = useMemo(() => {
        const mcqSubmissions = submissions.filter(s => s.examType === 'mcq' && s.score !== undefined && s.totalQuestions);
        
        const totalScore = mcqSubmissions.reduce((acc, s) => acc + (s.score! / s.totalQuestions!) * 100, 0);
        const averageScore = mcqSubmissions.length > 0 ? Math.round(totalScore / mcqSubmissions.length) : 0;
        
        const latestSubmissions = submissions.slice(0, 7).reverse();
        const chartData = latestSubmissions.map(s => {
            let percentage = 0;
            if (s.examType === 'mcq' && s.score !== undefined && s.totalQuestions) {
                percentage = Math.round((s.score / s.totalQuestions) * 100);
            } else if (s.examType === 'descriptive' && s.score !== undefined && s.totalMarks) {
                percentage = Math.round((s.score / s.totalMarks) * 100);
            }
            return {
                name: s.examTitle.substring(0, 15) + '...',
                score: percentage
            };
        });

        return {
            averageScore,
            totalExamsTaken: submissions.length,
            chartData
        };
    }, [submissions]);

    if (loading || userLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="space-y-8">
             <Reveal>
                <div>
                    <h1 className="text-3xl font-bold font-headline">My Exam Results</h1>
                    <p className="text-muted-foreground">An overview of your performance across all exams.</p>
                </div>
            </Reveal>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Reveal delay={0.1}>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Exams Taken</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">{totalExamsTaken}</div></CardContent>
                    </Card>
                </Reveal>
                <Reveal delay={0.2}>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Average MCQ Score</CardTitle>
                            <Percent className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">{averageScore}%</div></CardContent>
                    </Card>
                </Reveal>
            </div>
            
            <Reveal delay={0.3}>
                 <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Recent Performance</CardTitle>
                        <CardDescription>Your scores on the last 7 exams.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} unit="%" />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted))' }}
                                        content={({ active, payload, label }) =>
                                            active && payload && payload.length ? (
                                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                                    <p className="text-sm font-bold">{label}</p>
                                                    <p className="text-sm text-primary">Score: {payload[0].value}%</p>
                                                </div>
                                            ) : null
                                        }
                                    />
                                    <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.score >= 80 ? "hsl(var(--chart-2))" : entry.score >= 50 ? "hsl(var(--chart-1))" : "hsl(var(--destructive))"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                         ) : <p className="text-muted-foreground text-center py-10">No recent exam data to display.</p>}
                    </CardContent>
                </Card>
            </Reveal>

             <Reveal delay={0.4}>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">All Submissions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {submissions.length > 0 ? (
                            submissions.map(sub => (
                                <Card key={sub.id} className="p-4 hover:bg-muted/50 transition-colors">
                                    <div className="grid grid-cols-[1fr_auto] items-start gap-4">
                                        <div className="space-y-1">
                                            <p className="font-bold text-lg">{sub.examTitle}</p>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                <span>Submitted {formatDistanceToNow(sub.submittedAt.toDate(), { addSuffix: true })}</span>
                                                <Badge variant="outline" className="capitalize">{sub.examType}</Badge>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            {sub.examType === 'mcq' && sub.score !== undefined && sub.totalQuestions ? (
                                                <ScoreBadge score={sub.score} total={sub.totalQuestions} />
                                            ) : sub.examType === 'descriptive' ? (
                                                sub.status === 'reviewed' && sub.score !== undefined && sub.totalMarks ? (
                                                    <ScoreBadge score={sub.score} total={sub.totalMarks} />
                                                ) : (
                                                    <Badge variant="secondary" className="items-center gap-1.5"><Hourglass className="h-3 w-3"/> Pending Review</Badge>
                                                )
                                            ) : null}
                                            <Button size="sm" variant="outline" onClick={() => router.push(`/exams/result/${sub.studentId}_${sub.examId}`)}>View Details</Button>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        ) : (
                             <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                                <Award className="h-10 w-10 mx-auto mb-2" />
                                <p>No exam results found.</p>
                                <p>Complete an exam to see your results here.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
             </Reveal>

        </div>
    );
}
