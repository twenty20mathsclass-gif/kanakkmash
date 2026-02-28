
'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { Exam } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Reveal } from '@/components/shared/reveal';

type PageProps = {
  params: {
    examId: string;
  };
};

export default function TakeExamPage({ params }: PageProps) {
  const { firestore } = useFirebase();
  const { examId } = params;
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firestore || !examId) return;

    const fetchExam = async () => {
      try {
        const examRef = doc(firestore, 'exams', examId);
        const examSnap = await getDoc(examRef);

        if (examSnap.exists()) {
          setExam({ id: examSnap.id, ...examSnap.data() } as Exam);
        } else {
          setError('Exam not found.');
        }
      } catch (err) {
        console.error('Error fetching exam:', err);
        setError('Failed to load the exam. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
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
      ) : exam ? (
        <Reveal>
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-3xl">{exam.title}</CardTitle>
              <CardDescription>The exam-taking interface is under construction.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                This is where the exam questions, options, and countdown timer will be displayed. Functionality to answer questions and submit the exam is coming soon!
              </div>
            </CardContent>
          </Card>
        </Reveal>
      ) : null}
    </div>
  );
}

export const dynamic = 'force-dynamic';
