'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Reveal } from '@/components/shared/reveal';
import { GraduationCap, Trophy, Layers, ArrowRight, Loader2, ClipboardEdit } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
    { id: 'exam-lss', name: 'LSS', category: 'Competitive' },
    { id: 'exam-numats', name: 'NuMATs', category: 'Competitive' },
    { id: 'exam-uss', name: 'USS', category: 'Competitive' },
];

export default function AdminAssessmentManagementPage() {
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

    const renderGrid = (items: any[], title: string, icon: any) => (
        <div className="space-y-6">
            <h2 className="text-xl font-black font-headline flex items-center gap-2 text-foreground/80">
                {icon}
                {title}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {items.map((item, idx) => (
                    <Reveal key={item.id} delay={idx * 0.05}>
                        <Link href={`/admin/assessment/${encodeURIComponent(item.name)}`}>
                            <Card className="hover:shadow-xl transition-all group border-gray-100 hover:border-primary/50 rounded-3xl overflow-hidden relative bg-white">
                                <div className="absolute top-0 right-0 p-4">
                                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-primary transition-colors" />
                                </div>
                                <CardHeader className="pb-2">
                                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/60">{item.category}</CardDescription>
                                    <CardTitle className="text-sm font-black font-headline truncate leading-none">{item.name}</CardTitle>
                                </CardHeader>
                                <CardContent className="pb-6">
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Items Configured</p>
                                            <div className="text-3xl font-black text-slate-800">
                                                {loading ? <Loader2 className="h-5 w-5 animate-spin text-primary"/> : (counts[item.name] || 0)}
                                            </div>
                                        </div>
                                        <div className="h-10 w-10 rounded-2xl bg-muted/50 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                                            <ClipboardEdit className="h-5 w-5 text-slate-400 group-hover:text-primary" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    </Reveal>
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-12 pb-20">
            <Reveal>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black font-headline tracking-tight">Assessment Bank</h1>
                        <p className="text-muted-foreground mt-2 text-lg">Manage the global question repository for initial student assessments.</p>
                    </div>
                    <Button variant="outline" className="rounded-2xl h-12 px-6 font-bold" asChild>
                        <Link href="/admin/assessment-results">
                            View Submission Results <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </Reveal>

            <div className="space-y-16">
                {renderGrid(CLASSES, "Academic Classes", <GraduationCap className="h-6 w-6 text-primary"/>)}
                {renderGrid(LEVELS, "Math Proficiency Levels", <Layers className="h-6 w-6 text-secondary"/>)}
                {renderGrid(COMPETITIVE_EXAMS, "Competitive Portals", <Trophy className="h-6 w-6 text-accent"/>)}
            </div>
        </div>
    );
}
