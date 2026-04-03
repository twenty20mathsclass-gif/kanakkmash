'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, Controller, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { useFirebase, useUser } from '@/firebase';
import { collection, Timestamp, query, where, onSnapshot, getDocs, serverTimestamp, doc, setDoc, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { User, Schedule } from '@/lib/definitions';
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
import { CalendarIcon, Loader2, AlertCircle, PlusCircle, Trash2, BookText, User as UserIcon, Award, BookOpen, Upload, X, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { uploadImage } from '@/lib/actions';

const courseModelVisuals: { [key: string]: { icon: string; color: string; textColor: string; subject: string; } } = {
    'MATHS ONLINE TUITION': { icon: 'BookText', color: 'hsl(210 80% 65%)', textColor: 'hsl(var(--primary-foreground))', subject: 'Online Tuition' },
    'TWENTY 20 BASIC MATHS': { icon: 'BookOpen', color: 'hsl(270 80% 65%)', textColor: 'hsl(var(--primary-foreground))', subject: 'Basic Maths' },
    'COMPETITIVE EXAM': { icon: 'Award', color: 'hsl(30 95% 55%)', textColor: 'hsl(var(--primary-foreground))', subject: 'Exam Prep' },
};

const classes = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).concat('DEGREE');
const syllabuses = ['Kerala State syllabus', 'CBSE kerala', 'CBSE UAE', 'CBSE KSA', 'ICSE'];
const competitiveExams = ['LSS', 'NuMATs', 'USS', 'NMMS', 'NTSE', 'PSC', 'MAT', 'KTET', 'CTET', 'NET', 'CSAT'];
// These will be fetched from Firestore if possible, but kept as defaults if none found
const defaultLevels = [
    { label: 'Level 1 (Class 1 & 2)', value: 'Level 1', className: 'Class 1' },
    { label: 'Level 2 (Class 3 & 4)', value: 'Level 2', className: 'Class 3' },
    { label: 'Level 3 (Class 5, 6, 7)', value: 'Level 3', className: 'Class 5' },
    { label: 'Level 4 (Class 8, 9, 10)', value: 'Level 4', className: 'Class 8' },
    { label: 'Level 5 (Class +1 & +2)', value: 'Level 5', className: 'Class 11' }
];

const optionSchema = z.object({
  text: z.string().min(1, { message: "Option text cannot be empty." }),
});

const questionSchema = z.object({
  questionText: z.string().min(1, { message: "Question text cannot be empty." }),
  imageUrl: z.string().url().optional(),
  options: z.array(optionSchema).min(2, { message: "Must have at least two options." }).max(4, { message: "Cannot have more than 4 options." }).optional(),
  correctAnswerIndex: z.coerce.number().min(0, { message: "Please select a correct answer." }).optional(),
});

const homeworkFormSchema = z.object({
  title: z.string().min(3, 'Homework title must be at least 3 characters.'),
  startDate: z.date({ required_error: 'A start date is required.' }),
  endDate: z.date({ required_error: 'An end date is required.' }),
  
  learningMode: z.enum(['group', 'one to one'], { required_error: 'Please select a learning mode.' }),
  courseModel: z.string().min(1, 'Please select a course model.'),
  classes: z.array(z.string()).optional(),
  levels: z.array(z.string()).optional(),
  syllabus: z.string().optional(),
  studentIds: z.array(z.string()).optional(),
  competitiveExam: z.string().optional(),

  homeworkType: z.enum(['mcq', 'descriptive'], { required_error: 'Please select a homework type.' }),
  descriptiveInputMethod: z.enum(['upload', 'editor']).optional(),
  questionPaperContent: z.string().optional(),
  questions: z.array(questionSchema).optional(),
  totalMarks: z.coerce.number().optional(),
}).superRefine((data, ctx) => {
    if (data.endDate < data.startDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'End date cannot be before start date.', path: ['endDate'] });
    }
    if (data.learningMode === 'one to one') {
        if (!data.studentIds || data.studentIds.length === 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please select at least one student.', path: ['studentIds'] });
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
    if (data.homeworkType === 'mcq') {
        if (!data.questions || data.questions.length < 1) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'MCQ homework must have at least one question.', path: ['questions'] });
        }
    }
    if (data.homeworkType === 'descriptive') {
        if (data.descriptiveInputMethod === 'editor') {
            if (!data.questions || data.questions.length < 1) {
                ctx.addIssue({ code: 'custom', message: 'Please add at least one question.', path: ['questions'] });
            }
        }
    }
});

type HomeworkFormValues = z.infer<typeof homeworkFormSchema>;

export function CreateHomeworkForm() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [allStudents, setAllStudents] = useState<User[]>([]);
    const [isStartCalendarOpen, setIsStartCalendarOpen] = useState(false);
    const [isEndCalendarOpen, setIsEndCalendarOpen] = useState(false);
    const [scheduledHomework, setScheduledHomework] = useState<Schedule[]>([]);
    const [questionPaperUpload, setQuestionPaperUpload] = useState<{ file: File | null, status: 'idle' | 'uploading' | 'success' | 'error', url?: string }>({ file: null, status: 'idle' });

    const availableClasses = useMemo(() => {
        return classes;
    }, []);

    const availableCompetitiveExams = useMemo(() => {
        return competitiveExams;
    }, []);

    const [dbLevels, setDbLevels] = useState<any[]>([]);

    const availableLevels = useMemo(() => {
        if (dbLevels.length > 0) return dbLevels;
        return defaultLevels;
    }, [dbLevels]);

    const form = useForm<HomeworkFormValues>({
        resolver: zodResolver(homeworkFormSchema),
        defaultValues: {
            title: '',
            startDate: new Date(),
            endDate: new Date(),
            learningMode: 'group',
            courseModel: '',
            competitiveExam: '',
            homeworkType: 'mcq',
            descriptiveInputMethod: 'upload',
            questions: [{ questionText: '', options: [{text: ''}, {text: ''}], correctAnswerIndex: -1, imageUrl: undefined }],
            questionPaperContent: '',
            totalMarks: 0,
            studentIds: [],
        },
    });

    const { fields, append, remove } = useFieldArray({ control: form.control, name: "questions" });
    const { watch, setValue } = form;
    const learningMode = watch('learningMode');
    const courseModel = watch('courseModel');
    const homeworkType = watch('homeworkType');
    const descriptiveInputMethod = watch('descriptiveInputMethod');

    useEffect(() => {
        if (homeworkType === 'mcq') {
            setValue('totalMarks', 0);
            setValue('questionPaperContent', '');
            setQuestionPaperUpload({ file: null, status: 'idle', url: undefined });
            if (!watch('questions') || watch('questions')?.length === 0) {
                append({ questionText: '', options: [{text: ''}, {text: ''}], correctAnswerIndex: -1, imageUrl: undefined });
            }
        } else {
            remove();
        }
    }, [homeworkType, setValue, watch, append, remove]);

    useEffect(() => {
        if (!firestore || !user) return;
        const fetchStudents = async () => {
            try {
                const studentsQuery = query(
                    collection(firestore, 'users'), 
                    where('role', '==', 'student')
                );
                const querySnapshot = await getDocs(studentsQuery);
                const studentsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                
                const filteredStudents = studentsList.filter(student => {
                    if (user.role === 'admin') return true;
                    if (student.referredBy === user.id) return true;
                    if (user.assignedClasses && user.assignedClasses.length > 0) {
                        return (
                            (student.class && user.assignedClasses.includes(student.class)) ||
                            (student.level && user.assignedClasses.includes(student.level)) ||
                            (student.competitiveExam && user.assignedClasses.includes(student.competitiveExam))
                        );
                    }
                    return false;
                });

                filteredStudents.sort((a, b) => a.name.localeCompare(b.name));
                setAllStudents(filteredStudents);
            } catch (err: any) {
                console.warn("Error fetching students:", err);
            }
        };
        fetchStudents();

        const fetchLevels = async () => {
            try {
                const q = query(collection(firestore, 'levels'), orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(q);
                const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
                if (list.length > 0) {
                    setDbLevels(list.map((l: any) => ({ label: `${l.name} (${l.className})`, value: l.name, className: l.className })));
                }
            } catch (err) {
                console.warn("Error fetching levels:", err);
            }
        };
        fetchLevels();
    }, [firestore, user]);

    useEffect(() => {
        if (!firestore || !user) return;
        const q = query(collection(firestore, 'schedules'), where('teacherId', '==', user.id), where('type', '==', 'homework'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule))
                .sort((a,b) => (b.startDate?.toMillis() || 0) - (a.startDate?.toMillis() || 0));
            setScheduledHomework(list);
        });
        return () => unsubscribe();
    }, [firestore, user]);

    const handleQuestionPaperUpload = async (file: File) => {
        setQuestionPaperUpload({ file, status: 'uploading' });
        try {
            const uploadFormData = new FormData();
            uploadFormData.append('image', file);
            const imageUrl = await uploadImage(uploadFormData);
            setQuestionPaperUpload({ file, status: 'success', url: imageUrl });
            toast({ title: 'Success', description: 'Homework paper uploaded.' });
        } catch (error: any) {
            setQuestionPaperUpload({ file, status: 'error' });
            toast({ variant: 'destructive', title: 'Upload Failed', description: error.message || 'Could not upload file.' });
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

    const [filterValue, setFilterValue] = useState<string>('');
    const [filterSyllabus, setFilterSyllabus] = useState<string>('');

    const [searchQuery, setSearchQuery] = useState<string>('');

    useEffect(() => {
        setFilterValue('');
        setFilterSyllabus('');
        setValue('studentIds', []);
        setSearchQuery('');
    }, [courseModel, learningMode, setValue]);

    const filteredStudentsBySelection = useMemo(() => {
        return allStudents.filter(student => {
            if (learningMode !== 'one to one') return true;
            
            // Search filter
            if (searchQuery && !student.name.toLowerCase().includes(searchQuery.toLowerCase()) && !student.email.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }

            if (courseModel === 'MATHS ONLINE TUITION') {
                if (filterValue && filterValue !== 'all' && student.class !== filterValue) return false;
                if (filterSyllabus && filterSyllabus !== 'all' && student.syllabus !== filterSyllabus) return false;
            } else if (courseModel === 'TWENTY 20 BASIC MATHS') {
                if (filterValue && filterValue !== 'all' && student.level !== filterValue) return false;
            } else if (courseModel === 'COMPETITIVE EXAM') {
                if (filterValue && filterValue !== 'all' && student.competitiveExam !== filterValue) return false;
            }
            return true;
        });
    }, [allStudents, courseModel, learningMode, filterValue, filterSyllabus, searchQuery]);

    const onSubmit = async (data: HomeworkFormValues) => {
        if (!firestore || !user) return;
        setLoading(true);
        setError(null);

        try {
            const baseHomeworkData: any = {
                teacherId: user.id,
                title: data.title,
                courseModel: data.courseModel,
                learningMode: data.learningMode,
                homeworkType: data.homeworkType,
                createdAt: serverTimestamp(),
            };

            if (data.homeworkType === 'mcq') {
                 baseHomeworkData.questions = data.questions?.map(q => {
                     const cleaned: any = {
                         questionText: q.questionText,
                         options: (q.options || []).map(o => ({ text: o.text })),
                         correctAnswerIndex: q.correctAnswerIndex
                     };
                     if (q.imageUrl) cleaned.imageUrl = q.imageUrl;
                     return cleaned;
                 });
            } else if (data.homeworkType === 'descriptive') {
                if (data.descriptiveInputMethod === 'upload') {
                    if (!questionPaperUpload.url) {
                        setLoading(false);
                        throw new Error('Please upload a homework paper first.');
                    }
                    baseHomeworkData.questionPaperUrl = questionPaperUpload.url;
                } else {
                    baseHomeworkData.questions = data.questions?.map(q => {
                        const cleaned: any = { questionText: q.questionText };
                        if (q.imageUrl) cleaned.imageUrl = q.imageUrl;
                        return cleaned;
                    });
                    const questionItems = data.questions?.map((q, i) => `<li class="mb-4"><span class="font-bold underline">Q${i+1}:</span> ${q.questionText}</li>`).join('') || '';
                    baseHomeworkData.questionPaperContent = `<ul class="list-disc pl-6 space-y-4 font-sans text-base">${questionItems}</ul>`;
                }
            }

            const selectedVisuals = courseModelVisuals[data.courseModel] || { icon: 'ClipboardCheck', color: 'hsl(var(--primary))', textColor: 'hsl(var(--primary-foreground))', subject: 'Homework' };
            const baseScheduleData: any = {
                type: 'homework',
                teacherId: user.id,
                title: data.title,
                startDate: Timestamp.fromDate(data.startDate),
                endDate: Timestamp.fromDate(data.endDate),
                learningMode: data.learningMode,
                courseModel: data.courseModel,
                homeworkType: data.homeworkType,
                createdAt: serverTimestamp(),
                ...selectedVisuals,
            };

            const createForStudent = async (student: User) => {
                const homeworkRef = doc(collection(firestore, 'homeworks'));
                const scheduleRef = doc(collection(firestore, 'schedules'));

                const hData = { ...baseHomeworkData, studentId: student.id };
                const sData = { ...baseScheduleData, studentId: student.id, homeworkId: homeworkRef.id, meetLink: `/homework/submit/${homeworkRef.id}` };

                if (student.class) { hData.classes = [student.class]; sData.classes = [student.class]; }
                if (student.level) { hData.levels = [student.level]; sData.levels = [student.level]; }
                if (student.syllabus) { hData.syllabus = student.syllabus; sData.syllabus = student.syllabus; }

                await setDoc(homeworkRef, cleanObject(hData));
                await setDoc(scheduleRef, cleanObject(sData));
            };

            if (data.learningMode === 'one to one' && data.studentIds) {
                const students = allStudents.filter(s => data.studentIds?.includes(s.id));
                for (const student of students) {
                    await createForStudent(student);
                }
            } else {
                const homeworkRef = doc(collection(firestore, 'homeworks'));
                const scheduleRef = doc(collection(firestore, 'schedules'));

                const hData = { ...baseHomeworkData };
                const sData = { ...baseScheduleData, homeworkId: homeworkRef.id, meetLink: `/homework/submit/${homeworkRef.id}` };

                if (data.courseModel === 'MATHS ONLINE TUITION') {
                    if (data.classes && data.classes.length > 0) { hData.classes = data.classes; sData.classes = data.classes; }
                    if (data.syllabus) { hData.syllabus = data.syllabus; sData.syllabus = data.syllabus; }
                } else if (data.courseModel === 'TWENTY 20 BASIC MATHS') {
                    if (data.levels && data.levels.length > 0) { hData.levels = data.levels; sData.levels = data.levels; }
                } else if (data.courseModel === 'COMPETITIVE EXAM') {
                    if (data.competitiveExam) { hData.competitiveExam = data.competitiveExam; sData.competitiveExam = data.competitiveExam; }
                }

                await setDoc(homeworkRef, cleanObject(hData));
                await setDoc(scheduleRef, cleanObject(sData));
            }
            
            toast({ title: 'Homework Created!', description: 'Your homework has been successfully scheduled.' });
            form.reset();
            setQuestionPaperUpload({ file: null, status: 'idle' });
        } catch (err: any) {
            console.error("Submission error:", err);
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
                        <CardHeader><CardTitle>Homework Configuration</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField control={form.control} name="homeworkType" render={({ field }) => (
                                    <FormItem><FormLabel>Homework Type</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent><SelectItem value="mcq">Multiple Choice</SelectItem><SelectItem value="descriptive">Descriptive</SelectItem></SelectContent>
                                        </Select><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="learningMode" render={({ field }) => (
                                    <FormItem><FormLabel>Learning Mode</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
                                <FormItem><FormLabel>Homework Title</FormLabel><FormControl><Input placeholder="Homework Title" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField name="startDate" control={form.control} render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Homework Start Date</FormLabel><Popover open={isStartCalendarOpen} onOpenChange={setIsStartCalendarOpen}><PopoverTrigger asChild><FormControl>
                                        <Button variant="outline" className={cn("justify-between h-12 rounded-xl border-gray-100", !field.value && "text-muted-foreground", field.value && "text-[#FF8C00] border-[#FF8C00]/20 bg-orange-50")}>{field.value ? format(field.value, "PPP") : "Pick start date"}<CalendarIcon className="h-4 w-4 opacity-50" /></Button>
                                    </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0 border-none bg-transparent shadow-none" align="start"><Calendar mode="single" selected={field.value} onSelect={(date) => { if (date) { field.onChange(date); setIsStartCalendarOpen(false); } }} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                                )}/>
                                <FormField name="endDate" control={form.control} render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Homework End Date</FormLabel><Popover open={isEndCalendarOpen} onOpenChange={setIsEndCalendarOpen}><PopoverTrigger asChild><FormControl>
                                        <Button variant="outline" className={cn("justify-between h-12 rounded-xl border-gray-100", !field.value && "text-muted-foreground", field.value && "text-[#FF8C00] border-[#FF8C00]/20 bg-orange-50")}>{field.value ? format(field.value, "PPP") : "Pick end date"}<CalendarIcon className="h-4 w-4 opacity-50" /></Button>
                                    </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0 border-none bg-transparent shadow-none" align="start"><Calendar mode="single" selected={field.value} onSelect={(date) => { if (date) { field.onChange(date); setIsEndCalendarOpen(false); } }} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                                )}/>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader><CardTitle>Course Mapping</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                             <FormField control={form.control} name="courseModel" render={({ field }) => (
                                <FormItem><FormLabel>Course Model</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="MATHS ONLINE TUITION">MATHS ONLINE TUITION</SelectItem>
                                        <SelectItem value="TWENTY 20 BASIC MATHS">TWENTY 20 BASIC MATHS</SelectItem>
                                        <SelectItem value="COMPETITIVE EXAM">COMPETITIVE EXAM</SelectItem>
                                    </SelectContent>
                                </Select><FormMessage /></FormItem>
                            )}/>
                            {learningMode === 'one to one' ? (
                                <div className="space-y-4">
                                    {courseModel === 'MATHS ONLINE TUITION' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Filter by Class</Label>
                                                <Select onValueChange={setFilterValue} value={filterValue}>
                                                    <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">All Classes</SelectItem>
                                                        {availableClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Filter by Syllabus</Label>
                                                <Select onValueChange={setFilterSyllabus} value={filterSyllabus}>
                                                    <SelectTrigger><SelectValue placeholder="Select Syllabus" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">All Syllabuses</SelectItem>
                                                        {syllabuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    )}
                                    {courseModel === 'TWENTY 20 BASIC MATHS' && (
                                        <div className="space-y-2">
                                            <Label>Filter by Level</Label>
                                            <Select onValueChange={setFilterValue} value={filterValue}>
                                                <SelectTrigger className="h-10 rounded-xl border-gray-100 px-4 ring-offset-background focus:ring-2 focus:ring-[#FFB800] focus:ring-offset-2">
                                                    <SelectValue placeholder="Select Level" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl p-2 border border-gray-100 shadow-xl bg-white">
                                                    <SelectItem value="all" className="rounded-xl py-2 focus:bg-[#FFB800] focus:text-white data-[state=checked]:bg-[#FFB800] data-[state=checked]:text-white transition-colors cursor-pointer">All Levels</SelectItem>
                                                    {availableLevels.map(l => (
                                                        <SelectItem 
                                                            key={l.value} 
                                                            value={l.value}
                                                            className="rounded-xl py-2 focus:bg-[#FFB800] focus:text-white data-[state=checked]:bg-[#FFB800] data-[state=checked]:text-white transition-colors cursor-pointer"
                                                        >
                                                            {l.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    {courseModel === 'COMPETITIVE EXAM' && (
                                        <div className="space-y-2">
                                            <Label>Filter by Exam</Label>
                                            <Select onValueChange={setFilterValue} value={filterValue}>
                                                <SelectTrigger className="h-10 rounded-xl border-gray-100 px-4 ring-offset-background focus:ring-2 focus:ring-[#FFB800] focus:ring-offset-2">
                                                    <SelectValue placeholder="Select Exam" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl p-2 border border-gray-100 shadow-xl bg-white">
                                                    <SelectItem value="all" className="rounded-xl py-2 focus:bg-[#FFB800] focus:text-white data-[state=checked]:bg-[#FFB800] data-[state=checked]:text-white transition-colors cursor-pointer">All Exams</SelectItem>
                                                    {availableCompetitiveExams.map(e => (
                                                        <SelectItem key={e} value={e} className="rounded-xl py-2 focus:bg-[#FFB800] focus:text-white data-[state=checked]:bg-[#FFB800] data-[state=checked]:text-white transition-colors cursor-pointer">{e}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label>Search StudentName (Optional)</Label>
                                        <Input 
                                            placeholder="Search by name or email..." 
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="h-10 rounded-xl"
                                        />
                                    </div>
                                    <FormField control={form.control} name="studentIds" render={({ field }) => (
                                        <FormItem><FormLabel>Students</FormLabel>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <FormControl>
                                                        <Button variant="outline" className="w-full justify-between h-10 rounded-xl border-gray-100" disabled={filteredStudentsBySelection.length === 0}>
                                                            {field.value?.length ? `${field.value.length} students selected` : (searchQuery ? "No matches for search" : "Select students")}
                                                        </Button>
                                                    </FormControl>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="w-72 max-h-[300px] overflow-y-auto rounded-2xl border-none shadow-2xl">
                                                    {filteredStudentsBySelection.map(s => (
                                                        <DropdownMenuCheckboxItem 
                                                            key={s.id} 
                                                            checked={field.value?.includes(s.id)} 
                                                            onCheckedChange={(checked) => {
                                                                const vals = field.value || [];
                                                                field.onChange(checked ? [...vals, s.id] : vals.filter(v => v !== s.id));
                                                            }}
                                                            className="rounded-xl"
                                                        >
                                                            {s.name} ({s.class || s.level || s.competitiveExam})
                                                        </DropdownMenuCheckboxItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                </div>
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
                                        <div className="space-y-4">
                                            <FormField control={form.control} name="levels" render={({ field }) => (
                                                <FormItem><FormLabel>Level</FormLabel>
                                                    <Select onValueChange={(val) => { field.onChange([val]); setFilterValue(val); }} value={field.value?.[0] || ''}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-12 rounded-xl border-gray-100 flex items-center justify-between ring-offset-background focus:ring-2 focus:ring-[#FFB800] focus:ring-offset-2">
                                                                <SelectValue placeholder="Select a level" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="rounded-2xl border border-gray-100 shadow-xl bg-white">
                                                            {availableLevels.map(l => (
                                                                <SelectItem 
                                                                    key={l.value} 
                                                                    value={l.value}
                                                                    className="rounded-xl py-3 focus:bg-[#FFB800] focus:text-white data-[state=checked]:bg-[#FFB800] data-[state=checked]:text-white transition-colors cursor-pointer"
                                                                >
                                                                    {l.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select><FormMessage /></FormItem>
                                            )}/>

                                            {watch('levels')?.length > 0 && learningMode !== 'group' && (
                                                <FormField control={form.control} name="studentIds" render={({ field }) => (
                                                    <FormItem><FormLabel>Students</FormLabel>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <FormControl>
                                                                    <Button variant="outline" className="w-full justify-between h-10" disabled={filteredStudentsBySelection.length === 0}>
                                                                        {field.value?.length ? `${field.value.length} students selected` : "Select specific students"}
                                                                    </Button>
                                                                </FormControl>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent className="w-72 max-h-[300px] overflow-y-auto">
                                                                {filteredStudentsBySelection.map(s => (
                                                                    <DropdownMenuCheckboxItem 
                                                                        key={s.id} 
                                                                        checked={field.value?.includes(s.id)} 
                                                                        onCheckedChange={(checked) => {
                                                                            const vals = field.value || [];
                                                                            field.onChange(checked ? [...vals, s.id] : vals.filter(v => v !== s.id));
                                                                        }}
                                                                    >
                                                                        {s.name}
                                                                    </DropdownMenuCheckboxItem>
                                                                ))}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}/>
                                            )}
                                        </div>
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

                    {homeworkType === 'descriptive' && (
                        <Card className="mb-8">
                            <CardHeader><CardTitle>Descriptive Setup</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
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
                                
                                {form.watch('descriptiveInputMethod') === 'upload' && (
                                    <div className="space-y-2">
                                        <Label>Upload Homework Paper</Label>
                                        <Input type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) handleQuestionPaperUpload(e.target.files[0])}} className="file:text-foreground" />
                                        {questionPaperUpload.status === 'uploading' && <p className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin"/> Uploading...</p>}
                                        {questionPaperUpload.status === 'success' && <p className="text-xs text-success">File uploaded successfully.</p>}
                                        {questionPaperUpload.status === 'error' && <p className="text-xs text-destructive">Upload failed. Please try again.</p>}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {(homeworkType === 'mcq' || (homeworkType === 'descriptive' && form.watch('descriptiveInputMethod') === 'editor')) && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold font-headline">Questions</h2>
                                <Button type="button" variant="outline" size="sm" onClick={() => append(homeworkType === 'mcq' ? { questionText: '', options: [{text: ''}, {text: ''}], correctAnswerIndex: 0 } : { questionText: '' })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                                </Button>
                            </div>
                            {fields.map((field, index) => (
                                <Card key={field.id} className="p-6 border-l-4 border-primary relative">
                                    <div className="flex justify-between items-start mb-6">
                                        <h3 className="font-bold text-lg">Question {index + 1}</h3>
                                        <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8" onClick={() => remove(index)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="space-y-6">
                                        <FormField control={form.control} name={`questions.${index}.questionText`} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Question Text</FormLabel>
                                                <FormControl><Textarea className="min-h-32 rounded-xl" placeholder="Type your question here..." {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <QuestionImageUpload index={index} />
                                        {homeworkType === 'mcq' && <OptionsFieldArray questionIndex={index} control={form.control} />}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                    {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
                    <Button type="submit" disabled={loading} className="w-full" size="lg">{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Homework</Button>
                </form>
            </Form>
            <div className="hidden md:block sticky top-20">
                <ScheduledItemsList schedules={scheduledHomework} title="Homework List" description="A record of your created homework tasks." />
            </div>
        </div>
    );
}

function OptionsFieldArray({ questionIndex, control }: { questionIndex: number; control: any; }) {
  const { fields, append, remove } = useFieldArray({ control, name: `questions.${questionIndex}.options` });
  return (
    <div className="space-y-4 pl-4 border-l-2">
        <FormLabel>Options (Select correct one)</FormLabel>
        <Controller control={control} name={`questions.${questionIndex}.correctAnswerIndex`} render={({ field, fieldState }) => (
            <div className="space-y-2">
                <RadioGroup onValueChange={(val) => field.onChange(parseInt(val, 10))} value={String(field.value)} className="space-y-2">
                    {fields.map((optField, index) => (
                        <div key={optField.id} className="flex items-center gap-2">
                            <RadioGroupItem value={String(index)} id={`q-${questionIndex}-o-${index}`} />
                            <FormField control={control} name={`questions.${questionIndex}.options.${index}.text`} render={({ field: inputField }) => (
                                <FormItem className="flex-1">
                                    <FormControl><Input placeholder={`Option ${index + 1}`} {...inputField} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            {fields.length > 2 && <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>}
                        </div>
                    ))}
                </RadioGroup>
                {fieldState.error && <p className="text-sm font-medium text-destructive">{fieldState.error.message}</p>}
            </div>
        )}/>
        {fields.length < 4 && <Button type="button" size="sm" variant="ghost" onClick={() => append({ text: '' })} className="mt-2"><PlusCircle className="mr-2 h-4 w-4" /> Add Option</Button>}
    </div>
  );
}

function QuestionImageUpload({ index }: { index: number }) {
    const { setValue, watch } = useFormContext();
    const [uploading, setUploading] = useState(false);
    const { toast } = useToast();
    const currentImageUrl = watch(`questions.${index}.imageUrl`);
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const uploadFormData = new FormData();
            uploadFormData.append('image', file);
            const imageUrl = await uploadImage(uploadFormData);
            setValue(`questions.${index}.imageUrl`, imageUrl);
            toast({ title: 'Success', description: 'Question image uploaded.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: error.message || 'Could not upload image.' });
        } finally {
            setUploading(false);
        }
    };
    return (
        <div className="space-y-3">
            {currentImageUrl ? (
                <div className="relative w-full h-48 border rounded-md overflow-hidden bg-muted/20">
                    <Image src={currentImageUrl} alt="Question preview" fill className="object-contain" />
                    <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-lg" onClick={() => setValue(`questions.${index}.imageUrl`, undefined)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <div className="flex items-center gap-4">
                    <Input type="file" accept="image/*" onChange={handleUpload} className="file:text-foreground text-xs" disabled={uploading} />
                    {uploading && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
                </div>
            )}
        </div>
    );
}
