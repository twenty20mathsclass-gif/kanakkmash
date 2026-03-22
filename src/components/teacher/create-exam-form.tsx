'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { useFirebase, useUser } from '@/firebase';
import { collection, Timestamp, query, where, onSnapshot, getDocs, serverTimestamp, documentId, doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { User, Exam, Schedule } from '@/lib/definitions';
import { ScheduledItemsList } from '@/components/teacher/scheduled-items-list';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CalendarIcon, Loader2, AlertCircle, PlusCircle, Trash2, BookText, User as UserIcon, Award, BookOpen, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';


const courseModelVisuals: { [key: string]: { icon: string; color: string; textColor: string; subject: string; } } = {
    'MATHS ONLINE TUITION': { icon: 'BookText', color: 'hsl(210 80% 65%)', textColor: 'hsl(var(--primary-foreground))', subject: 'Online Tuition' },
    'TWENTY 20 BASIC MATHS': { icon: 'BookOpen', color: 'hsl(270 80% 65%)', textColor: 'hsl(var(--primary-foreground))', subject: 'Basic Maths' },
    'COMPETITIVE EXAM': { icon: 'Award', color: 'hsl(30 95% 55%)', textColor: 'hsl(var(--primary-foreground))', subject: 'Exam Prep' },
};

const classes = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).concat('DEGREE');
const syllabuses = ['Kerala State syllabus', 'CBSE kerala', 'CBSE UAE', 'CBSE KSA', 'ICSE'];
const competitiveExams = ['LSS', 'NuMATs', 'USS', 'NMMS', 'NTSE', 'PSC', 'MAT', 'KTET', 'CTET', 'NET', 'CSAT'];
const twenty20Levels = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];

const optionSchema = z.object({
  text: z.string().min(1, { message: "Option text cannot be empty." }),
});

const questionSchema = z.object({
  questionText: z.string().min(1, { message: "Question text cannot be empty." }),
  imageUrl: z.string().url().optional(),
  options: z.array(optionSchema).min(2, { message: "Must have at least two options." }).max(4, { message: "Cannot have more than 4 options." }),
  correctAnswerIndex: z.coerce.number().min(0, { message: "Please select a correct answer." }),
});

const examFormSchema = z.object({
  title: z.string().min(3, 'Exam title must be at least 3 characters.'),
  date: z.date({ required_error: 'A date is required.' }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format. Use HH:MM.'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format. Use HH:MM.'),
  duration: z.coerce.number().min(1, 'Duration must be at least 1 minute.'),
  
  learningMode: z.enum(['group', 'one to one'], { required_error: 'Please select a learning mode.' }),
  courseModel: z.string().min(1, 'Please select a course model.'),
  classes: z.array(z.string()).optional(),
  levels: z.array(z.string()).optional(),
  syllabus: z.string().optional(),
  studentId: z.string().optional(),
  competitiveExam: z.string().optional(),

  examType: z.enum(['mcq', 'descriptive'], { required_error: 'Please select an exam type.' }),
  descriptiveInputMethod: z.enum(['upload', 'editor']).optional(),
  questionPaperContent: z.string().optional(),
  totalMarks: z.coerce.number().optional(),
  questions: z.array(questionSchema).optional(),
}).superRefine((data, ctx) => {
    if (data.learningMode === 'one to one') {
        if (!data.studentId || data.studentId.trim() === '') {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please select a student.', path: ['studentId'] });
        }
    } else {
        if (data.courseModel === 'MATHS ONLINE TUITION') {
            if (!data.classes || data.classes.length === 0) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please select at least one class.', path: ['classes'] });
            } else {
                const hasNonDegreeClass = data.classes.some(c => c !== 'DEGREE');
                if (hasNonDegreeClass && (!data.syllabus || data.syllabus.trim() === '')) {
                    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Syllabus is required for non-degree classes.', path: ['syllabus'] });
                }
            }
        }
        if (data.courseModel === 'TWENTY 20 BASIC MATHS') {
            if (!data.levels || data.levels.length === 0) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please select at least one level.', path: ['levels'] });
            }
        }
        if (data.courseModel === 'COMPETITIVE EXAM') {
            if (!data.competitiveExam || data.competitiveExam.trim() === '') {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please select a competitive exam.', path: ['competitiveExam'] });
            }
        }
    }
    if (data.examType === 'mcq') {
        if (!data.questions || data.questions.length < 1) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'MCQ exam must have at least one question.', path: ['questions'] });
        }
    }
    if (data.examType === 'descriptive') {
        if ((data.totalMarks ?? 0) <= 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Total marks must be a positive number.', path: ['totalMarks'] });
        }
         if (data.descriptiveInputMethod === 'editor' && (!data.questionPaperContent || data.questionPaperContent.trim().length === 0)) {
            ctx.addIssue({ code: 'custom', message: 'Question paper content cannot be empty.', path: ['questionPaperContent'] });
        }
    }
});

type ExamFormValues = z.infer<typeof examFormSchema>;

export function CreateExamForm() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [allStudents, setAllStudents] = useState<User[]>([]);
    const [scheduledExams, setScheduledExams] = useState<Schedule[]>([]);
    const [questionPaperUpload, setQuestionPaperUpload] = useState<{ file: File | null, status: 'idle' | 'uploading' | 'success' | 'error', url?: string }>({ file: null, status: 'idle' });

    const availableClasses = useMemo(() => {
        if (user?.role === 'admin') return classes;
        if (user?.role === 'teacher' && user.assignedClasses) {
            return classes.filter(c => user.assignedClasses!.includes(c));
        }
        return [];
    }, [user]);

    const availableCompetitiveExams = useMemo(() => {
        if (user?.role === 'admin') return competitiveExams;
        if (user?.role === 'teacher' && user.assignedClasses) {
            return competitiveExams.filter(c => user.assignedClasses!.includes(c));
        }
        return [];
    }, [user]);

    const availableLevels = useMemo(() => {
        if (user?.role === 'admin') return twenty20Levels;
        if (user?.role === 'teacher' && user.assignedClasses) {
            return twenty20Levels.filter(l => user.assignedClasses!.includes(l));
        }
        return [];
    }, [user]);

    const form = useForm<ExamFormValues>({
        resolver: zodResolver(examFormSchema),
        defaultValues: {
            title: '',
            duration: 30,
            date: new Date(),
            startTime: '10:00',
            endTime: '11:00',
            learningMode: 'group',
            courseModel: '',
            competitiveExam: '',
            examType: 'mcq',
            descriptiveInputMethod: 'upload',
            questions: [{ questionText: '', options: [{text: ''}, {text: ''}], correctAnswerIndex: -1, imageUrl: undefined }],
            totalMarks: 0,
            questionPaperContent: '',
        },
    });

    const { fields, append, remove } = useFieldArray({ control: form.control, name: "questions" });
    const { watch, setValue } = form;
    const learningMode = watch('learningMode');
    const courseModel = watch('courseModel');
    const examType = watch('examType');
    const descriptiveInputMethod = watch('descriptiveInputMethod');

    useEffect(() => {
        if (examType === 'mcq') {
            setValue('totalMarks', 0);
            setValue('questionPaperContent', '');
            setQuestionPaperUpload({ file: null, status: 'idle', url: undefined });
            if (!watch('questions') || watch('questions')?.length === 0) {
                append({ questionText: '', options: [{text: ''}, {text: ''}], correctAnswerIndex: -1, imageUrl: undefined });
            }
        } else {
            remove();
        }
    }, [examType, setValue, watch, append, remove]);

    
    useEffect(() => {
        if (!firestore || !user) return;
        const fetchStudents = async () => {
            try {
                const referralsQuery = query(collection(firestore, 'users', user.id, 'referrals'));
                const referralsSnapshot = await getDocs(referralsQuery);
                const studentIds = referralsSnapshot.docs.map(doc => doc.id);
                if (studentIds.length > 0) {
                    const studentsList: User[] = [];
                    for (let i = 0; i < studentIds.length; i += 30) {
                        const chunk = studentIds.slice(i, i + 30);
                        const studentsQuery = query(collection(firestore, 'users'), where(documentId(), 'in', chunk));
                        const querySnapshot = await getDocs(studentsQuery);
                        studentsList.push(...querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
                    }
                    studentsList.sort((a, b) => a.name.localeCompare(b.name));
                    setAllStudents(studentsList);
                }
            } catch (err: any) {
                console.warn(err);
            }
        };
        fetchStudents();
    }, [firestore, user]);

    useEffect(() => {
        if (!firestore || !user) return;
        const q = query(collection(firestore, 'schedules'), where('teacherId', '==', user.id));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const exams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule))
                .filter(s => s.type === 'exam')
                .sort((a,b) => b.date.toMillis() - a.date.toMillis());
            setScheduledExams(exams);
        });
        return () => unsubscribe();
    }, [firestore, user]);


    const handleQuestionPaperUpload = async (file: File) => {
        if (!process.env.NEXT_PUBLIC_IMAGE_UPLOAD_API_KEY) {
            toast({ variant: 'destructive', title: 'Configuration Error', description: 'Image upload API key is missing.' });
            setQuestionPaperUpload({ file, status: 'error' });
            return;
        }

        setQuestionPaperUpload({ file, status: 'uploading' });
        try {
            const formData = new FormData();
            formData.append('image', file);
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.NEXT_PUBLIC_IMAGE_UPLOAD_API_KEY}`, { method: 'POST', body: formData });
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error?.message || 'Upload failed');
            }
            
            setQuestionPaperUpload({ file, status: 'success', url: result.data.url });
            toast({ title: 'Success', description: 'Question paper uploaded.' });
        } catch (error: any) {
            console.error("Upload error:", error);
            setQuestionPaperUpload({ file, status: 'error' });
            toast({ variant: 'destructive', title: 'Upload Failed', description: error.message || 'Could not upload file. Please ensure it is a valid image.' });
        }
    }

    const cleanObject = (obj: any) => {
        const cleaned: any = {};
        Object.keys(obj).forEach(key => {
            if (obj[key] !== undefined && obj[key] !== null) {
                cleaned[key] = obj[key];
            }
        });
        return cleaned;
    }

    const onSubmit = async (data: ExamFormValues) => {
        if (!firestore || !user) return;
        setLoading(true);
        setError(null);

        try {
            const examData: any = {
                teacherId: user.id,
                title: data.title,
                courseModel: data.courseModel,
                learningMode: data.learningMode,
                examType: data.examType,
            };

            if (data.examType === 'mcq') {
                 examData.questions = data.questions?.map(q => {
                     const cleaned: any = {
                         questionText: q.questionText,
                         options: q.options.map(o => ({ text: o.text })),
                         correctAnswerIndex: q.correctAnswerIndex
                     };
                     if (q.imageUrl) cleaned.imageUrl = q.imageUrl;
                     return cleaned;
                 });
            } else {
                if (data.descriptiveInputMethod === 'upload') {
                    if (!questionPaperUpload.url) {
                        throw new Error('Please upload a question paper first.');
                    }
                    examData.questionPaperUrl = questionPaperUpload.url;
                } else if (data.questionPaperContent) {
                    examData.questionPaperContent = data.questionPaperContent;
                }
                examData.totalMarks = data.totalMarks;
            }

            const selectedVisuals = courseModelVisuals[data.courseModel] || { icon: 'Award', color: 'hsl(var(--primary))', textColor: 'hsl(var(--primary-foreground))', subject: 'Exam' };
            const scheduleData: any = {
                type: 'exam',
                duration: data.duration,
                teacherId: user.id,
                title: data.title,
                date: Timestamp.fromDate(data.date),
                startTime: data.startTime,
                endTime: data.endTime,
                learningMode: data.learningMode,
                courseModel: data.courseModel,
                createdAt: serverTimestamp(),
                ...selectedVisuals,
            };

            if (data.learningMode === 'one to one') {
                const student = allStudents.find(s => s.id === data.studentId);
                if (student) {
                    examData.studentId = student.id;
                    scheduleData.studentId = student.id;
                    if (student.class) { examData.classes = [student.class]; scheduleData.classes = [student.class]; }
                    if (student.level) { examData.levels = [student.level]; scheduleData.levels = [student.level]; }
                    if (student.syllabus) { examData.syllabus = student.syllabus; scheduleData.syllabus = student.syllabus; }
                }
            } else {
                if (data.courseModel === 'MATHS ONLINE TUITION') {
                    if (data.classes && data.classes.length > 0) {
                        examData.classes = data.classes;
                        scheduleData.classes = data.classes;
                    }
                    if (data.syllabus) {
                        examData.syllabus = data.syllabus;
                        scheduleData.syllabus = data.syllabus;
                    }
                } else if (data.courseModel === 'TWENTY 20 BASIC MATHS') {
                    if (data.levels && data.levels.length > 0) {
                        examData.levels = data.levels;
                        scheduleData.levels = data.levels;
                    }
                } else if (data.courseModel === 'COMPETITIVE EXAM') {
                    if (data.competitiveExam) {
                        examData.competitiveExam = data.competitiveExam;
                        scheduleData.competitiveExam = data.competitiveExam;
                    }
                }
            }
            
            const examRef = doc(collection(firestore, 'exams'));
            const scheduleRef = doc(collection(firestore, 'schedules'));

            const finalExamData = cleanObject(examData);
            const finalScheduleData = cleanObject({
                ...scheduleData,
                examId: examRef.id,
                meetLink: `/exams/take/${examRef.id}`
            });

            await setDoc(examRef, finalExamData);
            await setDoc(scheduleRef, finalScheduleData);
            
            toast({ title: 'Exam Created!', description: 'Your exam has been successfully scheduled.' });
            form.reset();
            setQuestionPaperUpload({ file: null, status: 'idle' });
        } catch (err: any) {
            console.error("Submission error:", err);
            if (err.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: 'exams or schedules',
                    operation: 'create',
                }, { cause: err });
                errorEmitter.emit('permission-error', permissionError);
            }
            setError(err.message || 'An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid md:grid-cols-2 gap-8 items-start">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Card>
                        <CardHeader><CardTitle>Exam Configuration</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField control={form.control} name="examType" render={({ field }) => (
                                    <FormItem><FormLabel>Exam Type</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent><SelectItem value="mcq">Multiple Choice</SelectItem><SelectItem value="descriptive">Descriptive</SelectItem></SelectContent>
                                        </Select><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="learningMode" render={({ field }) => (
                                    <FormItem><FormLabel>Learning Mode</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {(user?.teachingMode === 'group' || user?.teachingMode === 'both' || !user?.teachingMode) && (
                                                    <SelectItem value="group">Group Mode</SelectItem>
                                                )}
                                                {(user?.teachingMode === 'one to one' || user?.teachingMode === 'both' || !user?.teachingMode) && (
                                                    <SelectItem value="one to one">One to One Mode</SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select><FormMessage /></FormItem>
                                )}/>
                             </div>
                            <FormField name="title" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Exam Title</FormLabel><FormControl><Input placeholder="Exam Title" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField name="duration" control={form.control} render={({ field }) => (<FormItem><FormLabel>Duration (min)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField name="date" control={form.control} render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover><PopoverTrigger asChild><FormControl>
                                        <Button variant="outline" className="justify-between">{field.value ? format(field.value, "PPP") : "Pick date"}<CalendarIcon className="h-4 w-4 opacity-50" /></Button>
                                    </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                               <FormField name="startTime" control={form.control} render={({ field }) => (<FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                               <FormField name="endTime" control={form.control} render={({ field }) => (<FormItem><FormLabel>End Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader><CardTitle>Course Mapping</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                             <FormField control={form.control} name="courseModel" render={({ field }) => (
                                <FormItem><FormLabel>Course Model</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="MATHS ONLINE TUITION">MATHS ONLINE TUITION</SelectItem>
                                        <SelectItem value="TWENTY 20 BASIC MATHS">TWENTY 20 BASIC MATHS</SelectItem>
                                        <SelectItem value="COMPETITIVE EXAM">COMPETITIVE EXAM</SelectItem>
                                    </SelectContent>
                                </Select><FormMessage /></FormItem>
                            )}/>
                            {learningMode === 'one to one' ? (
                                <FormField control={form.control} name="studentId" render={({ field }) => (
                                    <FormItem><FormLabel>Student</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} disabled={allStudents.length === 0}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select a student" /></SelectTrigger></FormControl>
                                            <SelectContent>{allStudents.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                                        </Select><FormMessage /></FormItem>
                                )}/>
                            ) : (
                                <>
                                    {courseModel === 'MATHS ONLINE TUITION' && (
                                        <div className="space-y-4">
                                            <FormField control={form.control} name="classes" render={({ field }) => (
                                                <FormItem><FormLabel>Classes</FormLabel>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><FormControl><Button variant="outline" className="w-full justify-between" disabled={availableClasses.length === 0}>{field.value?.length ? `${field.value.length} selected` : 'Select classes'}</Button></FormControl></DropdownMenuTrigger>
                                                        <DropdownMenuContent className="w-56">
                                                            {availableClasses.map(c => (
                                                                <DropdownMenuCheckboxItem key={c} checked={field.value?.includes(c)} onCheckedChange={(checked) => {
                                                                    const vals = field.value || []; field.onChange(checked ? [...vals, c] : vals.filter(v => v !== c));
                                                                }}>{c}</DropdownMenuCheckboxItem>
                                                            ))}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu><FormMessage /></FormItem>
                                            )}/>
                                            <FormField control={form.control} name="syllabus" render={({ field }) => (
                                                <FormItem><FormLabel>Syllabus</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select syllabus" /></SelectTrigger></FormControl>
                                                        <SelectContent>{syllabuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                                    </Select><FormMessage /></FormItem>
                                            )}/>
                                        </div>
                                    )}
                                    {courseModel === 'TWENTY 20 BASIC MATHS' && (
                                        <FormField control={form.control} name="levels" render={({ field }) => (
                                            <FormItem><FormLabel>Levels</FormLabel>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><FormControl><Button variant="outline" className="w-full justify-between" disabled={availableLevels.length === 0}>{field.value?.length ? `${field.value.length} selected` : 'Select levels'}</Button></FormControl></DropdownMenuTrigger>
                                                    <DropdownMenuContent className="w-56">
                                                        {availableLevels.map(l => (
                                                            <DropdownMenuCheckboxItem key={l} checked={field.value?.includes(l)} onCheckedChange={(checked) => {
                                                                const vals = field.value || []; field.onChange(checked ? [...vals, l] : vals.filter(v => v !== l));
                                                            }}>{l}</DropdownMenuCheckboxItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu><FormMessage /></FormItem>
                                        )}/>
                                    )}
                                    {courseModel === 'COMPETITIVE EXAM' && (
                                        <FormField control={form.control} name="competitiveExam" render={({ field }) => (
                                            <FormItem><FormLabel>Competitive Exam</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value} disabled={availableCompetitiveExams.length === 0}><FormControl><SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger></FormControl>
                                                    <SelectContent>{availableCompetitiveExams.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                                                </Select><FormMessage /></FormItem>
                                        )}/>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {examType === 'mcq' ? (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold font-headline">Questions</h2>
                            {fields.map((field, index) => (
                                <Card key={field.id} className="p-6 border-l-4 border-primary">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="font-bold">Question {index + 1}</h3>
                                        <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                    <div className="space-y-4">
                                        <FormField control={form.control} name={`questions.${index}.questionText`} render={({ field }) => (<FormItem><FormControl><Textarea placeholder="Question Text" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                        <OptionsFieldArray questionIndex={index} control={form.control} />
                                    </div>
                                </Card>
                            ))}
                            <Button type="button" variant="outline" onClick={() => append({ questionText: '', options: [{text: ''}, {text: ''}], correctAnswerIndex: -1, imageUrl: undefined })} className="w-full"><PlusCircle className="mr-2 h-4 w-4" /> Add Question</Button>
                        </div>
                    ) : (
                        <Card>
                            <CardHeader><CardTitle>Descriptive Setup</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <FormField name="totalMarks" control={form.control} render={({ field }) => (<FormItem><FormLabel>Total Marks</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="descriptiveInputMethod" render={({ field }) => (
                                    <FormItem><FormLabel>Question Method</FormLabel>
                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="upload" id="up" />
                                                <Label htmlFor="up">Upload</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="editor" id="ed" />
                                                <Label htmlFor="ed">Editor</Label>
                                            </div>
                                        </RadioGroup>
                                    </FormItem>
                                )}/>
                                {descriptiveInputMethod === 'upload' ? (
                                    <div className="space-y-2">
                                        <Label>Upload Question Paper</Label>
                                        <Input type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) handleQuestionPaperUpload(e.target.files[0])}} className="file:text-foreground" />
                                        {questionPaperUpload.status === 'uploading' && <p className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin"/> Uploading...</p>}
                                        {questionPaperUpload.status === 'success' && <p className="text-xs text-success">File uploaded successfully.</p>}
                                        {questionPaperUpload.status === 'error' && <p className="text-xs text-destructive">Upload failed. Please try again.</p>}
                                    </div>
                                ) : (
                                    <FormField name="questionPaperContent" control={form.control} render={({ field }) => (<FormItem><FormControl><Textarea className="min-h-48" placeholder="Type your questions here..." {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                )}
                            </CardContent>
                        </Card>
                    )}
                    {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
                    <Button type="submit" disabled={loading} className="w-full" size="lg">{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Exam</Button>
                </form>
            </Form>
            <div className="hidden md:block sticky top-20">
                <ScheduledItemsList schedules={scheduledExams} title="Exams List" description="A record of your created exams." />
            </div>
        </div>
    );
}


function OptionsFieldArray({ questionIndex, control }: { questionIndex: number; control: any; }) {
  const { fields, append, remove } = useFieldArray({ control, name: `questions.${questionIndex}.options` });
  return (
    <div className="space-y-4 pl-4 border-l-2">
        <FormLabel>Options (Select correct one)</FormLabel>
        <Controller control={control} name={`questions.${questionIndex}.correctAnswerIndex`} render={({ field }) => (
            <RadioGroup onValueChange={(val) => field.onChange(parseInt(val, 10))} value={String(field.value)} className="space-y-2">
                {fields.map((optField, index) => (
                    <div key={optField.id} className="flex items-center gap-2">
                        <RadioGroupItem value={String(index)} id={`q-${questionIndex}-o-${index}`} />
                        <FormField control={control} name={`questions.${questionIndex}.options.${index}.text`} render={({ field: inputField }) => (
                            <FormItem className="flex-1"><FormControl><Input placeholder={`Option ${index + 1}`} {...inputField} /></FormControl></FormItem>
                        )}/>
                        {fields.length > 2 && <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                ))}
            </RadioGroup>
        )}/>
        {fields.length < 4 && <Button type="button" size="sm" variant="ghost" onClick={() => append({ text: '' })} className="mt-2"><PlusCircle className="mr-2 h-4 w-4" /> Add Option</Button>}
    </div>
  );
}
