
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { collectionGroup, query, where, orderBy, onSnapshot, collection, getDocs, Timestamp } from 'firebase/firestore';
import type { ExamSubmission } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Award, CheckCircle, Percent, Hourglass, FileText, TrendingUp, Target, BarChart3, ChevronRight } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/shared/reveal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Sparkles, Trophy, ClipboardCheck, ArrowUpRight, GraduationCap, Calendar, Phone, Mail, Info, ShieldCheck, XCircle } from 'lucide-react';
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
    const [assessments, setAssessments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAssessment, setSelectedAssessment] = useState<any | null>(null);

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

    useEffect(() => {
        if (!user || !firestore) return;
        
        const fetchAssessments = async () => {
            try {
                // Link assessments by user email or userId
                const q = query(
                    collection(firestore, 'assessment'),
                    where('userId', '==', user.id)
                );
                const snap = await getDocs(q);
                const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAssessments(list.filter((a: any) => a.assessmentType === 'paid'));
            } catch (err) {
                console.warn("Error fetching initial assessments:", err);
            }
        };
        fetchAssessments();
    }, [user, firestore]);
    
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
                        <Badge variant="secondary" className="w-fit text-lg py-1 px-4 font-bold bg-primary/10 text-primary border-primary/20 rounded-full">
                            Assessment: {performanceLevel}
                        </Badge>
                    )}
                </div>
            </Reveal>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Reveal delay={0.1}>
                    <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Exams Taken</CardTitle>
                            <FileText className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{totalExamsTaken}</div>
                            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Total attempted</p>
                        </CardContent>
                    </Card>
                </Reveal>
                <Reveal delay={0.2}>
                     <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                            <Percent className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{averageScore}%</div>
                            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Overall precision</p>
                        </CardContent>
                    </Card>
                </Reveal>
                <Reveal delay={0.3}>
                     <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Top Score</CardTitle>
                            <Target className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{topScore}%</div>
                            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Best achievement</p>
                        </CardContent>
                    </Card>
                </Reveal>
                <Reveal delay={0.4}>
                     <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Rank Level</CardTitle>
                            <Award className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{performanceLevel}</div>
                            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Relative standing</p>
                        </CardContent>
                    </Card>
                </Reveal>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Reveal delay={0.5} className="lg:col-span-2">
                    <Card className="h-full border border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-indigo-600" />
                                <CardTitle className="font-headline">Learning Trend</CardTitle>
                            </div>
                            <CardDescription>Visual summary of your last 10 session scores.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                        <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
                                        <Tooltip
                                            cursor={{ fill: '#F8FAFC', opacity: 0.4 }}
                                            content={({ active, payload }) =>
                                                active && payload && payload.length ? (
                                                    <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-xl space-y-1">
                                                        <p className="text-xs font-bold text-slate-800">{payload[0].payload.fullName}</p>
                                                        <p className="text-sm font-bold text-indigo-600">Score: {payload[0].value}%</p>
                                                    </div>
                                                ) : null
                                            }
                                        />
                                        <Bar dataKey="score" radius={[6, 6, 0, 0]} barSize={32}>
                                            {chartData.map((entry, index) => (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={
                                                        entry.score >= 80 ? "#22C55E" : 
                                                        entry.score >= 50 ? "#4F46E5" : 
                                                        "#EF4444"
                                                    } 
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-slate-50 rounded-2xl border-2 border-dashed">
                                    <BarChart3 className="h-12 w-12 mb-2 opacity-20" />
                                    <p>No historical data to display yet.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </Reveal>

                <Reveal delay={0.6} className="lg:col-span-1">
                    <Card className="h-full border border-slate-100 shadow-sm rounded-3xl bg-white">
                        <CardHeader>
                            <CardTitle className="font-headline">Progress Insights</CardTitle>
                            <CardDescription>AI-driven status overview.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-5 rounded-3xl bg-indigo-50/50 border border-indigo-100 space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="flex items-center gap-2 font-bold text-slate-700"><CheckCircle className="h-4 w-4 text-green-500" /> Completed</span>
                                    <span className="font-black text-indigo-600">{submissions.filter(s => s.status === 'reviewed' || s.examType === 'mcq').length}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="flex items-center gap-2 font-bold text-slate-700"><Hourglass className="h-4 w-4 text-amber-500" /> In Review</span>
                                    <span className="font-black text-indigo-600">{submissions.filter(s => s.status === 'submitted' && s.examType === 'descriptive').length}</span>
                                </div>
                            </div>
                            
                            <div className="pt-2">
                                <h4 className="text-[10px] font-black mb-3 uppercase tracking-widest text-slate-400">Tutor Feedback</h4>
                                <p className="text-sm leading-relaxed text-slate-600 italic">
                                    "{averageScore >= 75 
                                        ? "Your performance is strong. Consistency is key to mastery." 
                                        : averageScore >= 50 
                                        ? "Steady progress detected. Focus on reviewing your mistakes in descriptive tests."
                                        : "Don't discourage! Use the AI Practice Center to bridge your knowledge gaps."}"
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </Reveal>
            </div>

             <Reveal delay={0.7}>
                <div className="pt-4 space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <TrendingUp className="h-5 w-5 text-indigo-600" />
                        <h2 className="font-headline font-bold text-slate-700">Submission History</h2>
                    </div>
                    {submissions.length > 0 ? (
                        <div className="grid gap-4">
                            {submissions.map(sub => (
                                <Card key={sub.id} className="border border-slate-100 shadow-sm rounded-3xl bg-white hover:border-indigo-200 transition-all group overflow-hidden">
                                    <CardContent className="p-0">
                                        <button 
                                            onClick={() => router.push(`/exams/result/${sub.studentId}_${sub.examId}`)}
                                            className="w-full flex flex-col sm:flex-row items-center justify-between p-6 gap-4 text-left"
                                        >
                                            <div className="flex items-center gap-4 w-full">
                                                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 transition-colors">
                                                    <FileText className="h-6 w-6 text-indigo-600" />
                                                </div>
                                                <div className="space-y-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-slate-800 truncate">{sub.examTitle}</p>
                                                        <Badge variant="outline" className="capitalize text-[10px] font-bold border-slate-200">{sub.examType}</Badge>
                                                    </div>
                                                    <p className="text-xs text-slate-400 font-medium">
                                                        {sub.submittedAt ? format(sub.submittedAt.toDate(), 'PPP') : 'Processing...'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                                                {sub.examType === 'mcq' && sub.score !== undefined && sub.totalQuestions ? (
                                                    <ScoreBadge score={sub.score} total={sub.totalQuestions} />
                                                ) : sub.examType === 'descriptive' ? (
                                                    sub.status === 'reviewed' && sub.score !== undefined && sub.totalMarks ? (
                                                        <ScoreBadge score={sub.score} total={sub.totalMarks} />
                                                    ) : (
                                                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-none font-bold py-1 px-3 rounded-full">
                                                            Pending Review
                                                        </Badge>
                                                    )
                                                ) : null}
                                                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 transition-colors shrink-0" />
                                            </div>
                                        </button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                         <div className="p-16 text-center border border-slate-100 rounded-[2.5rem] bg-white shadow-sm">
                            <Award className="h-16 w-16 mx-auto mb-4 text-slate-200" />
                            <h3 className="text-xl font-bold text-slate-800">No records found</h3>
                            <p className="text-slate-400 mt-1 max-w-xs mx-auto">Complete your first exam to see your assessment analytics here.</p>
                            <Button className="mt-8 rounded-2xl h-12 px-8 font-bold" variant="outline" onClick={() => router.push('/exam-schedule')}>
                                View Exam Schedule
                            </Button>
                        </div>
                    )}
                </div>
             </Reveal>

             {/* Initial Assessment Section */}
             {assessments.length > 0 && (
                <Reveal delay={0.8}>
                    <div className="pt-10 space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <Sparkles className="h-5 w-5 text-amber-500" />
                            <h2 className="font-headline font-bold text-slate-700">Initial Assessment</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {assessments.map(item => (
                                <Card 
                                    key={item.id} 
                                    className="border border-slate-100 shadow-sm rounded-3xl bg-white hover:border-amber-200 transition-all group cursor-pointer overflow-hidden relative"
                                    onClick={() => setSelectedAssessment(item)}
                                >
                                    <div className="absolute top-0 right-0 p-4">
                                        <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-amber-500 transition-colors" />
                                    </div>
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="h-10 w-10 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
                                                <Trophy className="h-5 w-5 text-amber-600" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-sm font-bold truncate leading-tight">Entrance Test</CardTitle>
                                                <CardDescription className="text-[10px] font-bold uppercase tracking-wider">{item.class}</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pb-6">
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Score Result</p>
                                                <p className="text-2xl font-black text-slate-800">
                                                    {item.score}<span className="text-sm text-slate-300">/{item.totalQuestions}</span>
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Precision</p>
                                                <p className="text-lg font-black text-amber-600">{item.percentage}%</p>
                                            </div>
                                        </div>
                                        <div className="w-full bg-slate-50 h-1.5 rounded-full mt-4 overflow-hidden border border-slate-100">
                                            <div 
                                                className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full" 
                                                style={{ width: `${item.percentage}%` }}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </Reveal>
             )}

             {/* Assessment Detail Modal */}
             <Dialog open={!!selectedAssessment} onOpenChange={(open) => !open && setSelectedAssessment(null)}>
                <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl rounded-[3rem] gap-0">
                    <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 p-8 pt-10 text-white relative">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-3xl font-black font-headline leading-tight">Initial Assessment</h2>
                                <p className="text-white/70 font-medium text-sm mt-1">Foundational performance report</p>
                            </div>
                            <div className="bg-white/10 p-4 rounded-[2rem] backdrop-blur-md shrink-0 border border-white/10">
                                <Award size={32} className="text-white" />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-8">
                            <Badge className="bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm px-4 py-1 rounded-full text-xs font-bold">
                                Category: {selectedAssessment?.class}
                            </Badge>
                            <Badge className="bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm px-4 py-1 rounded-full text-xs font-bold">
                                {selectedAssessment?.submittedAt ? format(selectedAssessment.submittedAt.toDate(), "MMM dd, yyyy") : "N/A"}
                            </Badge>
                        </div>
                    </div>

                    <div className="p-8 bg-background">
                        <div className="mb-10 p-6 rounded-[2.5rem] bg-amber-50 border border-amber-100 flex flex-col md:flex-row items-center gap-8 shadow-inner">
                            <div className="relative w-32 h-32 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        className="text-amber-200/30"
                                        strokeWidth="8"
                                        stroke="currentColor"
                                        fill="transparent"
                                        r="56"
                                        cx="64"
                                        cy="64"
                                    />
                                    <circle
                                        className="text-amber-600"
                                        strokeWidth="8"
                                        strokeDasharray={351.85}
                                        strokeDashoffset={351.85 - (351.85 * (selectedAssessment?.percentage || 0)) / 100}
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="transparent"
                                        r="56"
                                        cx="64"
                                        cy="64"
                                    />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className="text-3xl font-black text-slate-800 leading-none">{selectedAssessment?.percentage ?? 0}%</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Score</span>
                                </div>
                            </div>
                            <div className="flex-1 text-center md:text-left space-y-1">
                                <h4 className="text-xl font-black font-headline text-slate-800">Entrance Test Success</h4>
                                <p className="text-slate-500 text-sm font-medium">
                                    You have correctly answered <span className="text-slate-800 font-bold">{selectedAssessment?.score}</span> out of <span className="text-slate-800 font-bold">{selectedAssessment?.totalQuestions}</span> questions in your initial assessment for <span className="text-amber-600 font-bold">{selectedAssessment?.class}</span>.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-2 leading-none">Testing Candidate</p>
                                    <p className="text-lg font-black text-slate-800 font-headline leading-none">{selectedAssessment?.name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-2 leading-none">Reference ID</p>
                                    <p className="text-xs font-mono text-slate-500 truncate max-w-[200px]">{selectedAssessment?.id}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-2 leading-none">Status</p>
                                    <Badge className="bg-amber-100 text-amber-700 border-none px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                                        {selectedAssessment?.status === 'completed' ? 'Evaluation Finished' : selectedAssessment?.status}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-2 leading-none">Time Attempted</p>
                                    <p className="text-sm font-medium text-slate-600 flex items-center gap-2 leading-none">
                                        <Calendar size={18} className="text-slate-300" />
                                        {selectedAssessment?.submittedAt ? format(selectedAssessment.submittedAt.toDate(), "MMMM dd, yyyy · hh:mm a") : "N/A"}
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-end pt-6 border-t">
                            <Button 
                                onClick={() => setSelectedAssessment(null)} 
                                className="rounded-2xl px-12 h-14 font-black transition-all hover:scale-[1.03] active:scale-[0.98] shadow-xl shadow-amber-600/20 bg-amber-600 hover:bg-amber-700 text-white"
                            >
                                Close Report
                            </Button>
                        </div>
                    </div>
                </DialogContent>
             </Dialog>

        </div>
    );
}
