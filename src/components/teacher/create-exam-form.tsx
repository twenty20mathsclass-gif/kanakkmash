'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, Controller, useFormContext } from 'react-hook-form';
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
import { uploadImage } from '@/lib/actions';


const courseModelVisuals: { [key: string]: { icon: string; color: string; textColor: string; subject: string; } } = {
    'MATHS ONLINE TUITION': { icon: 'BookText', color: 'hsl(210 80% 65%)', textColor: 'hsl(var(--primary-foreground))', subject: 'Online Tuition' },
    'TWENTY 20 BASIC MATHS': { icon: 'BookOpen', color: 'hsl(270 80% 65%)', textColor: 'hsl(var(--primary-foreground))', subject: 'Basic Maths' },
    'COMPETITIVE EXAM': { icon: 'Award', color: 'hsl(30 95% 55%)', textColor: 'hsl(var(--primary-foreground))', subject: 'Exam Prep' },
};

const classes = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).concat('DEGREE');
const syllabuses = ['Kerala State syllabus', 'CBSE kerala', 'CBSE UAE', 'CBSE KSA', 'ICSE'];
const competitiveExams = ['LSS', 'NuMATs', 'USS', 'NMMS', 'NTSE', 'PSC', 'MAT', 'KTET', 'CTET', 'NET', 'CSAT'];
const twenty20Levels = [
    { label: 'Level 1 (Class 1 & 2)', value: 'Level 1' },
    { label: 'Level 2 (Class 3 & 4)', value: 'Level 2' },
    { label: 'Level 3 (Class 5, 6, 7)', value: 'Level 3' },
    { label: 'Level 4 (Class 8, 9, 10)', value: 'Level 4' },
    { label: 'Level 5 (Class +1 & +2)', value: 'Level 5' }
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
        if (data.descriptiveInputMethod === 'editor') {
            if (!data.questions || data.questions.length < 1) {
                ctx.addIssue({ code: 'custom', message: 'Please add at least one question.', path: ['questions'] });
            }
        } else if (data.descriptiveInputMethod === 'upload') {
            // Checked in onSubmit as it uses local state
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
        if (user?.role === 'admin' || user?.role === 'teacher') return classes;
        return [];
    }, [user]);

    const availableCompetitiveExams = useMemo(() => {
        if (user?.role === 'admin' || user?.role === 'teacher') return competitiveExams;
        return [];
    }, [user]);

    const availableLevels = useMemo(() => {
        if (user?.role === 'admin' || user?.role === 'teacher') return twenty20Levels;
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
                // Fetch all students.
                const studentsQuery = query(
                    collection(firestore, 'users'), 
                    where('role', '==', 'student')
                );
                
                const querySnapshot = await getDocs(studentsQuery);
                const studentsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                
                // Filter client-side to show only relevant students to this teacher/admin
                const filteredStudents = studentsList.filter(student => {
                    if (user.role === 'admin') return true;
                    
                    // Show if referred by this teacher
                    if (student.referredBy === user.id) return true;
                    
                    // Show if in one of the teacher's assigned classes/exams/levels
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
        setQuestionPaperUpload({ file, status: 'uploading' });
        try {
            const uploadFormData = new FormData();
            uploadFormData.append('image', file);
            
            const imageUrl = await uploadImage(uploadFormData);
            
            setQuestionPaperUpload({ file, status: 'success', url: imageUrl });
            toast({ title: 'Success', description: 'Question paper uploaded.' });
        } catch (error: any) {
            console.error("Upload error:", error);
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

    useEffect(() => {
        setFilterValue('');
        setFilterSyllabus('');
        setValue('studentId', '');
    }, [courseModel, learningMode, setValue]);

    const filteredStudentsBySelection = useMemo(() => {
        return allStudents.filter(student => {
            if (learningMode !== 'one to one') return true;
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
    }, [allStudents, courseModel, learningMode, filterValue, filterSyllabus]);

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
                         options: (q.options || []).map(o => ({ text: o.text })),
                         correctAnswerIndex: q.correctAnswerIndex
                     };
                     if (q.imageUrl) cleaned.imageUrl = q.imageUrl;
                     return cleaned;
                 });
            } else if (data.examType === 'descriptive') {
                if (data.descriptiveInputMethod === 'upload') {
                    if (!questionPaperUpload.url) {
                        setLoading(false);
                        throw new Error('Please upload a question paper first.');
                    }
                    examData.questionPaperUrl = questionPaperUpload.url;
                } else {
                    // Editor mode: use the structured questions array
                    examData.questions = data.questions?.map(q => {
                        const cleaned: any = { questionText: q.questionText };
                        if (q.imageUrl) cleaned.imageUrl = q.imageUrl;
                        return cleaned;
                    });
                    
                    // Backup: join them into a formatted HTML string for the student interface
                    const questionItems = data.questions?.map((q, i) => `<li class="mb-4"><span class="font-bold underline">Q${i+1}:</span> ${q.questionText}</li>`).join('') || '';
                    examData.questionPaperContent = `<ul class="list-disc pl-6 space-y-4 font-sans text-base">${questionItems}</ul>`;
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
                                                <SelectTrigger><SelectValue placeholder="Select Level" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Levels</SelectItem>
                                                    {availableLevels.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    {courseModel === 'COMPETITIVE EXAM' && (
                                        <div className="space-y-2">
                                            <Label>Filter by Exam</Label>
                                            <Select onValueChange={setFilterValue} value={filterValue}>
                                                <SelectTrigger><SelectValue placeholder="Select Exam" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Exams</SelectItem>
                                                    {availableCompetitiveExams.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    <FormField control={form.control} name="studentId" render={({ field }) => (
                                        <FormItem><FormLabel>Student</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={filteredStudentsBySelection.length === 0}>
                                                <FormControl><SelectTrigger><SelectValue placeholder={filteredStudentsBySelection.length === 0 ? "No matches found" : "Select a student"} /></SelectTrigger></FormControl>
                                                <SelectContent>{filteredStudentsBySelection.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.class || s.level || s.competitiveExam})</SelectItem>)}</SelectContent>
                                            </Select><FormMessage /></FormItem>
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
                                        <FormField control={form.control} name="levels" render={({ field }) => (
                                            <FormItem><FormLabel>Level</FormLabel>
                                                <Select 
                                                    onValueChange={(val) => field.onChange([val])} 
                                                    value={field.value?.[0] || ''}
                                                    disabled={availableLevels.length === 0}
                                                >
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {availableLevels.map(l => (
                                                            <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select><FormMessage /></FormItem>
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

                    {examType === 'descriptive' && (
                        <Card className="mb-8">
                            <CardHeader><CardTitle>Descriptive Setup</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <FormField name="totalMarks" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Total Marks</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
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
                                        <Label>Upload Question Paper</Label>
                                        <Input type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) handleQuestionPaperUpload(e.target.files[0])}} className="file:text-foreground" />
                                        {questionPaperUpload.status === 'uploading' && <p className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin"/> Uploading...</p>}
                                        {questionPaperUpload.status === 'success' && <p className="text-xs text-success">File uploaded successfully.</p>}
                                        {questionPaperUpload.status === 'error' && <p className="text-xs text-destructive">Upload failed. Please try again.</p>}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {(examType === 'mcq' || (examType === 'descriptive' && form.watch('descriptiveInputMethod') === 'editor')) && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold font-headline">Questions</h2>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => append(examType === 'mcq' ? { questionText: '', options: [{text: ''}, {text: ''}], correctAnswerIndex: 0 } : { questionText: '' })}
                                >
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Question
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
                                                <FormControl><Textarea className="min-h-32 rounded-xl focus-visible:ring-primary/20" placeholder="Type your question here..." {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        
                                        <QuestionImageUpload index={index} />
                                        
                                        {examType === 'mcq' && <OptionsFieldArray questionIndex={index} control={form.control} />}
                                    </div>
                                </Card>
                            ))}
                            {fields.length === 0 && (
                                <div className="text-center py-12 border-2 border-dashed rounded-3xl bg-muted/5">
                                    <p className="text-muted-foreground mb-4">No questions added yet.</p>
                                    <Button type="button" onClick={() => append(examType === 'mcq' ? { questionText: '', options: [{text: ''}, {text: ''}], correctAnswerIndex: 0 } : { questionText: '' })}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Start Adding Questions
                                    </Button>
                                </div>
                            )}
                            {fields.length > 0 && (
                                <Button type="button" variant="outline" onClick={() => append(examType === 'mcq' ? { questionText: '', options: [{text: ''}, {text: ''}], correctAnswerIndex: 0 } : { questionText: '' })} className="w-full h-12 rounded-xl border-dashed">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Another Question
                                </Button>
                            )}
                        </div>
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
            console.error("Upload error:", error);
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
                    <Button 
                        type="button" 
                        variant="destructive" 
                        size="icon" 
                        className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-lg"
                        onClick={() => setValue(`questions.${index}.imageUrl`, undefined)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <div className="flex items-center gap-4">
                    <Input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleUpload} 
                        className="file:text-foreground text-xs" 
                        disabled={uploading}
                    />
                    {uploading && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
                </div>
            )}
        </div>
    );
}