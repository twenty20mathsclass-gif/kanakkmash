'use client';

import { useState } from 'react';
import { useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { Reveal } from '@/components/shared/reveal';

export default function TeacherAddAssessmentQuestionPage() {
    const params = useParams();
    const className = decodeURIComponent(params.className as string);
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '', '', '']);
    const [correctIndex, setCorrectIndex] = useState(0);
    const [imageUrl, setImageUrl] = useState('');

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
        if (!firestore) return;

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
            await addDoc(collection(firestore, 'assessment_questions'), {
                question,
                options,
                correctAnswerIndex: correctIndex,
                class: className,
                imageUrl: imageUrl || null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            toast({ title: 'Success', description: 'Assessment question created successfully.' });
            router.push(`/teacher/assessment/${encodeURIComponent(className)}`);
        } catch (error) {
            console.error("Error creating question:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to create question.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <Reveal>
                <div className="flex items-center gap-4">
                    <Button onClick={handleBack} variant="outline" size="icon" className="rounded-full">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold font-headline">New Question</h1>
                        <p className="text-muted-foreground">Adding to <span className="font-semibold text-primary">{className}</span></p>
                    </div>
                </div>
            </Reveal>

            <Reveal delay={0.1}>
                <Card className="border-primary/10 shadow-lg">
                    <CardHeader className="bg-primary/5 border-b">
                        <CardTitle>Question Details</CardTitle>
                        <CardDescription>Enter the question text and define possible answers.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
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

                            <div className="space-y-6 pt-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-lg">Options & Correct Answer</Label>
                                    {options.length < 6 && (
                                        <Button type="button" variant="outline" size="sm" onClick={handleAddOption} className="border-dashed h-8 px-4 font-bold text-xs">
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
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary px-1.5 py-0.5 border-2 border-primary rounded leading-none uppercase">Correct</span>
                                                )}
                                            </div>
                                            {options.length > 2 && (
                                                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveOption(idx)} className="opacity-0 group-hover:opacity-100 text-destructive-foreground bg-destructive/10 hover:bg-destructive/20 h-10 w-10">
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
                                    Create Question
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </Reveal>
        </div>
    );
}
