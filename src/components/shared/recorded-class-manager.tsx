'use client';

import { useState, useEffect } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import type { RecordedClass, User } from '@/lib/definitions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, PlusCircle, Trash2, Edit, AlertCircle, Play } from 'lucide-react';
import Image from 'next/image';
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

const classes = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).concat('DEGREE');
const syllabuses = ['Kerala State syllabus', 'CBSE kerala', 'CBSE UAE', 'CBSE KSA', 'ICSE'];
const competitiveExams = ['LSS', 'NuMATs', 'USS', 'NMMS', 'NTSE', 'PSC', 'MAT', 'KTET', 'CTET', 'NET', 'CSAT'];
const twenty20Levels = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];

const recordedClassSchema = z.object({
  title: z.string().min(3, 'Title is required.'),
  description: z.string().min(10, 'Description is required.'),
  youtubeUrl: z.string().url('Must be a valid YouTube URL.'),
  courseModel: z.string().min(1, 'Course model is required.'),
  teacherId: z.string().optional(),
  class: z.string().optional(),
  level: z.string().optional(),
  syllabus: z.string().optional(),
  competitiveExam: z.string().optional(),
});
type FormValues = z.infer<typeof recordedClassSchema>;

function getYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function ClassForm({ isAdmin, teachers, onFormSubmit, classToEdit }: { isAdmin: boolean; teachers: User[]; onFormSubmit: (data: any, isEdit: boolean) => Promise<void>; classToEdit?: RecordedClass | null }) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(recordedClassSchema),
    defaultValues: classToEdit ? {
      title: classToEdit.title,
      description: classToEdit.description,
      youtubeUrl: classToEdit.youtubeUrl,
      courseModel: classToEdit.courseModel,
      teacherId: classToEdit.teacherId,
      class: classToEdit.class,
      level: classToEdit.level,
      syllabus: classToEdit.syllabus,
      competitiveExam: classToEdit.competitiveExam,
    } : {
      youtubeUrl: 'https://www.youtube.com/watch?v=',
    },
  });

  const courseModel = form.watch('courseModel');
  const selectedClass = form.watch('class');
  
  const showClassField = courseModel === 'MATHS ONLINE TUITION';
  const showSyllabusField = showClassField && selectedClass && selectedClass !== 'DEGREE';
  const showLevelField = courseModel === 'TWENTY 20 BASIC MATHS';
  const showCompetitiveExamField = courseModel === 'COMPETITIVE EXAM';

  const handleSubmit = async (data: FormValues) => {
    setLoading(true);
    setError(null);
    const videoId = getYouTubeVideoId(data.youtubeUrl);
    if (!videoId) {
      setError('Invalid YouTube URL provided.');
      setLoading(false);
      return;
    }

    const finalData = {
      ...data,
      teacherId: isAdmin ? data.teacherId : user?.id,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };

    try {
      await onFormSubmit(finalData, !!classToEdit);
      form.reset({ youtubeUrl: 'https://www.youtube.com/watch?v=' });
    } catch (e: any) {
      setError(e.message || 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField name="title" control={form.control} render={({ field }) => (
          <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField name="description" control={form.control} render={({ field }) => (
          <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField name="youtubeUrl" control={form.control} render={({ field }) => (
          <FormItem><FormLabel>YouTube URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />

        <FormField control={form.control} name="courseModel" render={({ field }) => (
          <FormItem><FormLabel>Course Model</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a course model" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="MATHS ONLINE TUITION">MATHS ONLINE TUITION</SelectItem>
                <SelectItem value="TWENTY 20 BASIC MATHS">TWENTY 20 BASIC MATHS</SelectItem>
                <SelectItem value="COMPETITIVE EXAM">COMPETITIVE EXAM</SelectItem>
              </SelectContent>
            </Select><FormMessage /></FormItem>
        )} />
        {showClassField && <FormField control={form.control} name="class" render={({ field }) => (
          <FormItem><FormLabel>Class</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger></FormControl>
              <SelectContent>{classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select><FormMessage /></FormItem>
        )} />}
        {showLevelField && <FormField control={form.control} name="level" render={({ field }) => (
          <FormItem><FormLabel>Level</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a level" /></SelectTrigger></FormControl>
              <SelectContent>{twenty20Levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select><FormMessage /></FormItem>
        )} />}
        {showSyllabusField && <FormField control={form.control} name="syllabus" render={({ field }) => (
            <FormItem><FormLabel>Syllabus</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a syllabus" /></SelectTrigger></FormControl>
                <SelectContent>{syllabuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select><FormMessage/></FormItem>
        )} />}
        {showCompetitiveExamField && <FormField control={form.control} name="competitiveExam" render={({ field }) => (
            <FormItem><FormLabel>Competitive Exam</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select an exam" /></SelectTrigger></FormControl>
                <SelectContent>{competitiveExams.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select><FormMessage /></FormItem>
        )} />}

        {isAdmin && (
            <FormField control={form.control} name="teacherId" render={({ field }) => (
                <FormItem><FormLabel>Teacher</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Assign a teacher" /></SelectTrigger></FormControl>
                    <SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select><FormMessage /></FormItem>
            )}/>
        )}

        {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : classToEdit ? 'Save Changes' : 'Add Class'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

export function RecordedClassManager({ isAdmin }: { isAdmin: boolean }) {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const [classes, setClasses] = useState<RecordedClass[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [classToEdit, setClassToEdit] = useState<RecordedClass | null>(null);
  const [classToDelete, setClassToDelete] = useState<RecordedClass | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!firestore || !user) return;
    setLoading(true);
    const q = isAdmin
      ? query(collection(firestore, 'recordedClasses'))
      : query(collection(firestore, 'recordedClasses'), where('teacherId', '==', user.id));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const classList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecordedClass));
      classList.sort((a,b) => {
        if (a.createdAt && b.createdAt) return b.createdAt.toMillis() - a.createdAt.toMillis();
        return 0;
      });
      setClasses(classList);
      setLoading(false);
    });

    if (isAdmin) {
      const teachersQuery = query(collection(firestore, 'users'), where('role', '==', 'teacher'));
      getDocs(teachersQuery).then(snapshot => {
        setTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
      });
    }
    return () => unsubscribe();
  }, [firestore, user, isAdmin]);

  const handleFormSubmit = async (data: any, isEdit: boolean) => {
    if (!firestore) return;
    try {
      const teacher = isAdmin ? teachers.find(t => t.id === data.teacherId) : user;
      if (!teacher) throw new Error('Teacher not found');

      const payload = {
        ...data,
        teacherName: teacher.name,
        teacherAvatarUrl: teacher.avatarUrl,
        updatedAt: serverTimestamp(),
      };
      
      if (isEdit && classToEdit) {
        await updateDoc(doc(firestore, 'recordedClasses', classToEdit.id), payload);
        toast({ title: 'Success', description: 'Recorded class updated.' });
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(firestore, 'recordedClasses'), payload);
        toast({ title: 'Success', description: 'Recorded class added.' });
      }
      setDialogOpen(false);
      setClassToEdit(null);
    } catch (e: any) {
        console.error(e);
        throw e;
    }
  };

  const handleDelete = async () => {
    if (!firestore || !classToDelete) return;
    setIsDeleting(true);
    try {
        await deleteDoc(doc(firestore, 'recordedClasses', classToDelete.id));
        toast({ title: 'Deleted', description: 'Recorded class removed.' });
    } catch(e: any) {
        toast({ title: 'Error', description: 'Failed to delete recorded class.', variant: 'destructive' });
    } finally {
        setIsDeleting(false);
        setClassToDelete(null);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center bg-card p-6 rounded-2xl border shadow-sm">
        <div>
            <h2 className="text-xl font-bold font-headline">Session Library</h2>
            <p className="text-sm text-muted-foreground">Manage your collection of video lessons.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
            <Button onClick={() => setClassToEdit(null)} className="rounded-full shadow-lg h-11 px-6">
                <PlusCircle className="mr-2 h-5 w-5"/>
                Add Session
            </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl rounded-3xl">
            <DialogHeader>
                <DialogTitle>{classToEdit ? 'Edit' : 'Add'} Session</DialogTitle>
                <DialogDescription>Enter the YouTube details for this recorded class.</DialogDescription>
            </DialogHeader>
            <ClassForm isAdmin={isAdmin} teachers={teachers} onFormSubmit={handleFormSubmit} classToEdit={classToEdit} />
            </DialogContent>
        </Dialog>
      </div>
      
      {loading ? (
        <div className="flex justify-center p-12">
            <Loader2 className="animate-spin h-10 w-10 text-primary opacity-50" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {classes.map(rc => (
            <Card key={rc.id} className="group overflow-hidden border-none bg-transparent shadow-none">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted shadow-sm transition-all hover:shadow-md">
                <Image 
                    src={rc.thumbnailUrl} 
                    alt={rc.title} 
                    fill 
                    className="object-cover transition-transform duration-500 group-hover:scale-105" 
                    unoptimized
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                    <div className="rounded-full bg-primary p-3 opacity-0 shadow-lg transition-all duration-300 group-hover:opacity-100 group-hover:scale-110">
                        <Play className="h-6 w-6 fill-white text-white translate-x-0.5" />
                    </div>
                </div>
              </div>
              <CardContent className="p-3 pt-4 space-y-3">
                <div className="space-y-1">
                    <h3 className="font-bold text-[15px] leading-tight line-clamp-2">{rc.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 opacity-80">{rc.description}</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="h-8 rounded-full flex-1 font-bold text-[11px] uppercase tracking-wider" 
                    onClick={() => { setClassToEdit(rc); setDialogOpen(true); }}
                  >
                    <Edit className="mr-1.5 h-3.5 w-3.5"/>
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 rounded-full flex-1 font-bold text-[11px] uppercase tracking-wider text-destructive hover:bg-destructive/10" 
                    onClick={() => setClassToDelete(rc)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5"/>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {classes.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl bg-muted/20">
                <p className="text-muted-foreground font-medium">No recorded sessions in your library yet.</p>
            </div>
          )}
        </div>
      )}
      
      <AlertDialog open={!!classToDelete} onOpenChange={(open) => !open && setClassToDelete(null)}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-bold font-headline">Remove Session?</AlertDialogTitle>
                <AlertDialogDescription className="text-base">
                    This will permanently delete "{classToDelete?.title}" from the library. This action cannot be reversed.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 pt-4">
                <AlertDialogCancel className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 rounded-xl font-black uppercase text-[10px] tracking-widest h-10 px-6">
                     {isDeleting ? <Loader2 className="animate-spin" /> : 'Yes, Delete Permanently'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
