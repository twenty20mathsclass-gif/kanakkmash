
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase';
import type { Exam, Schedule, User } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { ExamInterface } from '@/components/student/exam-interface';
import { Reveal } from '@/components/shared/reveal';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type PageProps = {
  params: {
    examId: string;
  };
};

export default function TakeExamPage({ params }: PageProps) {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const router = useRouter();
  const { examId } = params;

  const [exam, setExam] = useState<Exam | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [status, setStatus] = useState<'loading' | 'already_taken' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firestore || !examId || !user) {
        // If user is loading, keep status as 'loading'
        if (!user) return;
    }

    const checkSubmissionAndFetchExam = async () => {
      try {
        // 1. Check if a submission already exists
        const submissionRef = doc(firestore, 'exams', examId, 'submissions', user.id);
        const submissionSnap = await getDoc(submissionRef);

        if (submissionSnap.exists()) {
          setStatus('already_taken');
          router.replace(`/exams/result/${user.id}_${examId}`);
          return;
        }

        // 2. If no submission, fetch the exam data
        const examRef = doc(firestore, 'exams', examId);
        const examSnap = await getDoc(examRef);

        if (examSnap.exists()) {
          setExam({ id: examSnap.id, ...examSnap.data() } as Exam);
        } else {
          setError('Exam not found.');
          setStatus('error');
          return;
        }

        // 3. Fetch schedule for duration
        const scheduleQuery = query(collection(firestore, 'schedules'), where('examId', '==', examId));
        const scheduleSnap = await getDocs(scheduleQuery);

        if (!scheduleSnap.empty) {
          const scheduleData = scheduleSnap.docs[0].data() as Schedule;
          setSchedule({id: scheduleSnap.docs[0].id, ...scheduleData});
        }
        
        setStatus('ready');

      } catch (err: any) {
        if (err.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError(
                { path: `exams/${examId}/submissions/${user.id} or /exams/${examId} or /schedules`, operation: 'get' },
                { cause: err }
            );
            errorEmitter.emit('permission-error', permissionError);
            setError('You do not have permission to access this exam.');
        } else {
          console.warn('Error fetching exam data:', err);
          setError('Failed to load the exam. Please try again.');
        }
        setStatus('error');
      }
    };

    checkSubmissionAndFetchExam();
  }, [firestore, examId, user, router]);

  const renderContent = () => {
    switch (status) {
        case 'loading':
            return (
                <div className="flex flex-col justify-center items-center h-64 gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">Checking exam status...</p>
                </div>
            );
        case 'already_taken':
            return (
                <div className="flex flex-col justify-center items-center h-64 gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">You have already completed this exam. Redirecting to your results...</p>
                </div>
            );
        case 'error':
             return (
                <Card className="border-destructive">
                    <CardHeader><CardTitle>Error</CardTitle></CardHeader>
                    <CardContent><p className="text-destructive">{error}</p></CardContent>
                </Card>
            );
        case 'ready':
            if (exam && user) {
                return (
                    <Reveal>
                        <ExamInterface exam={exam} schedule={schedule} user={user} />
                    </Reveal>
                );
            }
            // fallthrough
        default:
             return (
                <Card>
                    <CardContent className='p-8 text-center text-muted-foreground'>
                        Could not load exam.
                    </CardContent>
                </Card>
            );
    }
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      {renderContent()}
    </div>
  );
}

export const dynamic = 'force-dynamic';
