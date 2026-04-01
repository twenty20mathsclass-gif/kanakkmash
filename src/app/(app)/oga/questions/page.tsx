'use client';

import { useEffect, useRef, useState } from 'react';
import {
  collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, orderBy, query,
} from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase';
import type { AssessmentQuestion } from '@/lib/definitions';
import { uploadImage } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Reveal } from '@/components/shared/reveal';
import {
  Loader2, PlusCircle, Trash2, Pencil, Save, X, ArrowLeft,
  CheckCircle, GraduationCap, Filter, ImagePlus, ImageOff,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const COLLECTION = 'assessment_questions';
const CLASSES = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`);

const emptyForm = () => ({
  question: '',
  options: ['', '', '', ''],
  correctAnswerIndex: 0,
  class: '',
  imageUrl: '',
});

export default function OGAQuestionsPage() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [imagePreview, setImagePreview] = useState<string>('');
  const [filterClass, setFilterClass] = useState<string>('all');

  const fetchQuestions = async () => {
    if (!firestore) return;
    setLoading(true);
    try {
      const q = query(collection(firestore, COLLECTION), orderBy('createdAt', 'asc'));
      const snap = await getDocs(q);
      setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AssessmentQuestion)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuestions(); }, [firestore]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setImagePreview('');
    setDialogOpen(true);
  };

  const openEdit = (q: AssessmentQuestion) => {
    setEditingId(q.id);
    setForm({
      question: q.question,
      options: [...q.options],
      correctAnswerIndex: q.correctAnswerIndex,
      class: q.class || '',
      imageUrl: q.imageUrl || '',
    });
    setImagePreview(q.imageUrl || '');
    setDialogOpen(true);
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Show local preview immediately
    setImagePreview(URL.createObjectURL(file));
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const url = await uploadImage(fd);
      setForm((prev) => ({ ...prev, imageUrl: url }));
      setImagePreview(url);
    } catch (err: any) {
      toast({ title: 'Upload Failed', description: err.message, variant: 'destructive' });
      setImagePreview('');
      setForm((prev) => ({ ...prev, imageUrl: '' }));
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setImagePreview('');
    setForm((prev) => ({ ...prev, imageUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!firestore || !user) return;
    if (!form.question.trim() || form.options.some((o) => !o.trim())) {
      toast({ title: 'Validation Error', description: 'Fill in the question and all 4 options.', variant: 'destructive' });
      return;
    }
    if (!form.class) {
      toast({ title: 'Validation Error', description: 'Please select a class for this question.', variant: 'destructive' });
      return;
    }
    if (uploadingImage) {
      toast({ title: 'Please wait', description: 'Image is still uploading…' });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        question: form.question,
        options: form.options,
        correctAnswerIndex: form.correctAnswerIndex,
        class: form.class,
      };
      if (form.imageUrl) payload.imageUrl = form.imageUrl;
      else payload.imageUrl = null; // clear it if removed

      if (editingId) {
        await updateDoc(doc(firestore, COLLECTION, editingId), payload);
        toast({ title: 'Updated', description: 'Question updated successfully.' });
      } else {
        await addDoc(collection(firestore, COLLECTION), {
          ...payload,
          createdAt: serverTimestamp(),
          createdBy: user.id,
        });
        toast({ title: 'Added', description: 'Question added successfully.' });
      }
      setDialogOpen(false);
      await fetchQuestions();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, COLLECTION, id));
      toast({ title: 'Deleted', description: 'Question deleted.' });
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const setOption = (idx: number, value: string) => {
    setForm((prev) => {
      const options = [...prev.options];
      options[idx] = value;
      return { ...prev, options };
    });
  };

  const filtered = filterClass === 'all' ? questions : questions.filter((q) => q.class === filterClass);
  const classCount = CLASSES.reduce<Record<string, number>>((acc, c) => {
    acc[c] = questions.filter((q) => q.class === c).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Reveal>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link href="/oga"><ArrowLeft /></Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold font-headline">Assessment Questions</h1>
              <p className="text-muted-foreground">Manage class-based MCQ questions with optional images.</p>
            </div>
          </div>
          <Button onClick={openAdd}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Question
          </Button>
        </div>
      </Reveal>

      {/* Class filter pills */}
      <Reveal delay={0.05}>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterClass('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              filterClass === 'all'
                ? 'bg-primary text-white border-primary'
                : 'bg-background border-border text-muted-foreground hover:border-primary/40'
            }`}
          >
            All ({questions.length})
          </button>
          {CLASSES.map((c) => (
            <button
              key={c}
              onClick={() => setFilterClass(c)}
              disabled={classCount[c] === 0}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                filterClass === c
                  ? 'bg-primary text-white border-primary'
                  : classCount[c] === 0
                  ? 'bg-muted border-muted text-muted-foreground opacity-40 cursor-default'
                  : 'bg-background border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              {c} ({classCount[c]})
            </button>
          ))}
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {filterClass === 'all' ? `All Questions (${filtered.length})` : `${filterClass} — ${filtered.length} question${filtered.length !== 1 ? 's' : ''}`}
                </CardTitle>
                <CardDescription>
                  {filterClass === 'all' ? 'All classes.' : `Filtered to ${filterClass}.`}
                </CardDescription>
              </div>
              {filterClass !== 'all' && (
                <Button variant="ghost" size="sm" onClick={() => setFilterClass('all')}>
                  <Filter className="h-3.5 w-3.5 mr-1" /> Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No questions {filterClass !== 'all' ? `for ${filterClass}` : 'yet'}.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((q, i) => (
                  <div key={q.id} className="border border-border rounded-xl p-4 space-y-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="mt-0.5 min-w-[2rem] h-8 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                          Q{i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/20 text-accent-foreground text-[10px] font-semibold mb-1 border border-accent/30">
                            <GraduationCap className="h-2.5 w-2.5" /> {q.class}
                          </span>
                          {q.imageUrl && (
                            <div className="relative w-full max-w-xs h-32 rounded-lg overflow-hidden border border-border mb-2">
                              <Image src={q.imageUrl} alt="Question image" fill className="object-contain bg-muted/30" unoptimized />
                            </div>
                          )}
                          <p className="font-medium text-sm leading-relaxed">{q.question}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(q)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(q.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pl-11">
                      {q.options.map((opt, idx) => (
                        <div key={idx} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
                          idx === q.correctAnswerIndex
                            ? 'border-green-500/40 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                            : 'border-border bg-background text-muted-foreground'
                        }`}>
                          {idx === q.correctAnswerIndex && <CheckCircle className="h-3 w-3 flex-shrink-0" />}
                          <span>{String.fromCharCode(65 + idx)}. {opt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </Reveal>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Question' : 'Add New Question'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Class */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> Class</Label>
              <Select value={form.class} onValueChange={(v) => setForm((prev) => ({ ...prev, class: v }))}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Question */}
            <div className="space-y-2">
              <Label>Question Text</Label>
              <Input
                value={form.question}
                onChange={(e) => setForm((prev) => ({ ...prev, question: e.target.value }))}
                placeholder="e.g. What is 15 × 12?"
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><ImagePlus className="h-3.5 w-3.5" /> Question Image <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImagePick}
                className="hidden"
              />

              {imagePreview ? (
                <div className="relative">
                  <div className="relative w-full h-40 rounded-xl overflow-hidden border border-border bg-muted/30">
                    <Image src={imagePreview} alt="Preview" fill className="object-contain" unoptimized />
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                        <Loader2 className="animate-spin h-5 w-5 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}>
                      <ImagePlus className="h-3.5 w-3.5 mr-1" /> Change
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={removeImage} disabled={uploadingImage} className="text-destructive hover:text-destructive">
                      <ImageOff className="h-3.5 w-3.5 mr-1" /> Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-28 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-muted/30 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm"
                >
                  <ImagePlus className="h-6 w-6 opacity-40" />
                  <span>Click to upload an image</span>
                  <span className="text-[11px]">PNG, JPG, GIF, WEBP</span>
                </button>
              )}
            </div>

            {/* Options */}
            <div className="space-y-2">
              <Label>Options (A, B, C, D)</Label>
              <div className="grid grid-cols-2 gap-3">
                {form.options.map((opt, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <Input
                      className="pl-8"
                      value={opt}
                      onChange={(e) => setOption(idx, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Correct answer */}
            <div className="space-y-2">
              <Label>Correct Answer</Label>
              <Select
                value={String(form.correctAnswerIndex)}
                onValueChange={(v) => setForm((prev) => ({ ...prev, correctAnswerIndex: Number(v) }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['A', 'B', 'C', 'D'].map((opt, idx) => (
                    <SelectItem key={idx} value={String(idx)}>Option {opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost"><X className="mr-1 h-4 w-4" />Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving || uploadingImage}>
              {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
              {uploadingImage ? 'Uploading…' : editingId ? 'Save Changes' : 'Add Question'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
