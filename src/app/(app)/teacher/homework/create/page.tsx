
'use client';

import { CreateHomeworkForm } from '@/components/teacher/create-homework-form';
import { Reveal } from '@/components/shared/reveal';

export const dynamic = 'force-dynamic';

export default function CreateHomeworkPage() {
  return (
    <div className="space-y-8">
      <Reveal>
        <div>
          <h1 className="text-3xl font-bold font-headline">Create Homework</h1>
          <p className="text-muted-foreground">Build and schedule custom homework tasks for your students.</p>
        </div>
      </Reveal>
      <Reveal delay={0.2}>
        <CreateHomeworkForm />
      </Reveal>
    </div>
  );
}
