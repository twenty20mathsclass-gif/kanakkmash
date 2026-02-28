'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { ExamSubmission } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Award } from 'lucide-react';
import { Reveal } from '@/components/shared/reveal';

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
    
    const fetchSubmission = async () => {
      try {
        const submissionRef = doc(firestore, 'exams', examId, 'submissions', userId);
        const submissionSnap = await getDoc(submissionRef);

        if (submissionSnap.exists()) {
          setSubmission({ id: submissionSnap.id, ...submissionSnap.data() } as ExamSubmission);
        } else {
          setError('Exam submission not found.');
        }
      } catch (err) {
        console.error('Error fetching submission:', err);
        setError('Failed to load your results. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSubmission();
  }, [firestore, submissionId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
    <Reveal>
        <Card className="max-w-2xl mx-auto">
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
                <div className="text-center pt-4">
                    <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
                </div>
            </CardContent>
        </Card>
    </Reveal>
  );
}

export const dynamic = 'force-dynamic';
