'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Image as ImageIcon, Plus, Trash2, Edit, Clock, BookOpen, BarChart } from 'lucide-react';
import { Reveal } from '@/components/shared/reveal';

export default function TeacherEditAssessmentQuestionPage() {
    const params = useParams();
    const className = decodeURIComponent(params.className as string);
    const id = params.id as string;
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '', '', '']);
    const [correctIndex, setCorrectIndex] = useState(0);
    const [imageUrl, setImageUrl] = useState('');
    const [durationSeconds, setDurationSeconds] = useState<number>(30);
    const [subject, setSubject] = useState('');
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

    useEffect(() => {
        if (!firestore || !id) return;
        const fetchQuestion = async () => {
            try {
                const docRef = doc(firestore, 'pre_assessment_questions', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setQuestion(data.question);
                    setOptions(data.options);
                    setCorrectIndex(data.correctAnswerIndex);
                    setImageUrl(data.imageUrl || '');
                    setDurationSeconds(data.durationSeconds || 30);
                    setSubject(data.subject || '');
                    setDifficulty(data.difficulty || 'medium');
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Question not found.' });
                    router.back();
                }
            } catch (error) {
                console.error("Error fetching question:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch question.' });
            } finally {
                setLoading(false);
            }
        };
        fetchQuestion();
    }, [firestore, id]);

    const handleBack = () => router.back();

    const handleOptionChange = (idx: number, val: string) => {
        const updated = [...options];
        updated[idx] = val;
        setOptions(updated);
    };

    const handleAddOption = () => {
        if (options.length < 6) setOptions([...options, '']);
    };

    const handleRemoveOption = (idx: number) => {
        if (options.length > 2) {
            const updated = options.filter((_, i) => i !== idx);
            if (correctIndex >= updated.length) setCorrectIndex(0);
            setOptions(updated);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !id) return;

        if (!question) {
            toast({ variant: 'destructive', title: 'Error', description: 'Question text is required.' });
            return;
        }

        if (options.some(opt => !opt)) {
            toast({ variant: 'destructive', title: 'Error', description: 'All options must have content.' });
            return;
        }

        setIsSubmitting(true);
        try {
            await updateDoc(doc(firestore, 'pre_assessment_questions', id), {
                question,
                options,
                correctAnswerIndex: correctIndex,
                class: className,
                subject: subject || null,
                difficulty,
                imageUrl: imageUrl || null,
                durationSeconds: Number(durationSeconds) || 30,
                updatedAt: serverTimestamp(),
            });
            toast({ title: 'Success', description: 'Assessment question updated successfully.' });
            router.push(`/teacher/assessment/${encodeURIComponent(className)}`);
        } catch (error) {
            console.error("Error updating question:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update question.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center py-24"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <Reveal>
                <div className="flex items-center gap-4">
                    <Button onClick={handleBack} variant="outline" size="icon" className="rounded-full">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Edit Question</h1>
                        <p className="text-sm sm:text-base text-muted-foreground">Editing in <span className="font-semibold text-primary">{className}</span></p>
                    </div>
                </div>
            </Reveal>

            <Reveal delay={0.1}>
                <Card className="border-primary/10 shadow-lg">
                    <CardHeader className="bg-primary/5 border-b">
                        <CardTitle className="flex items-center gap-2"><Edit className="h-5 w-5" /> Update Details</CardTitle>
                        <CardDescription>Update the question text and correct answers.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-8">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="space-y-4">
                                <Label htmlFor="question" className="text-lg">Question Text</Label>
                                <Textarea 
                                    id="question" 
                                    placeholder="Enter the question here..." 
                                    className="min-h-[120px] bg-muted/20 text-lg border-2 focus-visible:ring-primary/20"
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <Label htmlFor="subject" className="flex items-center gap-2">
                                        <BookOpen className="h-4 w-4 text-primary" /> Subject / Topic
                                    </Label>
                                    <Input 
                                        id="subject" 
                                        placeholder="e.g. Algebra, Geometry" 
                                        className="bg-muted/10"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <Label htmlFor="difficulty" className="flex items-center gap-2">
                                        <BarChart className="h-4 w-4 text-primary" /> Difficulty Level
                                    </Label>
                                    <select
                                        id="difficulty"
                                        className="w-full h-10 px-3 rounded-md bg-muted/10 border border-input focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        value={difficulty}
                                        onChange={(e) => setDifficulty(e.target.value as any)}
                                    >
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label htmlFor="imageUrl" className="flex items-center gap-2">
                                    <ImageIcon className="h-4 w-4" /> Optional Image URL
                                </Label>
                                <Input 
                                    id="imageUrl" 
                                    placeholder="https://example.com/question-image.png" 
                                    className="bg-muted/10"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                />
                            </div>

                            <div className="space-y-4">
                                <Label htmlFor="durationSeconds" className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-primary" /> Question Duration (Seconds)
                                </Label>
                                <Input 
                                    id="durationSeconds" 
                                    type="number"
                                    min={1}
                                    placeholder="30" 
                                    className="bg-muted/10 w-32"
                                    value={durationSeconds}
                                    onChange={(e) => setDurationSeconds(Number(e.target.value))}
                                    required
                                />
                                <p className="text-xs text-muted-foreground">How many seconds should this question add to the total test time?</p>
                            </div>

                            <div className="space-y-6 pt-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-lg">Options & Correct Answer</Label>
                                    {options.length < 6 && (
                                        <Button type="button" variant="outline" size="sm" onClick={handleAddOption} className="border-dashed h-8 px-4 font-bold text-xs text-primary">
                                            <Plus className="mr-1 h-3 w-3" /> ADD OPTION
                                        </Button>
                                    )}
                                </div>
                                <RadioGroup value={String(correctIndex)} onValueChange={(val) => setCorrectIndex(parseInt(val))} className="space-y-4">
                                    {options.map((opt, idx) => (
                                        <div key={idx} className="flex items-center gap-4 group">
                                            <RadioGroupItem value={String(idx)} id={`opt-${idx}`} className="h-6 w-6 border-2 border-primary data-[state=checked]:bg-primary" />
                                            <div className="flex-1 relative">
                                                <Input 
                                                    value={opt} 
                                                    onChange={(e) => handleOptionChange(idx, e.target.value)} 
                                                    placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                                                    className={`h-12 text-md transition-all ${correctIndex === idx ? 'border-primary bg-primary/5 pr-10' : 'bg-muted/10 hover:bg-muted/20'}`}
                                                    required
                                                />
                                                {correctIndex === idx && (
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary px-1.5 py-0.5 border-2 border-primary rounded leading-none uppercase hidden sm:block">Correct</span>
                                                )}
                                            </div>
                                            {options.length > 2 && (
                                                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveOption(idx)} className="sm:opacity-0 group-hover:opacity-100 text-destructive-foreground bg-destructive/10 hover:bg-destructive/20 h-10 w-10 shrink-0">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>

                            <div className="flex gap-4 pt-8">
                                <Button type="button" variant="ghost" onClick={handleBack} className="flex-1 h-12 text-md font-bold">Cancel</Button>
                                <Button type="submit" disabled={isSubmitting} className="flex-[2] h-12 text-md font-bold shadow-lg shadow-primary/20">
                                    {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                    Update Question
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </Reveal>
        </div>
    );
}
