
'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { ExamSubmission, Exam } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, FileText, ArrowLeft, RefreshCw, FileSearch, Share2, FileDown, Home, Trophy, Hourglass } from 'lucide-react';
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

const StatItem = ({ color, value, label }: { color: string, value: string | number, label: string }) => (
    <div className="flex flex-col items-center">
        <div className="flex items-center gap-2">
            <div className={cn("h-2.5 w-2.5 rounded-full", color)} />
            <p className="text-sm font-semibold">{value}</p>
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
    </div>
);

const ActionButton = ({ icon: Icon, label, href, onClick, disabled }: { icon: React.ElementType, label: string, href?: string, onClick?: () => void, disabled?: boolean }) => {
    const content = (
        <div className="flex flex-col items-center gap-2">
            <Button
                variant="secondary"
                size="icon"
                className="h-16 w-16 rounded-full bg-primary/10 text-primary shadow-lg hover:bg-primary/20 disabled:bg-muted"
                onClick={onClick}
                disabled={disabled}
            >
                <Icon className="h-7 w-7" />
            </Button>
            <p className="text-xs font-semibold text-foreground/80">{label}</p>
        </div>
    );

    if (href && !disabled) {
        return <Link href={href}>{content}</Link>;
    }

    return content;
};

function ResultDisplay({ submission, exam }: { submission: ExamSubmission, exam: Exam | null }) {
    const router = useRouter();
    const isMcq = submission.examType === 'mcq';

    // --- Data for MCQ ---
    const score = submission.score ?? 0;
    const totalQuestions = submission.totalQuestions ?? 1;
    const points = score * 10;
    const wrongAnswers = totalQuestions > score ? totalQuestions - score : 0;

    // --- Data for Descriptive ---
    const isReviewed = submission.status === 'reviewed';

    const handleReviewClick = () => {
        const element = document.getElementById('review-section');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };
    
    return (
        <div className="bg-gradient-to-b from-[#8E63E5] to-[#6A3BBC] min-h-[100svh] text-white -m-4 md:-m-6 lg:-m-8 p-4 font-body flex flex-col">
            <div className="max-w-sm mx-auto w-full flex-grow flex flex-col">
                <header className="relative flex items-center justify-center mb-6 pt-4">
                    <Button variant="ghost" size="icon" className="absolute left-0 text-white hover:bg-white/10 rounded-full" onClick={() => router.push('/my-results')}>
                        <ArrowLeft />
                    </Button>
                    <h1 className="text-lg font-bold">Result</h1>
                </header>

                <div className="flex-grow flex flex-col justify-center">
                    <div className="relative flex items-center justify-center w-48 h-48 mx-auto my-8">
                        <div className="absolute inset-0 rounded-full bg-white/5" />
                        <div className="absolute inset-2 rounded-full bg-white/10" />
                        <div className="relative flex flex-col items-center justify-center w-40 h-40 rounded-full bg-white/20 shadow-inner">
                            {isMcq ? (
                                <>
                                    <p className="text-sm">Your Score</p>
                                    <p className="text-5xl font-bold font-headline">{points}<span className="text-3xl">pt</span></p>
                                </>
                            ) : (
                                <>
                                    {isReviewed ? (
                                        <>
                                            <p className="text-sm">Marks</p>
                                            <p className="text-4xl font-bold font-headline">{submission.score ?? 0}<span className="text-2xl">/{submission.totalMarks}</span></p>
                                        </>
                                    ) : (
                                        <div className="text-center">
                                            <Hourglass className="h-8 w-8 mx-auto mb-2 opacity-80" />
                                            <p className="text-xl font-bold font-headline">Pending</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <Card className="bg-white/95 text-card-foreground backdrop-blur-sm">
                        <CardContent className="p-4">
                            {isMcq ? (
                                <div className="grid grid-cols-4 gap-y-4 text-center">
                                    <StatItem color="bg-blue-500" value="100%" label="Completion" />
                                    <StatItem color="bg-gray-400" value={totalQuestions} label="Total" />
                                    <StatItem color="bg-green-500" value={score} label="Correct" />
                                    <StatItem color="bg-red-500" value={wrongAnswers} label="Wrong" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-y-4 text-center">
                                    <div>
                                        <p className="font-bold text-lg capitalize">{submission.status}</p>
                                        <p className="text-xs text-muted-foreground">Status</p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg">{submission.totalMarks}</p>
                                        <p className="text-xs text-muted-foreground">Total Marks</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                        <ActionButton icon={FileSearch} label="Review" onClick={handleReviewClick} disabled={!isMcq && !isReviewed} />
                        <ActionButton icon={Home} label="Home" href="/dashboard" />
                        <ActionButton icon={Trophy} label="Results" href="/my-results" />
                    </div>
                </div>
            </div>

            {isMcq && exam && (
                <div className="max-w-4xl mx-auto mt-8 w-full">
                    <Card id="review-section">
                        <CardHeader><CardTitle>Detailed Analysis</CardTitle><CardDescription>Review your answers for each question.</CardDescription></CardHeader>
                        <CardContent className="space-y-6">
                            {exam.questions?.map((question, qIndex) => {
                                const studentAnswerIndex = submission.answers?.[qIndex];
                                const correctAnswerIndex = question.correctAnswerIndex;
                                const isCorrect = studentAnswerIndex === correctAnswerIndex;
                                return (
                                    <div key={qIndex}>
                                        <div className="flex justify-between items-start">
                                            <p className="font-semibold">{qIndex + 1}. {question.questionText}</p>
                                            {isCorrect ? <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 ml-4" /> : <XCircle className="h-6 w-6 text-destructive flex-shrink-0 ml-4" />}
                                        </div>
                                        <div className="mt-4 space-y-2 pl-6">
                                            {question.options.map((option, oIndex) => {
                                                const isStudentAnswer = oIndex === studentAnswerIndex;
                                                const isCorrectAnswer = oIndex === correctAnswerIndex;
                                                return (
                                                    <div key={oIndex} className={cn('p-3 rounded-md border text-sm', isCorrectAnswer ? 'bg-green-500/10 border-green-500/50 text-green-800 dark:text-green-300' : (isStudentAnswer ? 'bg-destructive/10 border-destructive/50 text-destructive' : ''))}>
                                                        <p>{option.text}{isCorrectAnswer && <span className="font-semibold ml-2">(Correct Answer)</span>}{!isCorrectAnswer && isStudentAnswer && <span className="font-semibold ml-2">(Your Answer)</span>}</p>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        {qIndex < exam.questions!.length - 1 && <Separator className="mt-6" />}
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>
                </div>
            )}
            {submission.examType === 'descriptive' && isReviewed && (
                <div className="max-w-4xl mx-auto mt-8 w-full" id="review-section">
                    <Card>
                        <CardHeader><CardTitle>Review Details</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h3 className="font-semibold">Your Submission</h3>
                                {submission.answerFileUrl ? (
                                    <Button asChild variant="outline">
                                        <a href={submission.answerFileUrl} target="_blank" rel="noopener noreferrer">
                                            <FileText className="mr-2 h-4 w-4" /> View Your Answer Sheet
                                        </a>
                                    </Button>
                                ) : (
                                    <p className="text-muted-foreground">No answer file was submitted.</p>
                                )}
                            </div>
                            {submission.feedback && (
                                <div>
                                    <h3 className="font-semibold">Teacher's Feedback</h3>
                                    <p className="prose dark:prose-invert mt-2">{submission.feedback}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}


export default function ExamResultPage({ params }: PageProps) {
  const { firestore } = useFirebase();
  const router = useRouter();
  const resolvedParams = use(params as Promise<{ submissionId: string }>);
  const { submissionId } = resolvedParams;

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
          } else if (submissionData.examType === 'mcq') {
            setError('Could not load the original exam for analysis.');
          }
        } else {
          setError('Exam submission not found.');
        }
      } catch (err: any) {
        if (err.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({ path: `exams/{examId}/submissions/{userId} or /exams/{examId}`, operation: 'get' }, { cause: err });
            errorEmitter.emit('permission-error', permissionError);
            setError('You do not have permission to view these results.');
        } else {
          console.warn('Error fetching results:', err);
          setError('Failed to load your results. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [firestore, submissionId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-background -m-4 md:-m-6 lg:-m-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-4 text-muted-foreground">Loading your results...</p>
      </div>
    );
  }

  if (error || !submission) {
    return (
        <div className="min-h-screen flex items-center justify-center -m-4 md:-m-6 lg:-m-8">
            <Reveal>
                <Card className="border-destructive max-w-lg mx-auto">
                    <CardHeader><CardTitle>Error</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-destructive">{error || 'No submission data found.'}</p>
                        <Button onClick={() => router.push('/my-results')} className="mt-4">Go to My Results</Button>
                    </CardContent>
                </Card>
            </Reveal>
        </div>
    );
  }

  return <ResultDisplay submission={submission} exam={exam} />;
}

export const dynamic = 'force-dynamic';
