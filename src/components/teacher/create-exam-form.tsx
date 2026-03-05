
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { useFirebase, useUser } from '@/firebase';
import { addDoc, collection, Timestamp, query, where, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CalendarIcon, Loader2, AlertCircle, PlusCircle, Trash2, BookText, User as UserIcon, Award, BookOpen, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { UploadResult } from 'firebase/storage';


const courseModelVisuals: { [key: string]: { icon: string; color: string; textColor: string; subject: string; } } = {
    'MATHS ONLINE TUITION': { icon: 'BookText', color: 'hsl(210 80% 65%)', textColor: 'hsl(var(--primary-foreground))', subject: 'Online Tuition' },
    'ONE TO ONE': { icon: 'User', color: 'hsl(270 80% 65%)', textColor: 'hsl(var(--primary-foreground))', subject: 'One to One' },
    'COMPETITIVE EXAM': { icon: 'Award', color: 'hsl(30 95% 55%)', textColor: 'hsl(var(--primary-foreground))', subject: 'Exam Prep' },
};

const classes = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).concat('DEGREE');
const syllabuses = ['Kerala State syllabus', 'CBSE kerala', 'CBSE UAE', 'CBSE KSA', 'ICSE'];
const competitiveExams = ['LSS', 'NuMATs', 'USS', 'NMMS', 'NTSE', 'PSC', 'MAT', 'KTET', 'CTET', 'NET', 'CSAT'];

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
  
  courseModel: z.string().min(1, 'Please select a course model.'),
  class: z.string().optional(),
  syllabus: z.string().optional(),
  studentId: z.string().optional(),
  competitiveExam: z.string().optional(),

  examType: z.enum(['mcq', 'descriptive'], { required_error: 'Please select an exam type.' }),
  descriptiveInputMethod: z.enum(['upload', 'editor']).optional(),
  questionPaperContent: z.string().optional(),
  totalMarks: z.coerce.number().optional(),
  questions: z.array(questionSchema).optional(),
}).superRefine((data, ctx) => {
    if (data.courseModel === 'MATHS ONLINE TUITION') {
        if (!data.class || data.class.trim() === '') {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please select a class.', path: ['class'] });
        } else if (data.class !== 'DEGREE') {
             if (!data.syllabus || data.syllabus.trim() === '') {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please select a syllabus.', path: ['syllabus'] });
            }
        }
    }
    if (data.courseModel === 'ONE TO ONE') {
        if (!data.studentId || data.studentId.trim() === '') {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please select a student.', path: ['studentId'] });
        }
    }
    if (data.courseModel === 'COMPETITIVE EXAM') {
        if (!data.competitiveExam || data.competitiveExam.trim() === '') {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please select a competitive exam.', path: ['competitiveExam'] });
        }
    }
    if (data.examType === 'mcq') {
        if (!data.questions || data.questions.length < 1) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'MCQ exam must have at least one question.', path: ['questions'] });
        }
    }
    if (data.examType === 'descriptive') {
        if (!data.totalMarks || data.totalMarks <= 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Total marks must be a positive number.', path: ['totalMarks'] });
        }
         if (data.descriptiveInputMethod === 'editor' && (!data.questionPaperContent || data.questionPaperContent.trim().length === 0)) {
            ctx.addIssue({ code: 'custom', message: 'Question paper content cannot be empty.', path: ['questionPaperContent'] });
        }
    }
});

type ExamFormValues = z.infer<typeof examFormSchema>;

export function CreateExamForm() {
    const { firestore, storage } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [allStudents, setAllStudents] = useState<User[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<User[]>([]);
    const [scheduledExams, setScheduledExams] = useState<Schedule[]>([]);
    const [imageUploadStatus, setImageUploadStatus] = useState<Record<number, 'idle' | 'uploading' | 'success' | 'error'>>({});
    const [questionPaperUpload, setQuestionPaperUpload] = useState<{ file: File | null, status: 'idle' | 'uploading' | 'success' | 'error', url?: string }>({ file: null, status: 'idle' });


    const form = useForm<ExamFormValues>({
        resolver: zodResolver(examFormSchema),
        defaultValues: {
            title: '',
            duration: 30,
            date: new Date(),
            startTime: '10:00',
            endTime: '11:00',
            courseModel: '',
            competitiveExam: '',
            examType: 'mcq',
            descriptiveInputMethod: 'upload',
            questions: [{ questionText: '', options: [{text: ''}, {text: ''}], correctAnswerIndex: -1, imageUrl: undefined }]
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "questions"
    });

    const { watch, setValue } = form;
    const courseModel = watch('courseModel');
    const selectedClass = watch('class');
    const examType = watch('examType');
    const descriptiveInputMethod = watch('descriptiveInputMethod');
    
    useEffect(() => {
        if (!firestore) return;
        const studentsQuery = query(collection(firestore, 'users'), where('role', '==', 'student'));
        const unsubscribe = onSnapshot(studentsQuery, (snapshot) => {
            const studentsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setAllStudents(studentsList);
        }, (serverError: any) => {
            if (serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: 'users',
                    operation: 'list',
                }, { cause: serverError });
                errorEmitter.emit('permission-error', permissionError);
            } else {
                console.warn("Firestore error:", serverError);
            }
        });
        return () => unsubscribe();
    }, [firestore]);

    useEffect(() => {
        if (courseModel === 'ONE TO ONE') {
            const oneToOneStudents = allStudents.filter(student => 
                student.courseModel === 'ONE TO ONE'
            );
            setFilteredStudents(oneToOneStudents);
        } else {
            setFilteredStudents([]);
        }
        setValue('studentId', '');
    }, [courseModel, allStudents, setValue]);
    
    useEffect(() => {
        if (!firestore || !user) return;
        const q = query(
            collection(firestore, 'schedules'),
            where('teacherId', '==', user.id)
        );
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const exams = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule))
                .filter(schedule => schedule.type === 'exam')
                .sort((a,b) => b.date.toMillis() - a.startTime.localeCompare(b.startTime));
            setScheduledExams(exams);
        }, (serverError: any) => {
            if (serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: 'schedules',
                    operation: 'list',
                }, { cause: serverError });
                errorEmitter.emit('permission-error', permissionError);
            } else {
                console.warn("Firestore error:", serverError);
            }
        });
        return () => unsubscribe();
    }, [firestore, user]);


    const handleImageUpload = async (file: File, questionIndex: number) => {
        if (!storage || !user) {
            toast({ variant: 'destructive', title: 'Error', description: 'Storage service is not available.' });
            return;
        };

        setImageUploadStatus(prev => ({ ...prev, [questionIndex]: 'uploading' }));

        const storageRef = ref(storage, `exam-questions/${user.id}/${Date.now()}-${file.name}`);
        
        try {
            const uploadResult = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(uploadResult.ref);
            
            setValue(`questions.${questionIndex}.imageUrl`, downloadURL, { shouldValidate: true });
            setImageUploadStatus(prev => ({ ...prev, [questionIndex]: 'success' }));
            toast({ title: 'Image Uploaded', description: 'Your image has been successfully added to the question.' });
        } catch (error: any) {
            console.warn("Image upload failed:", error);
            setImageUploadStatus(prev => ({ ...prev, [questionIndex]: 'error' }));
            let description = 'Could not upload the image. Please try again.';
            if (error.code === 'storage/unauthorized') {
                description = 'You do not have permission to upload images for exams.';
            }
            toast({ variant: 'destructive', title: 'Upload Failed', description: description });
        }
    }

    const handleQuestionPaperUpload = async (file: File) => {
        if (!storage || !user) {
            toast({ variant: 'destructive', title: 'Error', description: 'Storage service is not available.' });
            return;
        }
        setQuestionPaperUpload({ file, status: 'uploading' });

        const storageRef = ref(storage, `exam-questions/${user.id}/${Date.now()}-${file.name}`);
        try {
            const uploadResult = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(uploadResult.ref);
            setQuestionPaperUpload(prev => ({...prev, status: 'success', url: downloadURL}));
             toast({ title: 'File Uploaded', description: 'Question paper has been uploaded.' });
        } catch (error: any) {
            console.warn("File upload failed:", error);
            setQuestionPaperUpload(prev => ({...prev, status: 'error'}));
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload the file.' });
        }
    }


    const onSubmit = async (data: ExamFormValues) => {
        if (!firestore || !user) {
            setError('Authentication error. Please sign in again.');
            return;
        }
        
        if (data.examType === 'descriptive' && data.descriptiveInputMethod === 'upload' && questionPaperUpload.status !== 'success') {
            setError('Please upload a question paper file.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const examData: Partial<Exam> = {
                teacherId: user.id,
                title: data.title,
                courseModel: data.courseModel,
                examType: data.examType,
            };

            if (data.examType === 'mcq') {
                 examData.questions = data.questions?.map(q => {
                    const question: Partial<typeof q> = { ...q };
                    if (!question.imageUrl) delete question.imageUrl;
                    return question as z.infer<typeof questionSchema>;
                });
            } else { // Descriptive
                if (data.descriptiveInputMethod === 'upload') {
                    examData.questionPaperUrl = questionPaperUpload.url;
                    examData.questionPaperContent = undefined;
                } else {
                    examData.questionPaperContent = data.questionPaperContent;
                    examData.questionPaperUrl = undefined;
                }
                examData.totalMarks = data.totalMarks;
            }

            const selectedVisuals = courseModelVisuals[data.courseModel] || { icon: 'BookOpen', color: 'hsl(var(--primary))', textColor: 'hsl(var(--primary-foreground))', subject: 'General' };
            const scheduleData: Partial<Schedule> = {
                type: 'exam',
                duration: data.duration,
                teacherId: user.id,
                title: data.title,
                date: Timestamp.fromDate(data.date),
                startTime: data.startTime,
                endTime: data.endTime,
                courseModel: data.courseModel,
                ...selectedVisuals,
            };

            if (data.courseModel === 'ONE TO ONE') {
                const student = allStudents.find(s => s.id === data.studentId);
                if (student) {
                    examData.studentId = student.id;
                    scheduleData.studentId = student.id;
                    if (student.class) { examData.class = student.class; scheduleData.class = student.class; }
                    if (student.syllabus) { examData.syllabus = student.syllabus; scheduleData.syllabus = student.syllabus; }
                }
            } else if (data.courseModel === 'COMPETITIVE EXAM') {
                examData.competitiveExam = data.competitiveExam;
                scheduleData.competitiveExam = data.competitiveExam;
            } else {
                if (data.class) { examData.class = data.class; scheduleData.class = data.class; }
                if (data.syllabus) { examData.syllabus = data.syllabus; scheduleData.syllabus = data.syllabus; }
            }
            
            const examDocRef = await addDoc(collection(firestore, 'exams'), examData);
            scheduleData.examId = examDocRef.id;
            scheduleData.meetLink = `/exams/take/${examDocRef.id}`;
            await addDoc(collection(firestore, 'schedules'), scheduleData);
            
            toast({
                title: 'Exam Created & Scheduled!',
                description: `The exam "${data.title}" is now live.`,
            });
            form.reset();
            form.setValue('questions', [{ questionText: '', options: [{text: ''}, {text: ''}], correctAnswerIndex: -1, imageUrl: undefined }]);
            setQuestionPaperUpload({ file: null, status: 'idle' });

        } catch (serverError: any) {
             if (serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({ path: '/exams or /schedules', operation: 'create', requestResourceData: {data} }, { cause: serverError });
                errorEmitter.emit('permission-error', permissionError);
                setError('Failed to create exam. You may not have the required permissions.');
            } else {
                setError('An unexpected error occurred while creating the exam. Please try again.');
                console.warn("Error creating exam:", serverError);
            }
        } finally {
            setLoading(false);
        }
    };

    const showClassField = courseModel === 'MATHS ONLINE TUITION';
    const showSyllabusField = showClassField && selectedClass && selectedClass !== 'DEGREE';
    const showStudentField = courseModel === 'ONE TO ONE';
    const showCompetitiveExamField = courseModel === 'COMPETITIVE EXAM';

    return (
        <div className="grid md:grid-cols-2 gap-8 items-start">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Card>
                        <CardHeader><CardTitle>Exam Settings</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                             <FormField
                                control={form.control}
                                name="examType"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                    <FormLabel>Exam Type</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl><RadioGroupItem value="mcq" id="mcq" /></FormControl>
                                                <FormLabel htmlFor="mcq" className="font-normal">Multiple Choice</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl><RadioGroupItem value="descriptive" id="descriptive" /></FormControl>
                                                <FormLabel htmlFor="descriptive" className="font-normal">Descriptive</FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField name="title" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Exam Title</FormLabel><FormControl><Input placeholder="e.g., Algebra Mid-Term" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField name="duration" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Duration (minutes)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField name="date" control={form.control} render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Exam Date</FormLabel><Popover><PopoverTrigger asChild><FormControl>
                                        <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                               <FormField name="startTime" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField name="endTime" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>End Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader><CardTitle>Target Audience</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                             <FormField control={form.control} name="courseModel" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Course Model</FormLabel>
                                <Select onValueChange={(value) => { field.onChange(value); setValue('class', ''); setValue('syllabus', ''); setValue('studentId', ''); setValue('competitiveExam', ''); }} value={field.value || ''}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a course model" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="MATHS ONLINE TUITION">MATHS ONLINE TUITION</SelectItem>
                                        <SelectItem value="ONE TO ONE">ONE TO ONE</SelectItem>
                                        <SelectItem value="COMPETITIVE EXAM">COMPETITIVE EXAM</SelectItem>
                                    </SelectContent>
                                </Select><FormMessage />
                                </FormItem>
                            )}/>
                            {showClassField && <FormField control={form.control} name="class" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Class</FormLabel>
                                <Select onValueChange={(value) => { field.onChange(value); setValue('syllabus', ''); setValue('studentId', ''); }} value={field.value || ''}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger></FormControl>
                                    <SelectContent>{classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select><FormMessage />
                                </FormItem>
                            )}/>}
                            {showSyllabusField && <FormField control={form.control} name="syllabus" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Syllabus</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a syllabus" /></SelectTrigger></FormControl>
                                    <SelectContent>{syllabuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                </Select><FormMessage />
                                </FormItem>
                            )}/>}
                            {showStudentField && <FormField control={form.control} name="studentId" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Student</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ''} disabled={filteredStudents.length === 0}>
                                    <FormControl><SelectTrigger><SelectValue placeholder={filteredStudents.length > 0 ? "Select a student" : "No 'One to One' students found"} /></SelectTrigger></FormControl>
                                    <SelectContent>{filteredStudents.map(student => <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>)}</SelectContent>
                                </Select><FormMessage />
                                </FormItem>
                            )}/>}
                             {showCompetitiveExamField && <FormField control={form.control} name="competitiveExam" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Competitive Exam</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a competitive exam" /></SelectTrigger></FormControl>
                                    <SelectContent>{competitiveExams.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                                </Select><FormMessage />
                                </FormItem>
                            )}/>}
                        </CardContent>
                    </Card>

                    {examType === 'mcq' ? (
                        <div>
                            <div className="space-y-6">
                                <h2 className="text-xl font-bold font-headline">Questions</h2>
                                {fields.map((field, index) => (
                                    <Card key={field.id} className="relative p-6 border-l-4 border-primary">
                                        <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-muted-foreground hover:text-destructive" onClick={() => remove(index)}>
                                            <Trash2 className="h-4 w-4" /><span className="sr-only">Remove Question</span>
                                        </Button>
                                        <div className="space-y-4">
                                            <FormField control={form.control} name={`questions.${index}.questionText`} render={({ field }) => (
                                                <FormItem><FormLabel>Question {index + 1}</FormLabel><FormControl><Textarea placeholder="What is 2 + 2?" {...field} /></FormControl><FormMessage /></FormItem>
                                            )}/>
                                            <div className="space-y-2">
                                                <FormLabel>Question Image (Optional)</FormLabel>
                                                {watch(`questions.${index}.imageUrl`) ? (
                                                    <div className="relative w-48 h-32">
                                                        <Image src={watch(`questions.${index}.imageUrl`)!} alt={`Question ${index + 1} image`} fill className="object-cover rounded-md border" />
                                                        <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                                            onClick={() => { setValue(`questions.${index}.imageUrl`, undefined, { shouldValidate: true }); setImageUploadStatus(prev => ({...prev, [index]: 'idle'})); }}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Input type="file" id={`image-upload-${index}`} className="hidden" accept="image/png, image/jpeg, image/webp"
                                                            onChange={(e) => { if (e.target.files?.[0]) { handleImageUpload(e.target.files[0], index); } }}
                                                            disabled={imageUploadStatus[index] === 'uploading'}/>
                                                        <Button asChild variant="outline" type="button" disabled={imageUploadStatus[index] === 'uploading'}>
                                                            <label htmlFor={`image-upload-${index}`} className="cursor-pointer">
                                                                {imageUploadStatus[index] === 'uploading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                                                {imageUploadStatus[index] === 'uploading' ? 'Uploading...' : 'Upload Image'}
                                                            </label>
                                                        </Button>
                                                    </>
                                                )}
                                                <FormMessage>{form.formState.errors.questions?.[index]?.imageUrl?.message}</FormMessage>
                                            </div>
                                            <OptionsFieldArray questionIndex={index} control={form.control} />
                                        </div>
                                    </Card>
                                ))}
                                <Button type="button" variant="outline" onClick={() => append({ questionText: '', options: [{text: ''}, {text: ''}], correctAnswerIndex: -1, imageUrl: undefined })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                                </Button>
                            </div>
                             <div className="mt-8 space-y-4">
                                {error && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}
                                <Button type="submit" disabled={loading} className="w-full">
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create & Schedule Exam
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle>Descriptive Question Setup</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField control={form.control} name="totalMarks" render={({ field }) => (
                                    <FormItem><FormLabel>Total Marks</FormLabel><FormControl><Input type="number" placeholder="e.g., 100" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField
                                    control={form.control}
                                    name="descriptiveInputMethod"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Question Paper Method</FormLabel>
                                            <FormControl>
                                                <RadioGroup onValueChange={(value) => {
                                                    field.onChange(value);
                                                    if (value === 'upload') setValue('questionPaperContent', '');
                                                    if (value === 'editor') setQuestionPaperUpload({ file: null, status: 'idle' });
                                                }} value={field.value} className="flex space-x-4">
                                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="upload" /></FormControl><FormLabel className="font-normal">Upload File</FormLabel></FormItem>
                                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="editor" /></FormControl><FormLabel className="font-normal">Text Editor</FormLabel></FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                {descriptiveInputMethod === 'upload' ? (
                                    <div className="space-y-2">
                                        <FormLabel>Question Paper File</FormLabel>
                                        <Input type="file" accept="image/*,application/pdf" onChange={(e) => { if (e.target.files?.[0]) handleQuestionPaperUpload(e.target.files[0])}} className="file:text-foreground" disabled={questionPaperUpload.status === 'uploading'}/>
                                        {questionPaperUpload.status === 'uploading' && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin h-4 w-4"/>Uploading...</div>}
                                        {questionPaperUpload.status === 'success' && questionPaperUpload.file && <div className="text-sm text-green-600">Uploaded: {questionPaperUpload.file.name}</div>}
                                        {questionPaperUpload.status === 'error' && <div className="text-sm text-destructive">Upload failed. Please try again.</div>}
                                        <FormDescription>Upload a PDF or image file.</FormDescription>
                                    </div>
                                ) : (
                                    <FormField
                                        control={form.control}
                                        name="questionPaperContent"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Question Paper Content</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Type the question paper content here..."
                                                        className="min-h-[250px]"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </CardContent>
                             <CardFooter className="flex-col items-stretch gap-4 pt-6">
                                {error && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}
                                <Button type="submit" disabled={loading} className="w-full">
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create & Schedule Exam
                                </Button>
                            </CardFooter>
                        </Card>
                    )}
                </form>
            </Form>
            <div className="hidden md:block sticky top-20">
                <ScheduledItemsList schedules={scheduledExams} title="Recently Scheduled Exams" description="A list of exams you have scheduled." />
            </div>
        </div>
    );
}


function OptionsFieldArray({ questionIndex, control }: { questionIndex: number; control: any; }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `questions.${questionIndex}.options`,
  });

  return (
    <div className="space-y-4 pl-4 border-l-2">
        <FormLabel>Options & Correct Answer</FormLabel>
        <Controller
            control={control}
            name={`questions.${questionIndex}.correctAnswerIndex`}
            render={({ field }) => (
                <RadioGroup onValueChange={field.onChange} value={String(field.value)} className="space-y-2">
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2">
                            <FormControl>
                                <RadioGroupItem value={String(index)} id={`q-${questionIndex}-o-${index}`} />
                            </FormControl>
                            <FormField
                                control={control}
                                name={`questions.${questionIndex}.options.${index}.text`}
                                render={({ field: optionField }) => (
                                    <FormItem className="flex-1">
                                        <FormControl>
                                            <Input placeholder={`Option ${index + 1}`} {...optionField} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            {fields.length > 2 && (
                                <Button type="button" variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => remove(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                </RadioGroup>
            )}
        />
        <FormMessage>{control.getFieldState(`questions.${questionIndex}.correctAnswerIndex`).error?.message}</FormMessage>

        {fields.length < 4 && (
            <Button type="button" size="sm" variant="ghost" onClick={() => append({ text: '' })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Option
            </Button>
        )}
    </div>
  );
}
