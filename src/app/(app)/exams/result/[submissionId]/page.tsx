'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { ExamSubmission, Exam } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Award } from 'lucide-react';
import { Reveal } from '@/components/shared/reveal';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

type PageProps = {
  params: {
    submissionId: string;
  };
};

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
        // 1. Fetch the submission
        const submissionRef = doc(firestore, 'exams', examId, 'submissions', userId);
        const submissionSnap = await getDoc(submissionRef);

        if (submissionSnap.exists()) {
          const submissionData = { id: submissionSnap.id, ...submissionSnap.data() } as ExamSubmission;
          setSubmission(submissionData);

          // 2. Fetch the original exam for question details
          const examRef = doc(firestore, 'exams', submissionData.examId);
          const examSnap = await getDoc(examRef);
          if (examSnap.exists()) {
            setExam({ id: examSnap.id, ...examSnap.data() } as Exam);
          } else {
            setError('Could not load the original exam questions for analysis.');
          }
        } else {
          setError('Exam submission not found.');
        }
      } catch (err) {
        console.error('Error fetching results:', err);
        setError('Failed to load your results. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [firestore, submissionId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading your results...</p>
      </div>
    );
  }

  if (error) {
    return (
        <Reveal>
            <Card className="border-destructive max-w-2xl mx-auto">
                <CardHeader><CardTitle>Error</CardTitle></CardHeader>
                <CardContent><p className="text-destructive">{error}</p></CardContent>
            </Card>
        </Reveal>
    );
  }
  
  if (!submission) {
    return (
        <Reveal>
             <Card className="max-w-2xl mx-auto">
                <CardContent className='p-8 text-center text-muted-foreground'>
                    No submission data found.
                </CardContent>
             </Card>
        </Reveal>
    )
  }

  const percentage = Math.round((submission.score / submission.totalQuestions) * 100);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
        <Reveal>
            <Card>
                <CardHeader className="text-center">
                    <Award className="h-16 w-16 mx-auto text-primary" />
                    <CardTitle className="font-headline text-4xl mt-4">Exam Complete!</CardTitle>
                    <CardDescription className="text-lg">{submission.examTitle}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex justify-around text-center p-6 bg-muted rounded-lg">
                        <div>
                            <p className="text-sm text-muted-foreground">Your Score</p>
                            <p className="text-4xl font-bold text-primary">{submission.score} / {submission.totalQuestions}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Percentage</p>
                            <p className="text-4xl font-bold text-primary">{percentage}%</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-lg">
                            <span className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /> Correct Answers</span>
                            <span className="font-bold">{submission.score}</span>
                        </div>
                        <div className="flex justify-between items-center text-lg">
                            <span className="flex items-center gap-2"><XCircle className="h-5 w-5 text-destructive" /> Incorrect Answers</span>
                            <span className="font-bold">{submission.totalQuestions - submission.score}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Reveal>

        {exam && (
            <Reveal delay={0.2}>
                <Card>
                    <CardHeader>
                        <CardTitle>Detailed Analysis</CardTitle>
                        <CardDescription>Review your answers for each question.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {exam.questions.map((question, qIndex) => {
                            const studentAnswerIndex = submission.answers[qIndex];
                            const correctAnswerIndex = question.correctAnswerIndex;
                            const isCorrect = studentAnswerIndex === correctAnswerIndex;

                            return (
                                <div key={qIndex}>
                                    <div className="flex justify-between items-start">
                                        <p className="font-semibold">{qIndex + 1}. {question.questionText}</p>
                                        {isCorrect 
                                            ? <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 ml-4" /> 
                                            : <XCircle className="h-6 w-6 text-destructive flex-shrink-0 ml-4" />}
                                    </div>
                                    <div className="mt-4 space-y-2 pl-6">
                                        {question.options.map((option, oIndex) => {
                                            const isStudentAnswer = oIndex === studentAnswerIndex;
                                            const isCorrectAnswer = oIndex === correctAnswerIndex;
                                            
                                            return (
                                                <div key={oIndex} className={cn(
                                                    'p-3 rounded-md border text-sm',
                                                    isCorrectAnswer && 'bg-green-500/10 border-green-500/50 text-green-800 dark:text-green-300',
                                                    !isCorrectAnswer && isStudentAnswer && 'bg-destructive/10 border-destructive/50 text-destructive',
                                                )}>
                                                    <p>
                                                        {option.text}
                                                        {isCorrectAnswer && <span className="font-semibold ml-2">(Correct Answer)</span>}
                                                        {!isCorrectAnswer && isStudentAnswer && <span className="font-semibold ml-2">(Your Answer)</span>}
                                                    </p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    {qIndex < exam.questions.length - 1 && <Separator className="mt-6" />}
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            </Reveal>
        )}

        <div className="text-center pt-4">
            <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
        </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
