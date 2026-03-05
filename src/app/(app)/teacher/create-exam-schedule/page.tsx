
'use client';

import { CreateExamForm } from '@/components/teacher/create-exam-form';

export const dynamic = 'force-dynamic';

export default function CreateExamSchedulePage() {
  return (
    <div className="space-y-8">
        <div>
        <h1 className="text-3xl font-bold font-headline">Create a New Exam</h1>
        <p className="text-muted-foreground">Build and schedule a new multiple-choice exam for your students.</p>
        </div>

        <CreateExamForm />
    </div>
  );
}
