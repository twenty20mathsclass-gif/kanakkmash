
'use client';

import { RecordedClassManager } from '@/components/shared/recorded-class-manager';

export default function AdminRecordedClassesPage() {
  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold font-headline">Manage Recorded Classes</h1>
            <p className="text-muted-foreground">Add, edit, or remove recorded classes for all teachers.</p>
        </div>
        <RecordedClassManager isAdmin={true} />
    </div>
  );
}
