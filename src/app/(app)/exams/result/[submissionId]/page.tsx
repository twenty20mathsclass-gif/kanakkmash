
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { ExamSubmission, Exam } from '@/lib/definitions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, 
    ArrowLeft, 
    Home, 
    Trophy, 
    CheckCircle2, 
    XCircle, 
    ClipboardList, 
    Target, 
    Zap,
    Info,
    HelpCircle,
    TrendingUp,
    MinusCircle
} from 'lucide-react';
import { Reveal } from '@/components/shared/reveal';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

type PageProps = {
  params: {
    submissionId: string;
  };
};

const StatHeaderItem = ({ icon: Icon, value, label, color }: { icon: any, value: string | number, label: string, color: string }) => (
    <div className="flex flex-col items-center text-center">
        <div className="flex items-center gap-2 mb-1">
            <Icon className={cn("h-5 w-5", color)} />
            <span className="text-xl font-bold text-foreground">{value}</span>
        </div>
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{label}</span>
    </div>
);

function ResultDisplay({ submission, exam }: { submission: ExamSubmission, exam: Exam | null }) {
    const router = useRouter();
    
    const stats = useMemo(() => {
        const isMcq = submission.examType === 'mcq';
        const score = submission.score ?? 0;
        const total = isMcq ? (submission.totalQuestions ?? 1) : (submission.totalMarks ?? 1);
        const accuracy = Math.round((score / total) * 100);
        
        return {
            isMcq,
            score,
            total,
            accuracy,
            wrong: isMcq ? (submission.totalQuestions || 0) - score : 0
        };
    }, [submission]);

    const difficultyBlocks = Array.from({ length: 10 });

    return (
        <div className="min-h-screen bg-[#FDFDFD] pb-20 -m-4 md:-m-6 lg:-m-8">
            <header className="bg-background border-b px-4 py-4 sticky top-0 z-20 shadow-sm">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.push('/my-results')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="font-headline font-bold text-lg">Exam Result</h1>
                    <div className="w-10" />
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
                {/* Main Score Card */}
                <Reveal>
                    <Card className="border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                        <CardContent className="p-6 space-y-8">
                            {/* Top Stats Row */}
                            <div className="grid grid-cols-3 gap-4">
                                <StatHeaderItem 
                                    icon={ClipboardList} 
                                    value={stats.total} 
                                    label="Total questions" 
                                    color="text-green-600" 
                                />
                                <StatHeaderItem 
                                    icon={CheckCircle2} 
                                    value={stats.score} 
                                    label="Right answers" 
                                    color="text-blue-600" 
                                />
                                <StatHeaderItem 
                                    icon={Target} 
                                    value={`${stats.accuracy}%`} 
                                    label="Accuracy" 
                                    color="text-red-500" 
                                />
                            </div>

                            {/* Progress Bar Section */}
                            <div className="relative h-16 w-full bg-green-50 rounded-2xl overflow-hidden flex items-center">
                                <div 
                                    className="absolute left-0 top-0 h-full bg-green-500 transition-all duration-1000 ease-out"
                                    style={{ width: `${stats.accuracy}%` }}
                                />
                                <div className="relative z-10 flex justify-between w-full items-center px-6">
                                    <span className="text-xl font-bold text-white">{stats.accuracy}%</span>
                                    <span className="text-sm font-bold text-green-700">Your Grade</span>
                                </div>
                            </div>

                            {/* Bottom Footer Row */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Trophy className="h-4 w-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Avg. Grade</span>
                                </div>
                                <p className="text-xs font-medium text-slate-500">
                                    You're <span className="text-indigo-600 font-bold">above 42%</span> of other students
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </Reveal>

                {/* Rating Section */}
                <Reveal delay={0.1}>
                    <Card className="border border-slate-100 shadow-sm rounded-3xl">
                        <CardContent className="p-6">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="space-y-1 text-center sm:text-left">
                                    <div className="flex items-center justify-center sm:justify-start gap-2">
                                        <h3 className="font-bold text-sm">Rate exam</h3>
                                        <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-tight max-w-[220px]">
                                        Share your thoughts on the exam so other students can be helped
                                    </p>
                                </div>
                                <div className="flex flex-col items-center sm:items-end gap-2">
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-none text-[10px] font-bold px-3 py-1 rounded-full">Easy</Badge>
                                    <div className="flex gap-1">
                                        {difficultyBlocks.map((_, i) => (
                                            <div 
                                                key={i} 
                                                className={cn(
                                                    "h-4 w-4 rounded-md",
                                                    i < 4 ? "bg-green-500" : (i < 7 ? "bg-amber-400" : "bg-red-500")
                                                )} 
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Reveal>

                {/* Analysis Section */}
                <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-2 px-1">
                        <TrendingUp className="h-5 w-5 text-red-500" />
                        <h2 className="font-headline font-bold text-slate-700">You lost marks here</h2>
                    </div>

                    {stats.isMcq && exam ? (
                        <div className="space-y-4">
                            {exam.questions?.map((question, qIndex) => {
                                const studentAnswerIndex = submission.answers?.[qIndex];
                                const isCorrect = studentAnswerIndex === question.correctAnswerIndex;
                                
                                if (isCorrect) return null;

                                return (
                                    <Reveal key={qIndex} delay={0.2 + (qIndex * 0.05)}>
                                        <Card className="border border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white">
                                            <CardContent className="p-6 space-y-6">
                                                <div className="space-y-2">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Question {qIndex + 1}</p>
                                                    <p className="font-semibold text-slate-800 leading-relaxed">
                                                        {question.questionText}
                                                    </p>
                                                </div>

                                                <div className="space-y-4">
                                                    <div>
                                                        <p className="text-[11px] font-bold uppercase text-slate-800 mb-2">Your Answer</p>
                                                        <p className="text-sm text-slate-500">
                                                            {studentAnswerIndex !== undefined && studentAnswerIndex !== -1 
                                                                ? question.options[studentAnswerIndex]?.text 
                                                                : "No answer provided"}
                                                        </p>
                                                    </div>

                                                    <div className="space-y-3 pt-2">
                                                        <p className="text-[11px] font-bold uppercase text-slate-800">Your feedback</p>
                                                        <div className="space-y-2">
                                                            <div className="flex items-start gap-3">
                                                                <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                                                                <p className="text-sm text-slate-500">The selected option is incorrect.</p>
                                                            </div>
                                                            <div className="flex items-start gap-3">
                                                                <Info className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />
                                                                <p className="text-sm text-slate-500">
                                                                    Correct answer: <span className="font-bold text-green-600">{question.options[question.correctAnswerIndex]?.text}</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Reveal>
                                );
                            })}
                        </div>
                    ) : (
                        submission.examType === 'descriptive' && (
                            <Reveal delay={0.2}>
                                <Card className="border border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white">
                                    <CardContent className="p-6 space-y-6">
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-[11px] font-bold uppercase text-slate-800 mb-3 tracking-widest">Tutor Assessment</p>
                                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                                    <p className="text-sm text-slate-600 leading-relaxed">
                                                        {submission.feedback || "Assessment is in progress. Your teacher will provide detailed feedback soon."}
                                                    </p>
                                                </div>
                                            </div>

                                            {submission.status === 'reviewed' && (
                                                <div className="space-y-3 pt-2">
                                                    <p className="text-[11px] font-bold uppercase text-slate-800 tracking-widest">Your feedback</p>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-3">
                                                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                                            <p className="text-sm text-slate-500">Points awarded: <span className="font-bold">{submission.score} / {submission.totalMarks}</span></p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <MinusCircle className="h-4 w-4 text-slate-300 shrink-0" />
                                                            <p className="text-sm text-slate-500">Follow teacher tips to gain full marks next time.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </Reveal>
                        )
                    )}
                </div>

                {/* Footer Actions */}
                <div className="pt-8 flex flex-col gap-3">
                    <Button asChild size="lg" className="rounded-2xl font-bold h-14 text-lg shadow-xl shadow-primary/20">
                        <Link href="/dashboard"><Home className="mr-2 h-5 w-5" /> Back to Dashboard</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="rounded-2xl font-bold h-14 border-slate-200 text-slate-600 bg-white">
                        <Link href="/my-results"><Trophy className="mr-2 h-5 w-5" /> View All Results</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function ExamResultPage({ params }: PageProps) {
  const { firestore } = useFirebase();
  const router = useRouter();
  const { submissionId } = params;

  const [submission, setSubmission] = useState<ExamSubmission | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firestore || !submissionId) return;

    const [userId, examId] = submissionId.split('_');

    if (!userId || !examId) {
      setError('Invalid submission ID.');
      setLoading(false);
      return;
    }
    
    const fetchResults = async () => {
      try {
        const submissionRef = doc(firestore, 'exams', examId, 'submissions', userId);
        const submissionSnap = await getDoc(submissionRef);

        if (submissionSnap.exists()) {
          const submissionData = { id: submissionSnap.id, ...submissionSnap.data() } as ExamSubmission;
          setSubmission(submissionData);

          const examRef = doc(firestore, 'exams', submissionData.examId);
          const examSnap = await getDoc(examRef);
          if (examSnap.exists()) {
            setExam({ id: examSnap.id, ...examSnap.data() } as Exam);
          }
        } else {
          setError('Exam submission not found.');
        }
      } catch (err: any) {
        if (err.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({ path: `exams/${examId}/submissions/${userId}`, operation: 'get' }, { cause: err });
            errorEmitter.emit('permission-error', permissionError);
            setError('You do not have permission to view these results.');
        } else {
          setError('Failed to load results.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [firestore, submissionId]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-sm font-bold text-slate-400 uppercase tracking-widest">Generating Analysis...</p>
      </div>
    );
  }

  if (error || !submission) {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
            <Card className="max-w-md w-full border-none shadow-2xl p-8 text-center space-y-6">
                <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                    <XCircle className="h-10 w-10 text-red-500" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-headline font-bold text-slate-800">Something went wrong</h2>
                    <p className="text-slate-500 text-sm">{error || 'No submission data found.'}</p>
                </div>
                <Button onClick={() => router.push('/my-results')} className="w-full h-12 rounded-xl">Go to My Results</Button>
            </Card>
        </div>
    );
  }

  return <ResultDisplay submission={submission} exam={exam} />;
}

export const dynamic = 'force-dynamic';
