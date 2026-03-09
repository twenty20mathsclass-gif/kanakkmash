
'use client';

import { RecordedClassManager } from '@/components/shared/recorded-class-manager';

export default function TeacherRecordedClassesPage() {
  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold font-headline">My Recorded Classes</h1>
            <p className="text-muted-foreground">Upload and manage your recorded class videos.</p>
        </div>
        <RecordedClassManager isAdmin={false} />
    </div>
  );
}
