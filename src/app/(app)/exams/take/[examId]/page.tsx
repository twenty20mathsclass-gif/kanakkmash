
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase';
import type { Exam, Schedule, User } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { ExamInterface } from '@/components/student/exam-interface';
import { Reveal } from '@/components/shared/reveal';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { format } from 'date-fns';

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

        // 3. Fetch schedule for duration & timeframe
        const scheduleQuery = query(collection(firestore, 'schedules'), where('examId', '==', examId));
        const scheduleSnap = await getDocs(scheduleQuery);

        let currentSchedule: Schedule | null = null;
        if (!scheduleSnap.empty) {
          const scheduleData = scheduleSnap.docs[0].data() as Schedule;
          currentSchedule = {id: scheduleSnap.docs[0].id, ...scheduleData};
          setSchedule(currentSchedule);
        }

        // 4. Timeframe Access Control
        if (currentSchedule) {
            const now = Timestamp.now().toMillis();
            const startMillis = currentSchedule.startDate?.toMillis() || 0;
            const endMillis = currentSchedule.endDate?.toMillis() || Infinity;

            if (now < startMillis) {
                setError(`Exam session hasn't started yet. Entry permitted at: ${format(currentSchedule.startDate!.toDate(), 'PPP p')}`);
                setStatus('error');
                return;
            }

            if (now > endMillis) {
                setError('The access period for this exam has expired.');
                setStatus('error');
                return;
            }
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
                    <p className="text-muted-foreground">Checking authentication status...</p>
                </div>
            );
        case 'already_taken':
            return (
                <div className="flex flex-col justify-center items-center h-64 gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">Session already recorded. Syncing results...</p>
                </div>
            );
        case 'error':
             return (
                <Card className="border-destructive shadow-xl rounded-[2rem] overflow-hidden">
                    <CardHeader className="bg-destructive/5 p-8">
                        <CardTitle className="text-destructive text-2xl font-black">Access Restricted</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                        <p className="text-muted-foreground font-medium text-lg leading-relaxed">{error}</p>
                        <Button onClick={() => router.push('/exam-schedule')} variant="outline" className="mt-8 rounded-full h-12 px-8 border-2">Return to Dashboard</Button>
                    </CardContent>
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
        default:
             return (
                <Card className="rounded-[2rem] shadow-sm">
                    <CardContent className='p-12 text-center text-muted-foreground font-medium'>
                        Initialization failed. Please refresh your session.
                    </CardContent>
                </Card>
            );
    }
  }

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      {renderContent()}
    </div>
  );
}

export const dynamic = 'force-dynamic';
