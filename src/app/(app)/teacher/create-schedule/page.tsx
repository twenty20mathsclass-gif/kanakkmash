'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirebase, useUser } from '@/firebase';
import { addDoc, collection, Timestamp, query, where, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/definitions';

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
import { Reveal } from '@/components/shared/reveal';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


const courseModelVisuals: { [key: string]: { icon: string; color: string; textColor: string; subject: string; } } = {
    'MATHS ONLINE TUITION': { icon: 'BookText', color: 'hsl(210 80% 65%)', textColor: 'hsl(var(--primary-foreground))', subject: 'Online Tuition' },
    'ONE TO ONE': { icon: 'User', color: 'hsl(270 80% 65%)', textColor: 'hsl(var(--primary-foreground))', subject: 'One to One' },
    'COMPETITIVE EXAM': { icon: 'Award', color: 'hsl(30 95% 55%)', textColor: 'hsl(var(--primary-foreground))', subject: 'Exam Prep' },
};

const classes = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).concat('DEGREE');
const syllabuses = ['Kerala State syllabus', 'CBSE kerala', 'CBSE UAE', 'CBSE KSA', 'ICSE'];

const scheduleSchema = z.object({
  courseModel: z.string().min(1, 'Please select a course model.'),
  courseTitle: z.string().min(3, 'Course title must be at least 3 characters.'),
  date: z.date({ required_error: 'A date is required.' }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format. Use HH:MM.'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format. Use HH:MM.'),
  meetLink: z.string().url('Please enter a valid URL.'),
  class: z.string().optional(),
  syllabus: z.string().optional(),
  studentId: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.courseModel === 'MATHS ONLINE TUITION' || data.courseModel === 'ONE TO ONE') {
        if (!data.class || data.class.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Please select a class.',
                path: ['class'],
            });
        } else if (data.class !== 'DEGREE') {
             if (!data.syllabus || data.syllabus.trim() === '') {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Please select a syllabus.',
                    path: ['syllabus'],
                });
            }
        }
    }
    if (data.courseModel === 'ONE TO ONE') {
        if (!data.studentId || data.studentId.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Please select a student.',
                path: ['studentId'],
            });
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
  const [filteredStudents, setFilteredStudents] = useState<User[]>([]);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      courseModel: '',
      courseTitle: '',
      date: undefined,
      startTime: '',
      endTime: '',
      meetLink: 'https://meet.google.com/',
      class: '',
      syllabus: '',
      studentId: '',
    },
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
    }, (error) => {
      console.error("Failed to fetch students in real-time:", error);
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
    // Only re-run when selectedClass or allStudents changes.
  }, [selectedClass, allStudents]);

  useEffect(() => {
    // Reset student selection when class changes to avoid sending an invalid studentId
    setValue('studentId', '');
  }, [selectedClass, setValue]);


  const onSubmit = (data: ScheduleFormValues) => {
    if (!firestore || !user) {
      setError('You must be logged in to create a schedule.');
      return;
    }
    setLoading(true);
    setError(null);

    const selectedVisuals = courseModelVisuals[data.courseModel] || { icon: 'BookOpen', color: 'hsl(var(--primary))', textColor: 'hsl(var(--primary-foreground))', subject: 'General' };

    const scheduleData: any = {
      courseModel: data.courseModel,
      title: data.courseTitle,
      date: Timestamp.fromDate(data.date),
      startTime: data.startTime,
      endTime: data.endTime,
      meetLink: data.meetLink,
      teacherId: user.id,
      ...selectedVisuals,
    };
    
    if (data.class) {
        scheduleData.class = data.class;
    }
    if (data.syllabus) {
        scheduleData.syllabus = data.syllabus;
    }
    if (data.studentId) {
        scheduleData.studentId = data.studentId;
    }


    const schedulesCollection = collection(firestore, 'schedules');

    addDoc(schedulesCollection, scheduleData)
      .then(() => {
        toast({
          title: 'Schedule Created!',
          description: `Your class "${data.courseTitle}" has been successfully scheduled.`,
        });
        form.reset({
            courseModel: '',
            courseTitle: '',
            date: undefined,
            startTime: '',
            endTime: '',
            meetLink: 'https://meet.google.com/',
            class: '',
            syllabus: '',
            studentId: ''
        });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError(
          {
            path: schedulesCollection.path,
            operation: 'create',
            requestResourceData: scheduleData,
          },
          { cause: serverError }
        );

        errorEmitter.emit('permission-error', permissionError);

        setError(
          'Failed to create schedule. Check the developer console for details.'
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const showClassField = courseModel === 'MATHS ONLINE TUITION' || courseModel === 'ONE TO ONE';
  const showSyllabusField = showClassField && selectedClass && selectedClass !== 'DEGREE';
  const showStudentField = courseModel === 'ONE TO ONE' && !!selectedClass;

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <Reveal>
        <div>
          <h1 className="text-3xl font-bold font-headline">Create a New Schedule</h1>
          <p className="text-muted-foreground">Fill out the form below to add a new class to the student schedule.</p>
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <Card>
          <CardHeader>
            <CardTitle>Class Details</CardTitle>
            <CardDescription>All fields are required unless marked optional.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="courseModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Model</FormLabel>
                      <Select onValueChange={(value) => {
                          field.onChange(value);
                          setValue('class', '');
                          setValue('syllabus', '');
                          setValue('studentId', '');
                      }} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a course model" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MATHS ONLINE TUITION">MATHS ONLINE TUITION</SelectItem>
                          <SelectItem value="ONE TO ONE">ONE TO ONE</SelectItem>
                          <SelectItem value="COMPETITIVE EXAM">COMPETITIVE EXAM</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {showClassField && (
                    <FormField
                        control={form.control}
                        name="class"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Class</FormLabel>
                            <Select onValueChange={(value) => {
                                field.onChange(value);
                                setValue('syllabus', '');
                                setValue('studentId', '');
                            }} value={field.value || ''}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a class" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
                
                {showSyllabusField && (
                    <FormField
                        control={form.control}
                        name="syllabus"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Syllabus</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a syllabus" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {syllabuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                )}


                {showStudentField && (
                    <FormField
                        control={form.control}
                        name="studentId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Student</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''} disabled={filteredStudents.length === 0}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={filteredStudents.length > 0 ? "Select a student" : "No students in this class"} />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {filteredStudents.map(student => <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                <FormField
                  control={form.control}
                  name="courseTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Title</FormLabel>
                      <FormControl><Input placeholder="e.g., Advanced Algebra Chapter 5" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl><Input type="time" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl><Input type="time" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>

                <FormField
                  control={form.control}
                  name="meetLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Google Meet Link</FormLabel>
                      <FormControl><Input type="url" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Schedule
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
