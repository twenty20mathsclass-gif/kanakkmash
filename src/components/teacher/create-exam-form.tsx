
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

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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


const courseModelVisuals: { [key: string]: { icon: string; color: string; textColor: string; subject: string; } } = {
    'MATHS ONLINE TUITION': { icon: 'BookText', color: 'hsl(210 80% 65%)', textColor: 'hsl(var(--primary-foreground))', subject: 'Online Tuition' },
    'ONE TO ONE': { icon: 'User', color: 'hsl(270 80% 65%)', textColor: 'hsl(var(--primary-foreground))', subject: 'One to One' },
    'COMPETITIVE EXAM': { icon: 'Award', color: 'hsl(30 95% 55%)', textColor: 'hsl(var(--primary-foreground))', subject: 'Exam Prep' },
};

const classes = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).concat('DEGREE');
const syllabuses = ['Kerala State syllabus', 'CBSE kerala', 'CBSE UAE', 'CBSE KSA', 'ICSE'];

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

  questions: z.array(questionSchema).min(1, 'An exam must have at least one question.'),
}).superRefine((data, ctx) => {
    if (data.courseModel === 'MATHS ONLINE TUITION' || data.courseModel === 'ONE TO ONE') {
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

    const form = useForm<ExamFormValues>({
        resolver: zodResolver(examFormSchema),
        defaultValues: {
            title: '',
            duration: 30,
            date: new Date(),
            startTime: '10:00',
            endTime: '11:00',
            courseModel: '',
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
    
    useEffect(() => {
        if (!firestore) return;
        const studentsQuery = query(collection(firestore, 'users'), where('role', '==', 'student'));
        const unsubscribe = onSnapshot(studentsQuery, (snapshot) => {
            const studentsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setAllStudents(studentsList);
        }, async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: 'users',
                operation: 'list',
            }, { cause: serverError });
            errorEmitter.emit('permission-error', permissionError);
        });
        return () => unsubscribe();
    }, [firestore]);

    useEffect(() => {
        if (selectedClass) {
            const studentsInClass = allStudents.filter(student => student.class === selectedClass);
            setFilteredStudents(studentsInClass);
        } else {
            setFilteredStudents([]);
        }
        setValue('studentId', '');
    }, [selectedClass, allStudents, setValue]);
    
    useEffect(() => {
        if (!firestore || !user) return;
        const q = query(
            collection(firestore, 'schedules'),
            where('teacherId', '==', user.id),
            where('type', '==', 'exam')
        );
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const exams = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule))
                .sort((a,b) => b.date.toMillis() - a.date.toMillis() || b.startTime.localeCompare(a.startTime));
            setScheduledExams(exams);
        }, async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: 'schedules',
                operation: 'list',
            }, { cause: serverError });
            errorEmitter.emit('permission-error', permissionError);
        });
        return () => unsubscribe();
    }, [firestore, user]);


    const handleImageUpload = async (file: File, questionIndex: number) => {
        if (!storage || !user) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Storage service is not available.'
            });
            return;
        };

        setImageUploadStatus(prev => ({ ...prev, [questionIndex]: 'uploading' }));

        const storageRef = ref(storage, `exam-questions/${user.id}/${Date.now()}-${file.name}`);
        
        try {
            const uploadResult = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(uploadResult.ref);
            
            setValue(`questions.${questionIndex}.imageUrl`, downloadURL, { shouldValidate: true });
            setImageUploadStatus(prev => ({ ...prev, [questionIndex]: 'success' }));
            toast({
                title: 'Image Uploaded',
                description: 'Your image has been successfully added to the question.'
            });
        } catch (e) {
            console.error("Image upload failed", e);
            setImageUploadStatus(prev => ({ ...prev, [questionIndex]: 'error' }));
            toast({
                variant: 'destructive',
                title: 'Upload Failed',
                description: 'Could not upload the image. Please try again.'
            });
        }
    }


    const onSubmit = async (data: ExamFormValues) => {
        if (!firestore || !user) {
            setError('Authentication error. Please sign in again.');
            return;
        }
        setLoading(true);
        setError(null);

        try {
             // Sanitize questions to remove undefined imageUrls
            const sanitizedQuestions = data.questions.map(q => {
                const question: Partial<typeof q> = { ...q };
                if (!question.imageUrl) {
                    delete question.imageUrl;
                }
                return question as z.infer<typeof questionSchema>;
            });

            // 1. Create the exam content document
            const examData: Omit<Exam, 'id'> = {
                teacherId: user.id,
                title: data.title,
                courseModel: data.courseModel,
                questions: sanitizedQuestions,
                ...(data.class && { class: data.class }),
                ...(data.syllabus && { syllabus: data.syllabus }),
                ...(data.studentId && { studentId: data.studentId }),
            };
            const examDocRef = await addDoc(collection(firestore, 'exams'), examData);

            // 2. Create the schedule document
            const selectedVisuals = courseModelVisuals[data.courseModel] || { icon: 'BookOpen', color: 'hsl(var(--primary))', textColor: 'hsl(var(--primary-foreground))', subject: 'General' };
            const scheduleData: Omit<Schedule, 'id'> = {
                type: 'exam',
                examId: examDocRef.id,
                duration: data.duration,
                teacherId: user.id,
                title: data.title,
                date: Timestamp.fromDate(data.date),
                startTime: data.startTime,
                endTime: data.endTime,
                courseModel: data.courseModel,
                meetLink: `https://kanakkmash.com/exams/take/${examDocRef.id}`, // Placeholder link
                ...selectedVisuals,
                ...(data.class && { class: data.class }),
                ...(data.syllabus && { syllabus: data.syllabus }),
                ...(data.studentId && { studentId: data.studentId }),
            };
            await addDoc(collection(firestore, 'schedules'), scheduleData);
            
            toast({
                title: 'Exam Created & Scheduled!',
                description: `The exam "${data.title}" is now live.`,
            });
            form.reset();
            form.setValue('questions', [{ questionText: '', options: [{text: ''}, {text: ''}], correctAnswerIndex: -1, imageUrl: undefined }]);

        } catch (serverError) {
            const permissionError = new FirestorePermissionError(
                { path: '/exams or /schedules', operation: 'create', requestResourceData: {data} },
                { cause: serverError }
            );
            errorEmitter.emit('permission-error', permissionError);
            setError('Failed to create exam. You may not have the required permissions.');
            console.error(serverError);
        } finally {
            setLoading(false);
        }
    };

    const showClassField = courseModel === 'MATHS ONLINE TUITION' || courseModel === 'ONE TO ONE';
    const showSyllabusField = showClassField && selectedClass && selectedClass !== 'DEGREE';
    const showStudentField = courseModel === 'ONE TO ONE' && !!selectedClass;

    return (
        <div className="grid md:grid-cols-2 gap-8 items-start">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Card>
                        <CardHeader><CardTitle>Exam Settings</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
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
                                <Select onValueChange={(value) => { field.onChange(value); setValue('class', ''); setValue('syllabus', ''); setValue('studentId', ''); }} value={field.value || ''}>
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
                                    <FormControl><SelectTrigger><SelectValue placeholder={filteredStudents.length > 0 ? "Select a student" : "No students in this class"} /></SelectTrigger></FormControl>
                                    <SelectContent>{filteredStudents.map(student => <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>)}</SelectContent>
                                </Select><FormMessage />
                                </FormItem>
                            )}/>}
                        </CardContent>
                    </Card>

                    <div>
                        <h2 className="text-xl font-bold mb-4 font-headline">Questions</h2>
                        <div className="space-y-6">
                        {fields.map((field, index) => (
                            <Card key={field.id} className="relative p-6 border-l-4 border-primary">
                                <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-muted-foreground hover:text-destructive" onClick={() => remove(index)}>
                                    <Trash2 className="h-4 w-4" /><span className="sr-only">Remove Question</span>
                                </Button>
                                <div className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name={`questions.${index}.questionText`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Question {index + 1}</FormLabel>
                                                <FormControl><Textarea placeholder="What is 2 + 2?" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="space-y-2">
                                        <FormLabel>Question Image (Optional)</FormLabel>
                                        {watch(`questions.${index}.imageUrl`) ? (
                                            <div className="relative w-48 h-32">
                                                <Image src={watch(`questions.${index}.imageUrl`)!} alt={`Question ${index + 1} image`} layout="fill" objectFit="cover" className="rounded-md border" />
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                                    onClick={() => {
                                                        setValue(`questions.${index}.imageUrl`, undefined);
                                                        setImageUploadStatus(prev => ({...prev, [index]: 'idle'}));
                                                    }}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <Input 
                                                    type="file" 
                                                    id={`image-upload-${index}`}
                                                    className="hidden"
                                                    accept="image/png, image/jpeg, image/webp"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            handleImageUpload(file, index);
                                                        }
                                                    }}
                                                    disabled={imageUploadStatus[index] === 'uploading'}
                                                />
                                                <Button asChild variant="outline" type="button">
                                                    <label htmlFor={`image-upload-${index}`} className="cursor-pointer">
                                                        {imageUploadStatus[index] === 'uploading' 
                                                            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            : <Upload className="mr-2 h-4 w-4" />
                                                        }
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
                        </div>
                        <Button type="button" variant="outline" className="mt-6" onClick={() => append({ questionText: '', options: [{text: ''}, {text: ''}], correctAnswerIndex: -1, imageUrl: undefined })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                        </Button>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <Button type="submit" disabled={loading} className="w-full">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create & Schedule Exam
                    </Button>
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
