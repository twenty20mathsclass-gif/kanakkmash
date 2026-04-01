'use client';

import { Suspense } from 'react';
import { EditHomeworkForm } from '../../../../../../components/teacher/edit-homework-form';
import { Reveal } from '@/components/shared/reveal';
import { useParams } from 'next/navigation';

export default function EditHomeworkPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="space-y-8">
      <Reveal>
        <div>
          <h1 className="text-3xl font-bold font-headline">Edit Homework</h1>
          <p className="text-muted-foreground">Modify details for your scheduled homework task.</p>
        </div>
      </Reveal>
      <Reveal delay={0.2}>
        <EditHomeworkForm scheduleId={id} />
      </Reveal>
    </div>
  );
}
