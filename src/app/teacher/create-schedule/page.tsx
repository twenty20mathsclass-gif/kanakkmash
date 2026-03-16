'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirebase, useUser } from '@/firebase';
import { addDoc, collection, Timestamp, query, where, onSnapshot, getDocs, serverTimestamp, orderBy, documentId } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { User, Schedule } from '@/lib/definitions';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CalendarIcon, Loader2, AlertCircle, BookText, User as UserIcon, Award, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { RecentClassesList } from '@/components/teacher/recent-classes-list';
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

const scheduleSchema = z.object({
    learningMode: z.enum(['group', 'one to one'], { required_error: 'Please select a learning mode.' }),
    courseModel: z.string().min(1, 'Please select a course model.'),
    title: z.string().min(3, 'Course title must be at least 3 characters.'),
    date: z.date({ required_error: 'A date is required.' }),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format. Use HH:MM.'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format. Use HH:MM.'),
    meetLink: z.string().url('Please enter a valid URL.'),
    classes: z.array(z.string()).optional(),
    levels: z.array(z.string()).optional(),
    syllabus: z.string().optional(),
    studentId: z.string().optional(),
    competitiveExam: z.string().optional(),
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
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

export default function CreateSchedulePage() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [allStudents, setAllStudents] = useState<User[]>([]);
    const [scheduledClasses, setScheduledClasses] = useState<Schedule[]>([]);

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

    const form = useForm<ScheduleFormValues>({
        resolver: zodResolver(scheduleSchema),
        defaultValues: {
            learningMode: 'group',
            courseModel: '',
            title: '',
            date: undefined,
            startTime: '',
            endTime: '',
            meetLink: 'https://meet.google.com/',
            classes: [],
            levels: [],
            syllabus: '',
            studentId: '',
            competitiveExam: '',
        },
    });

    const { watch, setValue } = form;
    const learningMode = watch('learningMode');
    const courseModel = watch('courseModel');
    const selectedClasses = watch('classes');

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
            } catch (serverError: any) {
                console.warn("Firestore error fetching students:", serverError);
            }
        };
        fetchStudents();
    }, [firestore, user]);

    useEffect(() => {
        if (!firestore || !user) return;
        const q = query(collection(firestore, 'schedules'), where('teacherId', '==', user.id));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const allSchedules = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule));
            setScheduledExams(allSchedules.filter(s => s.type === 'class').sort((a,b) => b.date.toMillis() - a.date.toMillis()).slice(0, 10));
        });
        return () => unsubscribe();
    }, [firestore, user]);

    const setScheduledExams = (classes: Schedule[]) => setScheduledClasses(classes);

    const onSubmit = async (data: ScheduleFormValues) => {
        if (!firestore || !user) return;
        setLoading(true);
        setError(null);

        try {
            const selectedVisuals = courseModelVisuals[data.courseModel] || { icon: 'BookOpen', color: 'hsl(var(--primary))', textColor: 'hsl(var(--primary-foreground))', subject: 'General' };
            const scheduleData: any = {
                type: 'class',
                learningMode: data.learningMode,
                courseModel: data.courseModel,
                title: data.title,
                date: Timestamp.fromDate(data.date),
                startTime: data.startTime,
                endTime: data.endTime,
                meetLink: data.meetLink,
                teacherId: user.id,
                createdAt: serverTimestamp(),
                ...selectedVisuals,
            };

            if (data.learningMode === 'one to one') {
                const student = allStudents.find(s => s.id === data.studentId);
                if (student) {
                    scheduleData.studentId = student.id;
                    if (student.class) scheduleData.classes = [student.class];
                    if (student.level) scheduleData.levels = [student.level];
                    if (student.syllabus) scheduleData.syllabus = student.syllabus;
                }
            } else {
                if (data.courseModel === 'MATHS ONLINE TUITION') {
                    scheduleData.classes = data.classes;
                    scheduleData.syllabus = data.syllabus;
                } else if (data.courseModel === 'TWENTY 20 BASIC MATHS') {
                    scheduleData.levels = data.levels;
                } else if (data.courseModel === 'COMPETITIVE EXAM') {
                    scheduleData.competitiveExam = data.competitiveExam;
                }
            }

            await addDoc(collection(firestore, 'schedules'), scheduleData);
            
            toast({ title: 'Schedule Created!', description: `Your class "${data.title}" has been successfully scheduled.` });
            form.reset({
                learningMode: 'group',
                courseModel: '',
                title: '',
                date: undefined,
                startTime: '',
                endTime: '',
                meetLink: 'https://meet.google.com/',
                classes: [],
                levels: [],
                syllabus: '',
                studentId: '',
                competitiveExam: '',
            });
        } catch (serverError: any) {
            setError('Failed to create schedule. Please try again.');
            console.error(serverError);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Create a New Schedule</h1>
                    <p className="text-muted-foreground">Add a new class to the schedule.</p>
                </div>

                <Card>
                    <CardHeader><CardTitle>Class Details</CardTitle></CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="learningMode" render={({ field }) => (
                                        <FormItem><FormLabel>Learning Mode</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="group">Group Mode</SelectItem>
                                                    <SelectItem value="one to one">One to One Mode</SelectItem>
                                                </SelectContent>
                                            </Select><FormMessage /></FormItem>
                                    )}/>
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
                                </div>

                                {learningMode === 'one to one' ? (
                                    <FormField control={form.control} name="studentId" render={({ field }) => (
                                        <FormItem><FormLabel>Student</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={allStudents.length === 0}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select a student" /></SelectTrigger></FormControl>
                                                <SelectContent>{allStudents.map(student => <SelectItem key={student.id} value={student.id}>{student.name} ({student.courseModel})</SelectItem>)}</SelectContent>
                                            </Select><FormMessage /></FormItem>
                                    )}/>
                                ) : (
                                    <>
                                        {courseModel === 'MATHS ONLINE TUITION' && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <FormField control={form.control} name="classes" render={({ field }) => (
                                                    <FormItem><FormLabel>Classes</FormLabel>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild><FormControl><Button variant="outline" className="w-full justify-between">{field.value?.length ? `${field.value.length} selected` : 'Select classes'}</Button></FormControl></DropdownMenuTrigger>
                                                            <DropdownMenuContent className="w-56"><DropdownMenuLabel>Classes</DropdownMenuLabel><DropdownMenuSeparator />
                                                                {availableClasses.map(c => (
                                                                    <DropdownMenuCheckboxItem key={c} checked={field.value?.includes(c)} onCheckedChange={(checked) => {
                                                                        const vals = field.value || [];
                                                                        field.onChange(checked ? [...vals, c] : vals.filter(v => v !== c));
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
                                                        <DropdownMenuTrigger asChild><FormControl><Button variant="outline" className="w-full justify-between">{field.value?.length ? `${field.value.length} selected` : 'Select levels'}</Button></FormControl></DropdownMenuTrigger>
                                                        <DropdownMenuContent className="w-56"><DropdownMenuLabel>Levels</DropdownMenuLabel><DropdownMenuSeparator />
                                                            {twenty20Levels.map(l => (
                                                                <DropdownMenuCheckboxItem key={l} checked={field.value?.includes(l)} onCheckedChange={(checked) => {
                                                                    const vals = field.value || [];
                                                                    field.onChange(checked ? [...vals, l] : vals.filter(v => v !== l));
                                                                }}>{l}</DropdownMenuCheckboxItem>
                                                            ))}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu><FormMessage /></FormItem>
                                            )}/>
                                        )}
                                        {courseModel === 'COMPETITIVE EXAM' && (
                                            <FormField control={form.control} name="competitiveExam" render={({ field }) => (
                                                <FormItem><FormLabel>Competitive Exam</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger></FormControl>
                                                        <SelectContent>{availableCompetitiveExams.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                                                    </Select><FormMessage /></FormItem>
                                            )}/>
                                        )}
                                    </>
                                )}

                                <FormField name="title" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Class Title</FormLabel><FormControl><Input placeholder="e.g., Chapter 1 Review" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>

                                <FormField name="date" control={form.control} render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover><PopoverTrigger asChild><FormControl>
                                        <Button variant="outline" className={cn("justify-between", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : "Pick a date"}<CalendarIcon className="h-4 w-4 opacity-50" /></Button>
                                    </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                                )}/>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField name="startTime" control={form.control} render={({ field }) => (<FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                    <FormField name="endTime" control={form.control} render={({ field }) => (<FormItem><FormLabel>End Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                </div>

                                <FormField name="meetLink" control={form.control} render={({ field }) => (<FormItem><FormLabel>Meeting Link</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>

                                {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
                                <Button type="submit" disabled={loading} className="w-full">{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Schedule</Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
            <div className="hidden md:block sticky top-20">
                <RecentClassesList schedules={scheduledClasses} />
            </div>
        </div>
    );
}
