
'use client';

import { useState, useEffect } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import type { RecordedClass, User } from '@/lib/definitions';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, PlusCircle, Trash2, Edit, AlertCircle } from 'lucide-react';
import Image from 'next/image';

const classes = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).concat('DEGREE');
const syllabuses = ['Kerala State syllabus', 'CBSE kerala', 'CBSE UAE', 'CBSE KSA', 'ICSE'];
const competitiveExams = ['LSS', 'NuMATs', 'USS', 'NMMS', 'NTSE', 'PSC', 'MAT', 'KTET', 'CTET', 'NET', 'CSAT'];

const recordedClassSchema = z.object({
  title: z.string().min(3, 'Title is required.'),
  description: z.string().min(10, 'Description is required.'),
  youtubeUrl: z.string().url('Must be a valid YouTube URL.'),
  courseModel: z.string().min(1, 'Course model is required.'),
  teacherId: z.string().optional(),
  class: z.string().optional(),
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
      syllabus: classToEdit.syllabus,
      competitiveExam: classToEdit.competitiveExam,
    } : {
      youtubeUrl: 'https://www.youtube.com/watch?v=',
    },
  });

  const courseModel = form.watch('courseModel');
  const selectedClass = form.watch('class');
  
  const showClassField = courseModel === 'MATHS ONLINE TUITION' || courseModel === 'ONE TO ONE';
  const showSyllabusField = showClassField && selectedClass && selectedClass !== 'DEGREE';
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

    if (isAdmin && !finalData.teacherId) {
        setError('Please select a teacher.');
        setLoading(false);
        return;
    }

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
                <SelectItem value="ONE TO ONE">ONE TO ONE</SelectItem>
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
        {showSyllabusField && <FormField control={form.control} name="syllabus" render={({ field }) => (
            <FormItem><FormLabel>Syllabus</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a syllabus" /></SelectTrigger></FormControl>
                <SelectContent>{syllabuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select><FormMessage /></FormItem>
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

  useEffect(() => {
    if (!firestore || !user) return;
    setLoading(true);
    const q = isAdmin
      ? query(collection(firestore, 'recordedClasses'), orderBy('createdAt', 'desc'))
      : query(collection(firestore, 'recordedClasses'), where('teacherId', '==', user.id), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecordedClass)));
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

  const handleDelete = async (classId: string) => {
    if (!firestore || !window.confirm('Are you sure you want to delete this class?')) return;
    await deleteDoc(doc(firestore, 'recordedClasses', classId));
    toast({ title: 'Deleted', description: 'Recorded class has been removed.' });
  };

  const openEditDialog = (rc: RecordedClass) => {
    setClassToEdit(rc);
    setDialogOpen(true);
  }

  const openNewDialog = () => {
    setClassToEdit(null);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button onClick={openNewDialog}><PlusCircle className="mr-2"/>Add New Recorded Class</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{classToEdit ? 'Edit' : 'Add'} Recorded Class</DialogTitle>
            <DialogDescription>Fill in the details for the recorded class video.</DialogDescription>
          </DialogHeader>
          <ClassForm isAdmin={isAdmin} teachers={teachers} onFormSubmit={handleFormSubmit} classToEdit={classToEdit} />
        </DialogContent>
      </Dialog>
      
      <Card>
        <CardHeader><CardTitle>Existing Classes</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Loader2 className="animate-spin" /> : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map(rc => (
                <Card key={rc.id}>
                  <div className="aspect-video relative">
                    <Image src={rc.thumbnailUrl} alt={rc.title} fill className="object-cover rounded-t-lg" />
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-bold line-clamp-2">{rc.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3">{rc.description}</p>
                    {isAdmin && <p className="text-xs text-muted-foreground pt-2 border-t">By: {rc.teacherName}</p>}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(rc)}><Edit className="mr-2 h-3 w-3"/>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(rc.id)}><Trash2 className="mr-2 h-3 w-3"/>Delete</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {!loading && classes.length === 0 && <p className="text-muted-foreground text-center p-8">No recorded classes found.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
