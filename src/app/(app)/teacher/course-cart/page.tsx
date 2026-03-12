
'use client';

import { useFirebase } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { ManageCategories } from '@/components/shared/manage-course-categories';

export default function TeacherCourseCartPage() {
    const { firestore } = useFirebase();

    if (!firestore) {
        return (
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Course Category Management</h1>
                    <p className="text-muted-foreground">Manage course categories for the student's cart page.</p>
                </div>
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </div>
        )
    }

  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold font-headline">Course Category Management</h1>
            <p className="text-muted-foreground">Manage course categories for the student's cart page.</p>
        </div>

        <ManageCategories firestore={firestore} />
    </div>
  );
}
