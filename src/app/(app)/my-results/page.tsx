'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { collectionGroup, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import type { ExamSubmission } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Award, CheckCircle, Percent, Hourglass, FileText, TrendingUp, Target, BarChart3 } from 'lucide-react';
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
    
    const { averageScore, totalExamsTaken, topScore, chartData, performanceLevel } = useMemo(() => {
        const scores: number[] = [];
        
        submissions.forEach(s => {
            let percentage = 0;
            if (s.examType === 'mcq' && s.score !== undefined && s.totalQuestions) {
                percentage = Math.round((s.score / s.totalQuestions) * 100);
            } else if (s.examType === 'descriptive' && s.score !== undefined && s.totalMarks) {
                percentage = Math.round((s.score / s.totalMarks) * 100);
            }
            
            if (s.examType === 'mcq' || (s.examType === 'descriptive' && s.status === 'reviewed')) {
                scores.push(percentage);
            }
        });
        
        const totalExamsTaken = submissions.length;
        const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const topScore = scores.length > 0 ? Math.max(...scores) : 0;
        
        const latestSubmissions = submissions.slice(0, 10).reverse();
        const chartData = latestSubmissions.map(s => {
            let percentage = 0;
            if (s.examType === 'mcq' && s.score !== undefined && s.totalQuestions) {
                percentage = Math.round((s.score / s.totalQuestions) * 100);
            } else if (s.examType === 'descriptive' && s.score !== undefined && s.totalMarks) {
                percentage = Math.round((s.score / s.totalMarks) * 100);
            }
            return {
                name: s.examTitle.length > 15 ? s.examTitle.substring(0, 12) + '...' : s.examTitle,
                fullName: s.examTitle,
                score: percentage,
                type: s.examType
            };
        });

        let performanceLevel = "Not Assessed";
        if (scores.length > 0) {
            if (averageScore >= 90) performanceLevel = "Excellent";
            else if (averageScore >= 75) performanceLevel = "Very Good";
            else if (averageScore >= 60) performanceLevel = "Good";
            else if (averageScore >= 45) performanceLevel = "Satisfactory";
            else performanceLevel = "Needs Improvement";
        }

        return {
            averageScore,
            totalExamsTaken,
            topScore,
            chartData,
            performanceLevel
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
        <div className="space-y-8 pb-12">
             <Reveal>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">My Exam Results</h1>
                        <p className="text-muted-foreground">Historical data and progress assessment.</p>
                    </div>
                    {submissions.length > 0 && (
                        <Badge variant="secondary" className="w-fit text-lg py-1 px-4 font-bold bg-primary/10 text-primary border-primary/20">
                            Assessment: {performanceLevel}
                        </Badge>
                    )}
                </div>
            </Reveal>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Reveal delay={0.1}>
                    <Card className="bg-gradient-to-br from-background to-muted/20 border-none shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Exams Taken</CardTitle>
                            <FileText className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{totalExamsTaken}</div>
                            <p className="text-xs text-muted-foreground mt-1">Total attempted assessments</p>
                        </CardContent>
                    </Card>
                </Reveal>
                <Reveal delay={0.2}>
                     <Card className="bg-gradient-to-br from-background to-muted/20 border-none shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                            <Percent className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{averageScore}%</div>
                            <p className="text-xs text-muted-foreground mt-1">Overall percentage across sessions</p>
                        </CardContent>
                    </Card>
                </Reveal>
                <Reveal delay={0.3}>
                     <Card className="bg-gradient-to-br from-background to-muted/20 border-none shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Top Score</CardTitle>
                            <Target className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{topScore}%</div>
                            <p className="text-xs text-muted-foreground mt-1">Your highest individual achievement</p>
                        </CardContent>
                    </Card>
                </Reveal>
                <Reveal delay={0.4}>
                     <Card className="bg-gradient-to-br from-background to-muted/20 border-none shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Performance Level</CardTitle>
                            <TrendingUp className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{performanceLevel}</div>
                            <p className="text-xs text-muted-foreground mt-1">Based on recent data</p>
                        </CardContent>
                    </Card>
                </Reveal>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Reveal delay={0.5} className="lg:col-span-2">
                    <Card className="h-full border-none shadow-lg">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-primary" />
                                <CardTitle className="font-headline">Learning Trend</CardTitle>
                            </div>
                            <CardDescription>Score percentage for your last 10 assessments.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                        <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
                                        <Tooltip
                                            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                                            content={({ active, payload }) =>
                                                active && payload && payload.length ? (
                                                    <div className="rounded-lg border bg-background p-3 shadow-xl space-y-1">
                                                        <p className="text-sm font-bold">{payload[0].payload.fullName}</p>
                                                        <p className="text-xs text-muted-foreground capitalize">Type: {payload[0].payload.type}</p>
                                                        <p className="text-sm font-bold text-primary">Score: {payload[0].value}%</p>
                                                    </div>
                                                ) : null
                                            }
                                        />
                                        <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={30}>
                                            {chartData.map((entry, index) => (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={
                                                        entry.score >= 80 ? "hsl(var(--success))" : 
                                                        entry.score >= 50 ? "hsl(var(--primary))" : 
                                                        "hsl(var(--destructive))"
                                                    } 
                                                    fillOpacity={0.8}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-muted/5 rounded-lg border-2 border-dashed">
                                    <BarChart3 className="h-12 w-12 mb-2 opacity-20" />
                                    <p>No historical data to display yet.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </Reveal>

                <Reveal delay={0.6} className="lg:col-span-1">
                    <Card className="h-full border-none shadow-lg">
                        <CardHeader>
                            <CardTitle className="font-headline">Assessment Status</CardTitle>
                            <CardDescription>Breakdown of submission statuses.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-success" /> Reviewed</span>
                                    <span className="font-bold">{submissions.filter(s => s.status === 'reviewed' || s.examType === 'mcq').length}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm text-muted-foreground">
                                    <span className="flex items-center gap-2"><Hourglass className="h-4 w-4 text-warning" /> Pending Review</span>
                                    <span className="font-bold">{submissions.filter(s => s.status === 'submitted' && s.examType === 'descriptive').length}</span>
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t">
                                <h4 className="text-sm font-bold mb-3 uppercase tracking-wider text-muted-foreground">Progress Insights</h4>
                                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-3">
                                    <p className="text-sm leading-relaxed">
                                        {averageScore >= 75 
                                            ? "Your performance is strong. Focus on maintaining consistency across advanced topics." 
                                            : averageScore >= 50 
                                            ? "You are showing steady progress. Reviewing incorrect answers in descriptive tests will help bridge the gap."
                                            : "Keep practicing. We recommend using the AI Practice Center to focus on your weaker areas."}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Reveal>
            </div>

             <Reveal delay={0.7}>
                <Card className="border-none shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="font-headline">All Submission History</CardTitle>
                            <CardDescription>A complete list of your exam attempts.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {submissions.length > 0 ? (
                            <div className="grid gap-4">
                                {submissions.map(sub => (
                                    <Card key={sub.id} className="p-4 hover:shadow-md transition-all border-l-4 border-l-primary/40">
                                        <div className="flex flex-col sm:flex-row justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-lg">{sub.examTitle}</p>
                                                    <Badge variant="outline" className="capitalize text-[10px] py-0">{sub.examType}</Badge>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <FileText className="h-3 w-3" />
                                                        {sub.submittedAt ? format(sub.submittedAt.toDate(), 'PPP') : 'Processing...'}
                                                    </span>
                                                    <span className="flex items-center gap-1 italic">
                                                        {formatDistanceToNow(sub.submittedAt.toDate(), { addSuffix: true })}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                                                {sub.examType === 'mcq' && sub.score !== undefined && sub.totalQuestions ? (
                                                    <ScoreBadge score={sub.score} total={sub.totalQuestions} />
                                                ) : sub.examType === 'descriptive' ? (
                                                    sub.status === 'reviewed' && sub.score !== undefined && sub.totalMarks ? (
                                                        <ScoreBadge score={sub.score} total={sub.totalMarks} />
                                                    ) : (
                                                        <Badge variant="secondary" className="items-center gap-1.5 py-1">
                                                            <Hourglass className="h-3 w-3 animate-pulse" /> Pending Review
                                                        </Badge>
                                                    )
                                                ) : null}
                                                <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10" onClick={() => router.push(`/exams/result/${sub.studentId}_${sub.examId}`)}>
                                                    View Details
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                             <div className="p-12 text-center text-muted-foreground border-2 border-dashed rounded-2xl bg-muted/5">
                                <Award className="h-16 w-16 mx-auto mb-4 opacity-20" />
                                <h3 className="text-xl font-bold text-foreground">No records found</h3>
                                <p className="mt-1">Complete your first exam to see your assessment analytics here.</p>
                                <Button className="mt-6" variant="outline" onClick={() => router.push('/exam-schedule')}>
                                    View Exam Schedule
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
             </Reveal>

        </div>
    );
}
