'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Reveal } from '@/components/shared/reveal';
import { GraduationCap, Trophy, Layers, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

const CLASSES = [
    { id: 'class-1', name: 'Class 1', category: 'School' },
    { id: 'class-2', name: 'Class 2', category: 'School' },
    { id: 'class-3', name: 'Class 3', category: 'School' },
    { id: 'class-4', name: 'Class 4', category: 'School' },
    { id: 'class-5', name: 'Class 5', category: 'School' },
    { id: 'class-6', name: 'Class 6', category: 'School' },
    { id: 'class-7', name: 'Class 7', category: 'School' },
    { id: 'class-8', name: 'Class 8', category: 'School' },
    { id: 'class-9', name: 'Class 9', category: 'School' },
    { id: 'class-10', name: 'Class 10', category: 'School' },
    { id: 'class-11', name: 'Class 11', category: 'School' },
    { id: 'class-12', name: 'Class 12', category: 'School' },
];

const LEVELS = [
    { id: 'level-1', name: 'Level 1 (Class 1 & 2)', category: 'Basic Maths' },
    { id: 'level-2', name: 'Level 2 (Class 3 & 4)', category: 'Basic Maths' },
    { id: 'level-3', name: 'Level 3 (Class 5, 6, 7)', category: 'Basic Maths' },
    { id: 'level-4', name: 'Level 4 (Class 8, 9, 10)', category: 'Basic Maths' },
    { id: 'level-5', name: 'Level 5 (Class +1 & +2)', category: 'Basic Maths' },
];

const COMPETITIVE_EXAMS = [
    { id: 'exam-jee', name: 'JEE', category: 'Competitive' },
    { id: 'exam-neet', name: 'NEET', category: 'Competitive' },
    { id: 'exam-olympiad', name: 'Olympiad', category: 'Competitive' },
];

export default function TeacherAssessmentManagementPage() {
    const { firestore } = useFirebase();
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCounts = async () => {
            if (!firestore) return;
            try {
                const q = query(collection(firestore, 'assessment_questions'));
                const snap = await getDocs(q);
                const countsMap: Record<string, number> = {};
                snap.docs.forEach(doc => {
                    const data = doc.data();
                    const cls = data.class || 'Unknown';
                    countsMap[cls] = (countsMap[cls] || 0) + 1;
                });
                setCounts(countsMap);
            } catch (error) {
                console.error("Error fetching question counts:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCounts();
    }, [firestore]);

    const renderGrid = (items: typeof CLASSES, title: string, icon: any) => (
        <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
                {icon}
                {title}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {items.map((item, idx) => (
                    <Reveal key={item.id} delay={idx * 0.05}>
                        <Link href={`/teacher/assessment/${encodeURIComponent(item.name)}`}>
                            <Card className="hover:shadow-md transition-all group border-primary/20 hover:border-primary">
                                <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">{item.name}</CardTitle>
                                    <div className="bg-primary/10 p-2 rounded-full text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                        <ArrowRight className="h-4 w-4" />
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <div className="text-2xl font-bold">{loading ? <Loader2 className="h-4 w-4 animate-spin"/> : (counts[item.name] || 0)}</div>
                                    <p className="text-xs text-muted-foreground">Total Questions</p>
                                </CardContent>
                            </Card>
                        </Link>
                    </Reveal>
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-12">
            <Reveal>
                <div>
                    <h1 className="text-3xl font-bold font-headline">Assessment Test Management</h1>
                    <p className="text-muted-foreground">Manage the initial assessment tests for your students across different categories.</p>
                </div>
            </Reveal>

            {renderGrid(CLASSES, "School Classes", <GraduationCap className="h-5 w-5 text-primary"/>)}
            {renderGrid(LEVELS, "Basic Maths Levels", <Layers className="h-5 w-5 text-secondary"/>)}
            {renderGrid(COMPETITIVE_EXAMS, "Competitive Exams", <Trophy className="h-5 w-5 text-accent"/>)}
        </div>
    );
}
