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
import { Loader2, ArrowLeft, Image as ImageIcon, Plus, Trash2, LayoutGrid, CheckCircle2 } from 'lucide-react';
import { Reveal } from '@/components/shared/reveal';

export default function AdminAddAssessmentQuestionPage() {
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

        if (!question.trim()) {
            toast({ variant: 'destructive', title: 'Missing Content', description: 'Please provide the question text.' });
            return;
        }

        if (options.some(opt => !opt.trim())) {
            toast({ variant: 'destructive', title: 'Incomplete Options', description: 'All options must have content before saving.' });
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(firestore, 'assessment_questions'), {
                question: question.trim(),
                options: options.map(opt => opt.trim()),
                correctAnswerIndex: correctIndex,
                class: className,
                imageUrl: imageUrl.trim() || null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            toast({ title: 'Success', description: 'Assessment question added to the global bank.' });
            router.push(`/admin/assessment/${encodeURIComponent(className)}`);
        } catch (error) {
            console.error("Error creating question:", error);
            toast({ variant: 'destructive', title: 'System Error', description: 'Failed to synchronize with database.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-12 pb-20">
            <Reveal>
                <div className="flex items-center gap-8">
                    <Button 
                        onClick={handleBack} 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-2xl h-14 w-14 bg-white shadow-sm border border-gray-100 hover:scale-105 transition-all shrink-0"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-widest mb-1.5">
                            <LayoutGrid size={14} /> Global Question Creator
                        </div>
                        <h1 className="text-4xl font-black font-headline tracking-tight">New Assessment Item</h1>
                        <p className="text-muted-foreground text-lg mt-1">Configuring content for <span className="font-bold text-slate-800">{className}</span> repository.</p>
                    </div>
                </div>
            </Reveal>

            <Reveal delay={0.1}>
                <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white ring-1 ring-gray-100">
                    <CardHeader className="bg-slate-50/50 p-10 border-b border-dashed">
                        <CardTitle className="text-2xl font-black font-headline tracking-tighter">Content Definition</CardTitle>
                        <CardDescription className="text-lg font-medium">Define the core question and its possible response set.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-10">
                        <form onSubmit={handleSubmit} className="space-y-12">
                            {/* Question Section */}
                            <div className="space-y-6">
                                <Label htmlFor="question" className="text-xl font-black font-headline flex items-center gap-2">
                                   <span className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white text-xs">1</span>
                                   Question Narrative
                                </Label>
                                <Textarea 
                                    id="question" 
                                    placeholder="Enter the comprehensive question text here..." 
                                    className="min-h-[160px] bg-slate-50/50 text-xl font-medium border-2 border-slate-50 focus-visible:ring-primary/20 rounded-[2rem] p-8 placeholder:text-slate-300"
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Image Asset */}
                            <div className="space-y-6">
                                <Label htmlFor="imageUrl" className="text-xl font-black font-headline flex items-center gap-2">
                                   <span className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 text-xs">2</span>
                                   Visual Asset URL <span className="text-xs font-bold text-slate-300 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full ml-auto">Optional</span>
                                </Label>
                                <div className="relative group">
                                    <ImageIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={24} />
                                    <Input 
                                        id="imageUrl" 
                                        placeholder="https://cdn.kanakkmash.com/assets/initial-assessment-q1.png" 
                                        className="h-16 pl-16 rounded-2xl bg-slate-50/10 border-2 border-slate-50 font-medium transition-all focus:bg-white"
                                        value={imageUrl}
                                        onChange={(e) => setImageUrl(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Options Section */}
                            <div className="space-y-8 pt-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xl font-black font-headline flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-white text-xs">3</span>
                                        Response Sets
                                    </Label>
                                    {options.length < 6 && (
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={handleAddOption} 
                                            className="rounded-xl border-dashed border-2 h-10 px-6 font-black text-xs hover:border-primary hover:text-primary transition-all active:scale-95"
                                        >
                                            <Plus className="mr-2 h-4 w-4" /> ADD CONFIGURATION
                                        </Button>
                                    )}
                                </div>
                                <RadioGroup value={String(correctIndex)} onValueChange={(val) => setCorrectIndex(parseInt(val))} className="space-y-4">
                                    {options.map((opt, idx) => (
                                        <div key={idx} className="flex items-center gap-6 group">
                                            <div className="relative flex items-center justify-center shrink-0">
                                                <RadioGroupItem 
                                                    value={String(idx)} 
                                                    id={`opt-${idx}`} 
                                                    className="h-10 w-10 border-2 border-slate-200 data-[state=checked]:border-primary data-[state=checked]:bg-primary transition-all" 
                                                />
                                                <span className="absolute text-[10px] font-black uppercase text-slate-300 group-hover:text-primary transition-colors pointer-events-none">
                                                    {String.fromCharCode(65 + idx)}
                                                </span>
                                            </div>
                                            <div className="flex-1 relative">
                                                <Input 
                                                    value={opt} 
                                                    onChange={(e) => handleOptionChange(idx, e.target.value)} 
                                                    placeholder={`Enter option ${String.fromCharCode(65 + idx)} content...`}
                                                    className={`h-16 pl-6 pr-24 rounded-2xl text-lg font-bold transition-all border-2 ${
                                                        String(correctIndex) === String(idx) 
                                                            ? 'border-primary bg-primary/[0.03] shadow-inner' 
                                                            : 'bg-slate-50/50 border-slate-50 hover:border-slate-100 placeholder:text-slate-300 underline-offset-8'
                                                    }`}
                                                    required
                                                />
                                                {String(correctIndex) === String(idx) && (
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pr-2">
                                                        <span className="text-[10px] font-black text-primary px-3 py-1 bg-white border border-primary/20 rounded-full leading-none uppercase shadow-sm">CORRECT</span>
                                                        <CheckCircle2 size={18} className="text-primary" />
                                                    </div>
                                                )}
                                            </div>
                                            {options.length > 2 && (
                                                <Button 
                                                    type="button" 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => handleRemoveOption(idx)} 
                                                    className="opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive/40 hover:text-destructive h-12 w-12 rounded-2xl transition-all"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>

                            {/* Submit Section */}
                            <div className="flex gap-6 pt-12 border-t border-dashed">
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    onClick={handleBack} 
                                    className="flex-1 h-16 text-lg font-black rounded-2xl hover:bg-slate-100"
                                >
                                    Cancel Changes
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={isSubmitting} 
                                    className="flex-[2] h-16 text-lg font-black rounded-2xl shadow-2xl shadow-primary/30 transition-all active:scale-95"
                                >
                                    {isSubmitting ? (
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="h-6 w-6 animate-spin" /> Synchronizing...
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            Commit to Question Bank <Plus className="h-5 w-5" />
                                        </div>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </Reveal>
        </div>
    );
}
