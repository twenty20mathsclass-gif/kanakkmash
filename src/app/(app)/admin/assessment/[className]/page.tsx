'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Reveal } from '@/components/shared/reveal';
import { PlusCircle, Trash2, Edit, ArrowLeft, Loader2, CheckCircle2, ChevronRight, LayoutGrid, Info } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Image from 'next/image';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  imageUrl?: string;
  class: string;
}

export default function AdminClassQuestionListPage() {
    const params = useParams();
    const className = decodeURIComponent(params.className as string);
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (!firestore || !className) return;
        setLoading(true);

        const q = query(collection(firestore, 'assessment_questions'), where('class', '==', className));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
            setQuestions(list);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [firestore, className]);

    const handleDeleteQuestion = async () => {
        if (!firestore || !questionToDelete) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(firestore, 'assessment_questions', questionToDelete.id));
            toast({ title: 'Question Removed', description: 'The item has been deleted from the global bank.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Action Failed', description: 'Failed to delete question. Check permissions.' });
        } finally {
            setIsDeleting(false);
            setQuestionToDelete(null);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-20">
            <Reveal>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <Button 
                            onClick={() => router.back()} 
                            variant="outline" 
                            size="icon" 
                            className="rounded-2xl h-12 w-12 border-gray-100 shadow-sm hover:scale-105 active:scale-95 transition-all shrink-0"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest mb-1">
                                <LayoutGrid size={14} /> Global Repository
                            </div>
                            <h1 className="text-4xl font-black font-headline tracking-tight">{className}</h1>
                            <p className="text-muted-foreground mt-1 max-w-lg">Configured assessment questions for this category.</p>
                        </div>
                    </div>
                    <Button asChild className="rounded-2xl h-12 px-8 font-black shadow-lg hover:shadow-primary/20 transition-all">
                        <Link href={`/admin/assessment/${encodeURIComponent(className)}/add`}>
                            <PlusCircle className="mr-2 h-5 w-5" /> Add New Question
                        </Link>
                    </Button>
                </div>
            </Reveal>

            <div className="space-y-6">
                {loading ? (
                    <div className="flex items-center justify-center py-32 bg-muted/5 rounded-[3rem] border-2 border-dashed">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="animate-spin h-12 w-12 text-primary opacity-20" />
                            <p className="font-bold text-muted-foreground/40 animate-pulse">Scanning database...</p>
                        </div>
                    </div>
                ) : questions.length > 0 ? (
                    questions.map((q, idx) => (
                        <Reveal key={q.id} delay={idx * 0.05}>
                            <Card className="hover:shadow-xl transition-all border-none bg-white rounded-[2.5rem] overflow-hidden group shadow-sm ring-1 ring-gray-100">
                                <CardContent className="p-0">
                                    <div className="grid md:grid-cols-[1fr_300px_auto] gap-0">
                                        <div className="p-8 space-y-6">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-primary h-8 w-8 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-lg shadow-primary/20">
                                                    #{idx + 1}
                                                </div>
                                                <h3 className="font-black text-xl text-slate-800 leading-tight">{q.question}</h3>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {q.options.map((opt, oIdx) => (
                                                    <div 
                                                        key={oIdx} 
                                                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                                                            oIdx === q.correctAnswerIndex 
                                                                ? 'bg-emerald-50/50 border-emerald-500 text-emerald-900 font-bold shadow-sm shadow-emerald-500/5' 
                                                                : 'bg-white border-gray-50 text-slate-400 group-hover:border-gray-100'
                                                        }`}
                                                    >
                                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                                                            oIdx === q.correctAnswerIndex ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'
                                                        }`}>
                                                            {String.fromCharCode(65 + oIdx)}
                                                        </div>
                                                        <span className="text-sm">{opt}</span>
                                                        {oIdx === q.correctAnswerIndex && (
                                                            <div className="ml-auto w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                                                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="bg-slate-50/50 flex flex-col items-center justify-center p-8 border-l border-r border-dashed border-slate-200">
                                            {q.imageUrl ? (
                                                <div className="relative w-full h-40 rounded-3xl overflow-hidden border shadow-inner bg-white hover:scale-[1.02] transition-transform duration-500">
                                                    <Image src={q.imageUrl} alt="Asset" fill className="object-contain p-4 transition-transform group-hover:scale-110" unoptimized />
                                                </div>
                                            ) : (
                                                <div className="bg-white/40 p-6 rounded-full border border-slate-200 border-dashed">
                                                    <Info className="h-6 w-6 text-slate-300" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-8 flex flex-col items-center justify-center gap-4 bg-slate-900 text-white">
                                            <Button asChild variant="ghost" className="rounded-2xl h-14 w-14 hover:bg-white/10 hover:text-white transition-all">
                                                <Link href={`/admin/assessment/${encodeURIComponent(className)}/edit/${q.id}`}>
                                                    <Edit className="h-6 w-6" />
                                                </Link>
                                            </Button>
                                            <div className="h-px w-8 bg-white/10" />
                                            <Button 
                                                variant="ghost" 
                                                className="rounded-2xl h-14 w-14 hover:bg-destructive/20 hover:text-white text-destructive transition-all" 
                                                onClick={() => setQuestionToDelete(q)}
                                            >
                                                <Trash2 className="h-6 w-6" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Reveal>
                    ))
                ) : (
                    <Reveal>
                        <div className="text-center py-32 border-2 border-dashed rounded-[3rem] text-muted-foreground bg-muted/5 flex flex-col items-center gap-6">
                            <div className="h-20 w-20 rounded-[2rem] bg-white border border-slate-100 shadow-sm flex items-center justify-center mb-2">
                                <ArrowLeft className="h-8 w-8 text-slate-200" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-800 font-headline leading-none">No questions configured</p>
                                <p className="text-sm mt-3 font-medium">This category is currently empty in the global repository.</p>
                            </div>
                            <Button asChild className="rounded-2xl h-14 px-10 font-black shadow-xl hover:shadow-primary/20 bg-primary" size="lg">
                                <Link href={`/admin/assessment/${encodeURIComponent(className)}/add`}>
                                    <PlusCircle className="mr-3 h-5 w-5" /> Start Building
                                </Link>
                            </Button>
                        </div>
                    </Reveal>
                )}
            </div>

            <AlertDialog open={!!questionToDelete} onOpenChange={(open) => !open && setQuestionToDelete(null)}>
                <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-10">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black font-headline">Permanently Remove Item?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 font-medium leading-relaxed">
                            This action will strike this question from the official assessment for <span className="font-bold text-primary">{className}</span> and cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-8 gap-4">
                        <AlertDialogCancel className="rounded-2xl h-12 font-bold px-8">Discard</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteQuestion} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-12 font-black px-8">
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete Globally
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
