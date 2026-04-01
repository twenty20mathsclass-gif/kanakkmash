'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, Controller, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { useFirebase, useUser } from '@/firebase';
import { collection, Timestamp, query, where, onSnapshot, getDocs, serverTimestamp, doc, setDoc, getDoc, updateDoc, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { User, Schedule, Homework } from '@/lib/definitions';
import { useRouter } from 'next/navigation';

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
import { CalendarIcon, Loader2, AlertCircle, PlusCircle, Trash2, BookText, User as UserIcon, Award, BookOpen, Upload, X, ClipboardCheck, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { uploadImage } from '@/lib/actions';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';

const classes = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).concat('DEGREE');
const syllabuses = ['Kerala State syllabus', 'CBSE kerala', 'CBSE UAE', 'CBSE KSA', 'ICSE'];
const competitiveExams = ['LSS', 'NuMATs', 'USS', 'NMMS', 'NTSE', 'PSC', 'MAT', 'KTET', 'CTET', 'NET', 'CSAT'];
const defaultLevels = [
    { label: 'Level 1 (Class 1 & 2)', value: 'Level 1', className: 'Class 1' },
    { label: 'Level 2 (Class 3 & 4)', value: 'Level 2', className: 'Class 3' },
    { label: 'Level 3 (Class 5, 6, 7)', value: 'Level 3', className: 'Class 5' },
    { label: 'Level 4 (Class 8, 9, 10)', value: 'Level 4', className: 'Class 8' },
    { label: 'Level 5 (Class +1 & +2)', value: 'Level 5', className: 'Class 11' }
];

const optionSchema = z.object({ text: z.string().min(1, { message: "Option text cannot be empty." }) });
const questionSchema = z.object({
  questionText: z.string().min(1, { message: "Question text cannot be empty." }),
  imageUrl: z.string().url().optional(),
  options: z.array(optionSchema).min(2, { message: "Must have at least two options." }).max(4, { message: "Cannot have more than 4 options." }).optional(),
  correctAnswerIndex: z.coerce.number().min(0).optional(),
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
    if (data.endDate < data.startDate) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'End date cannot be before start date.', path: ['endDate'] });
    if (data.learningMode === 'one to one' && (!data.studentIds || data.studentIds.length === 0)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please select at least one student.', path: ['studentIds'] });
});

type HomeworkFormValues = z.infer<typeof homeworkFormSchema>;

export function EditHomeworkForm({ scheduleId }: { scheduleId: string }) {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [allStudents, setAllStudents] = useState<User[]>([]);
    const [dbLevels, setDbLevels] = useState<any[]>([]);
    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [homework, setHomework] = useState<Homework | null>(null);

    const [isStartCalendarOpen, setIsStartCalendarOpen] = useState(false);
    const [isEndCalendarOpen, setIsEndCalendarOpen] = useState(false);
    const [questionPaperUpload, setQuestionPaperUpload] = useState<{ file: File | null, status: 'idle' | 'uploading' | 'success' | 'error', url?: string }>({ file: null, status: 'idle' });
    const [filterValue, setFilterValue] = useState<string>('all');
    const [filterSyllabus, setFilterSyllabus] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const availableLevels = useMemo(() => dbLevels.length > 0 ? dbLevels : defaultLevels, [dbLevels]);

    const form = useForm<HomeworkFormValues>({
        resolver: zodResolver(homeworkFormSchema),
        defaultValues: { title: '', startDate: new Date(), endDate: new Date(), learningMode: 'group', courseModel: '', homeworkType: 'mcq', descriptiveInputMethod: 'upload', questions: [], totalMarks: 0 },
    });

    const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: "questions" });
    const { watch, setValue } = form;
    const learningMode = watch('learningMode');
    const courseModel = watch('courseModel');
    const homeworkType = watch('homeworkType');

    useEffect(() => {
        if (!firestore) return;
        const fetchData = async () => {
            try {
                const sDoc = await getDoc(doc(firestore, 'schedules', scheduleId));
                if (!sDoc.exists()) {
                    setError("Schedule not found.");
                    setLoading(false);
                    return;
                }
                const sData = { id: sDoc.id, ...sDoc.data() } as Schedule;
                setSchedule(sData);

                if (sData.homeworkId) {
                    const hDoc = await getDoc(doc(firestore, 'homeworks', sData.homeworkId));
                    if (hDoc.exists()) {
                        const hData = { id: hDoc.id, ...hDoc.data() } as Homework;
                        setHomework(hData);

                        form.reset({
                            title: sData.title,
                            startDate: sData.startDate?.toDate() || new Date(),
                            endDate: sData.endDate?.toDate() || new Date(),
                            learningMode: sData.learningMode as any || 'group',
                            courseModel: sData.courseModel,
                            classes: sData.classes || [],
                            levels: sData.levels || [],
                            syllabus: sData.syllabus || '',
                            studentIds: sData.studentIds || (sData.studentId ? [sData.studentId] : []),
                            competitiveExam: sData.competitiveExam || '',
                            homeworkType: hData.homeworkType,
                            descriptiveInputMethod: hData.questionPaperUrl ? 'upload' : 'editor',
                            questionPaperContent: hData.questionPaperContent || '',
                            questions: hData.questions || [],
                        });
                        if (hData.questionPaperUrl) {
                            setQuestionPaperUpload({ file: null, status: 'success', url: hData.questionPaperUrl });
                        }
                    }
                }
                setLoading(false);
            } catch (err) {
                console.error("Error fetching data:", err);
                setError("Failed to load details.");
                setLoading(false);
            }
        };
        fetchData();
    }, [firestore, scheduleId, form]);

    useEffect(() => {
        if (!firestore || !user) return;
        const fetchStudents = async () => {
             const studentsQuery = query(collection(firestore, 'users'), where('role', '==', 'student'));
             const querySnapshot = await getDocs(studentsQuery);
             const studentsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
             setAllStudents(studentsList.sort((a, b) => a.name.localeCompare(b.name)));
        };
        const fetchLevels = async () => {
            const q = query(collection(firestore, 'levels'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            if (list.length > 0) setDbLevels(list.map((l: any) => ({ label: `${l.name} (${l.className})`, value: l.name, className: l.className })));
        };
        fetchStudents();
        fetchLevels();
    }, [firestore, user]);

    useEffect(() => {
        setFilterValue('all');
        setFilterSyllabus('all');
        setSearchQuery('');
    }, [courseModel, learningMode]);

    const filteredStudentsBySelection = useMemo(() => {
        return allStudents.filter(student => {
            if (learningMode !== 'one to one') return true;
            if (searchQuery && !student.name.toLowerCase().includes(searchQuery.toLowerCase()) && !student.email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
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
            toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
        }
    }

    const onSubmit = async (data: HomeworkFormValues) => {
        if (!firestore || !schedule || !homework) return;
        setSaving(true);
        try {
            const homeworkUpdate: any = { 
                title: data.title, 
                courseModel: data.courseModel, 
                learningMode: data.learningMode, 
                homeworkType: data.homeworkType 
            };
            if (data.homeworkType === 'mcq') {
                homeworkUpdate.questions = data.questions;
            } else {
                if (data.descriptiveInputMethod === 'upload') {
                     if (questionPaperUpload.url) homeworkUpdate.questionPaperUrl = questionPaperUpload.url;
                } else {
                     homeworkUpdate.questions = data.questions;
                     const questionItems = data.questions?.map((q, i) => `<li class="mb-4"><span class="font-bold underline">Q${i+1}:</span> ${q.questionText}</li>`).join('') || '';
                     homeworkUpdate.questionPaperContent = `<ul class="list-disc pl-6 space-y-4 font-sans text-base">${questionItems}</ul>`;
                }
            }

            const scheduleUpdate: any = {
                title: data.title,
                startDate: Timestamp.fromDate(data.startDate),
                endDate: Timestamp.fromDate(data.endDate),
                learningMode: data.learningMode,
                courseModel: data.courseModel,
                classes: data.classes || [],
                levels: data.levels || [],
                syllabus: data.syllabus || '',
                studentIds: data.studentIds || [],
                studentId: data.studentIds?.[0] || '', // Maintain backward compatibility if needed
                competitiveExam: data.competitiveExam || '',
            };

            await updateDoc(doc(firestore, 'homeworks', homework.id), homeworkUpdate);
            await updateDoc(doc(firestore, 'schedules', schedule.id), scheduleUpdate);
            toast({ title: 'Updated!', description: 'Homework has been updated.' });
            router.push('/teacher/homework');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
    if (error) return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                 <Card>
                    <CardHeader><CardTitle>Basic Configuration</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                         <FormField control={form.control} name="title" render={({ field }) => (
                            <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                         )}/>
                         <div className="grid grid-cols-2 gap-4">
                            <FormField name="startDate" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Start Date</FormLabel><Popover open={isStartCalendarOpen} onOpenChange={setIsStartCalendarOpen}><PopoverTrigger asChild><Button variant="outline" className="w-full justify-between">{field.value ? format(field.value, "PPP") : "Pick date"}<CalendarIcon className="h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value} onSelect={(d) => { if (d) { field.onChange(d); setIsStartCalendarOpen(false); } }} initialFocus /></PopoverContent></Popover></FormItem>
                            )}/>
                             <FormField name="endDate" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>End Date</FormLabel><Popover open={isEndCalendarOpen} onOpenChange={setIsEndCalendarOpen}><PopoverTrigger asChild><Button variant="outline" className="w-full justify-between">{field.value ? format(field.value, "PPP") : "Pick date"}<CalendarIcon className="h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value} onSelect={(d) => { if (d) { field.onChange(d); setIsEndCalendarOpen(false); } }} initialFocus /></PopoverContent></Popover></FormItem>
                            )}/>
                         </div>
                    </CardContent>
                 </Card>

                 <Card>
                    <CardHeader><CardTitle>Targeting</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <FormField control={form.control} name="courseModel" render={({ field }) => (
                            <FormItem><FormLabel>Course Model</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="MATHS ONLINE TUITION">MATHS ONLINE TUITION</SelectItem><SelectItem value="TWENTY 20 BASIC MATHS">TWENTY 20 BASIC MATHS</SelectItem><SelectItem value="COMPETITIVE EXAM">COMPETITIVE EXAM</SelectItem></SelectContent></Select></FormItem>
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
                                                    {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Filter by Level</Label>
                                            <Select onValueChange={(val) => { setFilterValue(val); }} value={filterValue}>
                                                <SelectTrigger className="h-12 rounded-xl border-gray-100 px-4 ring-offset-background focus:ring-2 focus:ring-[#FFB800] focus:ring-offset-2">
                                                    <SelectValue placeholder="Select Level" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl p-2 border border-gray-100 shadow-xl bg-white">
                                                    <SelectItem value="all" className="rounded-xl py-2 focus:bg-[#FFB800] focus:text-white data-[state=checked]:bg-[#FFB800] data-[state=checked]:text-white transition-colors cursor-pointer">
                                                        All Levels
                                                    </SelectItem>
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
                                    </div>
                                )}
                                {courseModel === 'COMPETITIVE EXAM' && (
                                    <div className="space-y-2">
                                        <Label>Filter by Exam</Label>
                                        <Select onValueChange={setFilterValue} value={filterValue}>
                                            <SelectTrigger className="h-10 rounded-xl border-gray-100 px-4">
                                                <SelectValue placeholder="Select Exam" />
                                            </SelectTrigger>
                                            ...
                                        </Select>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label>Search StudentName (Optional)</Label>
                                    <Input placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                </div>
                                <FormField control={form.control} name="studentIds" render={({ field }) => (
                                    <FormItem><FormLabel>Students</FormLabel>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button 
                                                    variant="outline" 
                                                    className="w-full h-12 rounded-xl border-gray-100 text-left justify-between px-4"
                                                    disabled={filteredStudentsBySelection.length === 0}
                                                >
                                                    {field.value?.length 
                                                        ? `${field.value.length} student${field.value.length > 1 ? 's' : ''} selected` 
                                                        : (searchQuery ? "No matches for search" : "Select students")}
                                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-[300px] overflow-y-auto rounded-2xl p-2 shadow-xl border-gray-100 bg-white">
                                                {filteredStudentsBySelection.map(s => (
                                                    <DropdownMenuCheckboxItem
                                                        key={s.id}
                                                        checked={field.value?.includes(s.id)}
                                                        onCheckedChange={(checked) => {
                                                            const current = field.value || [];
                                                            field.onChange(checked 
                                                                ? [...current, s.id] 
                                                                : current.filter(id => id !== s.id)
                                                            );
                                                        }}
                                                        className="rounded-xl py-2 px-4 focus:bg-[#FFB800] focus:text-white data-[state=checked]:text-[#FFB800] transition-colors"
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
                                    <FormField control={form.control} name="classes" render={({ field }) => (
                                        <FormItem><FormLabel>Classes</FormLabel><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="w-full text-left">{field.value?.length ? `${field.value.length} selected` : 'Select classes'}</Button></DropdownMenuTrigger><DropdownMenuContent>{classes.map(c => <DropdownMenuCheckboxItem key={c} checked={field.value?.includes(c)} onCheckedChange={(ch) => { const v = field.value || []; field.onChange(ch ? [...v, c] : v.filter(x => x !== c)); }}>{c}</DropdownMenuCheckboxItem>)}</DropdownMenuContent></DropdownMenu></FormItem>
                                    )}/>
                                )}
                                {courseModel === 'TWENTY 20 BASIC MATHS' && (
                                     <FormField control={form.control} name="levels" render={({ field }) => (
                                        <FormItem><FormLabel>Level</FormLabel>
                                            <Select onValueChange={(val) => field.onChange([val])} value={field.value?.[0] || ''}>
                                                <FormControl>
                                                    <SelectTrigger className="h-10 rounded-xl border-gray-100 px-4"><SelectValue /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="rounded-2xl p-2 border-gray-100 shadow-xl">
                                                    <div className="space-y-1">
                                                        {availableLevels.map(l => (
                                                            <SelectItem 
                                                                key={l.value} 
                                                                value={l.value}
                                                                className="rounded-xl py-2 px-4 focus:bg-[#FFB800] focus:text-white data-[state=checked]:bg-[#FFB800] data-[state=checked]:text-white transition-colors cursor-pointer"
                                                            >
                                                                {l.label}
                                                            </SelectItem>
                                                        ))}
                                                    </div>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}/>
                                )}
                            </>
                        )}
                    </CardContent>
                 </Card>

                 {(homeworkType === 'mcq' || (homeworkType === 'descriptive' && watch('descriptiveInputMethod') === 'editor')) && (
                    <div className="space-y-6">
                         {fields.map((field, index) => (
                            <Card key={field.id} className="p-6">
                                <div className="flex justify-between items-center mb-4"><h3 className="font-bold">Question {index + 1}</h3><Button size="icon" variant="ghost" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button></div>
                                <FormField control={form.control} name={`questions.${index}.questionText`} render={({ field }) => (
                                    <FormItem><FormLabel>Question</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
                                )}/>
                                {homeworkType === 'mcq' && <OptionsFieldArray questionIndex={index} control={form.control} />}
                            </Card>
                         ))}
                         <Button type="button" onClick={() => append({ questionText: '', options: [{text: ''}, {text: ''}], correctAnswerIndex: 0 })}>Add Question</Button>
                    </div>
                 )}

                 <Button type="submit" disabled={saving} className="w-full">{saving && <Loader2 className="animate-spin mr-2" />} Update Homework</Button>
            </form>
        </Form>
    );
}

function OptionsFieldArray({ questionIndex, control }: { questionIndex: number; control: any; }) {
  const { fields, append, remove } = useFieldArray({ control, name: `questions.${questionIndex}.options` });
  return (
    <div className="space-y-4 pl-4 border-l-2 mt-4">
        <Label className="text-sm font-medium">Options (Select correct one)</Label>
        <Controller control={control} name={`questions.${questionIndex}.correctAnswerIndex`} render={({ field, fieldState }) => (
            <div className="space-y-2">
                <RadioGroup onValueChange={(val) => field.onChange(parseInt(val, 10))} value={String(field.value)} className="space-y-2">
                    {fields.map((optField, index) => (
                        <div key={optField.id} className="flex items-center gap-2">
                            <RadioGroupItem value={String(index)} id={`edit-q-${questionIndex}-o-${index}`} />
                            <FormField control={control} name={`questions.${questionIndex}.options.${index}.text`} render={({ field: inputField }) => (
                                <FormItem className="flex-1">
                                    <FormControl><Input placeholder={`Option ${index + 1}`} {...inputField} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            {fields.length > 2 && <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>}
                        </div>
                    ))}
                </RadioGroup>
                {fieldState.error && <p className="text-sm font-medium text-destructive">{fieldState.error.message}</p>}
            </div>
        )}/>
        <Button type="button" variant="ghost" size="sm" onClick={() => append({ text: '' })}><PlusCircle className="mr-2 h-4 w-4" /> Add Option</Button>
    </div>
  );
}
