
'use client';

import { Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateExamForm } from '@/components/teacher/create-exam-form';
import { ExamSubmissionsList } from '@/components/teacher/exam-submissions-list';
import { Reveal } from '@/components/shared/reveal';
import { Loader2, FilePenLine, Inbox, History } from 'lucide-react';
import { ScheduledItemsList } from '@/components/teacher/scheduled-items-list';
import { useFirebase, useUser } from '@/firebase';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import type { Schedule } from '@/lib/definitions';

export default function ExamManagementPage() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const [exams, setExams] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore || !user) return;
        
        const q = query(
            collection(firestore, 'schedules'), 
            where('teacherId', '==', user.id),
            where('type', '==', 'exam')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule))
                .sort((a, b) => b.date.toMillis() - a.date.toMillis());
            setExams(list);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, user]);

    return (
        <div className="space-y-8 pb-12">
            <Reveal>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">Exam Management</h1>
                        <p className="text-muted-foreground">Monitor schedules, review student answers, and create new assessments.</p>
                    </div>
                </div>
            </Reveal>

            <Tabs defaultValue="overview" className="space-y-6">
                <Reveal delay={0.1}>
                    <TabsList className="bg-muted/50 p-1">
                        <TabsTrigger value="overview" className="gap-2">
                            <History className="h-4 w-4" />
                            Recent Exams
                        </TabsTrigger>
                        <TabsTrigger value="submissions" className="gap-2">
                            <Inbox className="h-4 w-4" />
                            Submissions
                        </TabsTrigger>
                    </TabsList>
                </Reveal>

                <TabsContent value="overview">
                    <Reveal delay={0.2}>
                        {loading ? (
                            <div className="flex justify-center p-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2">
                                     <ScheduledItemsList 
                                        schedules={exams} 
                                        title="Exam History" 
                                        description="Summary of all scheduled and completed exams." 
                                    />
                                </div>
                                <div className="space-y-6">
                                    <div className="p-6 rounded-3xl border bg-primary/5 space-y-2">
                                        <h3 className="font-bold text-lg">Quick Stats</h3>
                                        <div className="grid grid-cols-2 gap-4 pt-4">
                                            <div className="space-y-1">
                                                <p className="text-sm text-muted-foreground font-medium">Total Exams</p>
                                                <p className="text-3xl font-bold">{exams.length}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm text-muted-foreground font-medium">Pending Grade</p>
                                                <p className="text-3xl font-bold text-orange-500">...</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Reveal>
                </TabsContent>

                <TabsContent value="submissions">
                    <Reveal delay={0.2}>
                        <ExamSubmissionsList />
                    </Reveal>
                </TabsContent>


            </Tabs>
        </div>
    );
}
