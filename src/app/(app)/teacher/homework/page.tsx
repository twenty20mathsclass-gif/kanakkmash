
'use client';

import { Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Reveal } from '@/components/shared/reveal';
import { Loader2, Inbox, History } from 'lucide-react';
import { ScheduledItemsList } from '@/components/teacher/scheduled-items-list';
import { useFirebase, useUser } from '@/firebase';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import type { Schedule } from '@/lib/definitions';

export default function HomeworkManagementPage() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const [homeworks, setHomeworks] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore || !user) return;
        
        const q = query(
            collection(firestore, 'schedules'), 
            where('teacherId', '==', user.id),
            where('type', '==', 'homework')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule))
                .sort((a, b) => {
                    const dateA = a.createdAt?.toMillis() || a.startDate?.toMillis() || a.date?.toMillis() || 0;
                    const dateB = b.createdAt?.toMillis() || b.startDate?.toMillis() || b.date?.toMillis() || 0;
                    return dateB - dateA;
                });
            setHomeworks(list);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, user]);

    return (
        <div className="space-y-8 pb-12">
            <Reveal>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">Homework Management</h1>
                        <p className="text-muted-foreground">Monitor schedules, review student completions, and create new homework tasks.</p>
                    </div>
                </div>
            </Reveal>

            <Tabs defaultValue="overview" className="space-y-6">
                <Reveal delay={0.1}>
                    <TabsList className="bg-muted/50 p-1">
                        <TabsTrigger value="overview" className="gap-2">
                            <History className="h-4 w-4" />
                            Recent Homework
                        </TabsTrigger>
                        <TabsTrigger value="submissions" className="gap-2">
                            <Inbox className="h-4 w-4" />
                            Status
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
                                        schedules={homeworks} 
                                        title="Homework History" 
                                        description="Summary of all scheduled homework tasks." 
                                    />
                                </div>
                                <div className="space-y-6">
                                    <div className="p-6 rounded-3xl border bg-primary/5 space-y-2">
                                        <h3 className="font-bold text-lg">Quick Stats</h3>
                                        <div className="grid grid-cols-1 gap-4 pt-4">
                                            <div className="space-y-1">
                                                <p className="text-sm text-muted-foreground font-medium">Total Homeworks</p>
                                                <p className="text-3xl font-bold">{homeworks.length}</p>
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
                        <div className="p-12 text-center border-2 border-dashed rounded-3xl bg-muted/5">
                            <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-bold">Submission Tracking Coming Soon</h3>
                            <p className="text-muted-foreground">Detailed status tracking for individual students is being prepared.</p>
                        </div>
                    </Reveal>
                </TabsContent>
            </Tabs>
        </div>
    );
}
