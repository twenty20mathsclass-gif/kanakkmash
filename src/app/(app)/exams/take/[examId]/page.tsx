
'use client';

import { useEffect, useState, use } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase';
import type { Exam, Schedule } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { ExamInterface } from '@/components/student/exam-interface';
import { Reveal } from '@/components/shared/reveal';

type PageProps = {
  params: {
    examId: string;
  };
};

export default function TakeExamPage({ params }: PageProps) {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const resolvedParams = use(params as Promise<{ examId: string }>);
  const { examId } = resolvedParams;

  const [exam, setExam] = useState<Exam | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firestore || !examId) return;

    const fetchExamAndSchedule = async () => {
      try {
        // Fetch Exam
        const examRef = doc(firestore, 'exams', examId);
        const examSnap = await getDoc(examRef);

        if (examSnap.exists()) {
          setExam({ id: examSnap.id, ...examSnap.data() } as Exam);
        } else {
          setError('Exam not found.');
          setLoading(false);
          return;
        }

        // Fetch Schedule to get duration
        const scheduleQuery = query(collection(firestore, 'schedules'), where('examId', '==', examId));
        const scheduleSnap = await getDocs(scheduleQuery);

        if (!scheduleSnap.empty) {
          const scheduleData = scheduleSnap.docs[0].data() as Schedule;
          setSchedule({id: scheduleSnap.docs[0].id, ...scheduleData});
        } else {
          // This case might happen if an admin is viewing an exam that isn't scheduled.
          // For a student taking an exam, a schedule should always exist.
          // We can proceed without schedule and the interface can use a default duration if needed.
        }
      } catch (err) {
        console.error('Error fetching exam data:', err);
        setError('Failed to load the exam. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchExamAndSchedule();
  }, [firestore, examId]);

  return (
    <div className="container mx-auto max-w-4xl py-8">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : exam && user ? (
        <Reveal>
            <ExamInterface exam={exam} schedule={schedule} user={user} />
        </Reveal>
      ) : (
          <Card>
              <CardContent className='p-8 text-center text-muted-foreground'>
                  Could not load exam or user not found.
              </CardContent>
          </Card>
      )}
    </div>
  );
}

export const dynamic = 'force-dynamic';
