'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Reveal } from '@/components/shared/reveal';
import { PlusCircle, Trash2, Edit, ArrowLeft, Loader2, IndianRupee, Clock, CheckCircle2, XCircle } from 'lucide-react';
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

export default function TeacherClassQuestionListPage() {
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
            toast({ title: 'Question Deleted', description: 'The question has been removed from the assessment.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete question.' });
        } finally {
            setIsDeleting(false);
            setQuestionToDelete(null);
        }
    };

    return (
        <div className="space-y-8">
            <Reveal>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button onClick={() => router.back()} variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold font-headline">{className}</h1>
                            <p className="text-muted-foreground">Manage assessment questions for this class.</p>
                        </div>
                    </div>
                    <Button asChild>
                        <Link href={`/teacher/assessment/${encodeURIComponent(className)}/add`}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                        </Link>
                    </Button>
                </div>
            </Reveal>

            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>
                ) : questions.length > 0 ? (
                    questions.map((q, idx) => (
                        <Reveal key={q.id} delay={idx * 0.05}>
                            <Card className="hover:shadow-sm transition-shadow border-gray-100 overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="grid md:grid-cols-[1fr_250px_auto] gap-4">
                                        <div className="p-6 space-y-4">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">Q{idx + 1}</span>
                                                <h3 className="font-semibold text-lg">{q.question}</h3>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {q.options.map((opt, oIdx) => (
                                                    <div key={oIdx} className={`flex items-center gap-2 p-3 rounded-xl border text-sm transition-colors ${oIdx === q.correctAnswerIndex ? 'bg-green-50 border-green-200 text-green-700 font-bold' : 'bg-muted/30 border-transparent text-muted-foreground'}`}>
                                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${oIdx === q.correctAnswerIndex ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500 font-bold'}`}>
                                                            {String.fromCharCode(65 + oIdx)}
                                                        </span>
                                                        {opt}
                                                        {oIdx === q.correctAnswerIndex && <CheckCircle2 className="h-4 w-4 ml-auto" />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="bg-muted/20 flex flex-col items-center justify-center p-4 border-l border-r border-dashed border-muted">
                                            {q.imageUrl ? (
                                                <div className="relative w-full h-32 rounded-lg overflow-hidden border bg-white mb-2">
                                                    <Image src={q.imageUrl} alt="Q-Image" fill className="object-contain p-2" unoptimized />
                                                </div>
                                            ) : (
                                                <p className="text-xs text-muted-foreground italic">No accompanying image.</p>
                                            )}
                                        </div>
                                        <div className="p-4 flex flex-col md:flex-row md:items-center gap-2">
                                            <Button asChild variant="outline" size="icon" className="text-primary border-primary/20 hover:bg-primary/10">
                                                <Link href={`/teacher/assessment/${encodeURIComponent(className)}/edit/${q.id}`}>
                                                    <Edit className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <Button variant="outline" size="icon" className="text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => setQuestionToDelete(q)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Reveal>
                    ))
                ) : (
                    <div className="text-center py-24 border-2 border-dashed rounded-3xl text-muted-foreground bg-muted/5">
                        <ArrowLeft className="h-12 w-12 mx-auto opacity-10 mb-4" />
                        <p className="text-lg font-semibold">No questions found</p>
                        <p className="text-sm">Start adding questions to this category.</p>
                        <Button asChild className="mt-6" variant="outline">
                            <Link href={`/teacher/assessment/${encodeURIComponent(className)}/add`}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Create First Question
                            </Link>
                        </Button>
                    </div>
                )}
            </div>

            <AlertDialog open={!!questionToDelete} onOpenChange={(open) => !open && setQuestionToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove this question from the assessment for {className}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteQuestion} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete Question
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
