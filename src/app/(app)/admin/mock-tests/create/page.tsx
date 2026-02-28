
'use client';

import { CreateExamForm } from '@/components/teacher/create-exam-form';
import { Reveal } from '@/components/shared/reveal';

export const dynamic = 'force-dynamic';

export default function AdminMockTestCreatePage() {
  return (
    <div className="space-y-8">
      <Reveal>
        <div>
          <h1 className="text-3xl font-bold font-headline">Mock Test Creator</h1>
          <p className="text-muted-foreground">Build and schedule custom mock tests for students.</p>
        </div>
      </Reveal>
      <Reveal delay={0.2}>
        <CreateExamForm />
      </Reveal>
    </div>
  );
}
