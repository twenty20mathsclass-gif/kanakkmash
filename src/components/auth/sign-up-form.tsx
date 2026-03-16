'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirebase } from '@/firebase';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, getDocs } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle, Loader2, IndianRupee } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { countries } from '@/lib/countries';
import type { CourseFee } from '@/lib/definitions';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  countryCode: z.string().min(1, 'Country code is required.'),
  mobile: z.string().min(1, 'Mobile number is required.'),
  learningMode: z.enum(['group', 'one to one'], { required_error: 'Please select a learning mode.' }),
  courseModel: z.string({ required_error: 'Please select a course model.' }),
  class: z.string().optional(),
  level: z.string().optional(),
  syllabus: z.string().optional(),
  competitiveExam: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.courseModel === 'MATHS ONLINE TUITION') {
        if (!data.class) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please select a class.', path: ['class'] });
        } else if (data.class !== 'DEGREE' && !data.syllabus) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please select a syllabus.', path: ['syllabus'] });
        }
    }
    if (data.courseModel === 'TWENTY 20 BASIC MATHS') {
        if (!data.level) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please select a level.', path: ['level'] });
        }
    }
    if (data.courseModel === 'COMPETITIVE EXAM') {
        if (!data.competitiveExam) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please select a competitive exam.', path: ['competitiveExam'] });
        }
    }
});


type FormValues = z.infer<typeof formSchema>;

const classes = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).concat('DEGREE');
const syllabuses = ['Kerala State syllabus', 'CBSE kerala', 'CBSE UAE', 'CBSE KSA', 'ICSE'];
const competitiveExams = ['LSS', 'NuMATs', 'USS', 'NMMS', 'NTSE', 'PSC', 'MAT', 'KTET', 'CTET', 'NET', 'CSAT'];
const twenty20Levels = [
    { label: 'Level 1 (Class 1 & 2)', value: 'Level 1' },
    { label: 'Level 2 (Class 3 & 4)', value: 'Level 2' },
    { label: 'Level 3 (Class 5, 6, 7)', value: 'Level 3' },
    { label: 'Level 4 (Class 8, 9, 10)', value: 'Level 4' },
    { label: 'Level 5 (Class +1 & +2)', value: 'Level 5' },
];

const DEFAULT_FEE = 99;

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fee, setFee] = useState<number | null>(DEFAULT_FEE);
  const [loadingFee, setLoadingFee] = useState(false);
  
  const referralId = searchParams.get('ref');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      learningMode: 'group',
      courseModel: '',
      countryCode: 'IN',
      mobile: '',
    },
  });

  const { watch } = form;
  const courseModel = watch('courseModel');
  const selectedClass = watch('class');
  const selectedSyllabus = watch('syllabus');
  const selectedLevel = watch('level');
  const selectedCompetitiveExam = watch('competitiveExam');
  
  const showClassField = courseModel === 'MATHS ONLINE TUITION';
  const showSyllabusField = showClassField && selectedClass && selectedClass !== 'DEGREE';
  const showLevelField = courseModel === 'TWENTY 20 BASIC MATHS';
  const showCompetitiveExamField = courseModel === 'COMPETITIVE EXAM';
  
  useEffect(() => {
    if (!firestore || !courseModel) return;

    const fetchFee = async () => {
        setLoadingFee(true);
        let q = query(collection(firestore, 'courseFees'), where('courseModel', '==', courseModel));

        if (courseModel === 'COMPETITIVE EXAM' && selectedCompetitiveExam) {
            q = query(q, where('competitiveExam', '==', selectedCompetitiveExam));
        } else if (courseModel === 'MATHS ONLINE TUITION' && selectedClass) {
            q = query(q, where('class', '==', selectedClass));
            if (selectedClass !== 'DEGREE' && selectedSyllabus) {
                q = query(q, where('syllabus', '==', selectedSyllabus));
            }
        } else if (courseModel === 'TWENTY 20 BASIC MATHS' && selectedLevel) {
            q = query(q, where('level', '==', selectedLevel));
        }
        
        try {
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const feeData = querySnapshot.docs[0].data() as CourseFee;
                setFee(feeData.amount);
            } else {
                const generalQuery = query(collection(firestore, 'courseFees'), where('courseModel', '==', courseModel));
                const generalSnapshot = await getDocs(generalQuery);
                const generalFee = generalSnapshot.docs.find(d => !d.data().class && !d.data().competitiveExam && !d.data().level);
                if (generalFee) {
                    setFee(generalFee.data().amount);
                } else {
                    setFee(DEFAULT_FEE);
                }
            }
        } catch (error) {
            console.error("Error fetching fee:", error);
            setFee(DEFAULT_FEE);
        } finally {
            setLoadingFee(false);
        }
    };
    
    const timeoutId = setTimeout(fetchFee, 500);
    return () => clearTimeout(timeoutId);

  }, [firestore, courseModel, selectedClass, selectedSyllabus, selectedLevel, selectedCompetitiveExam]);


  const handleContinue = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast({
        title: 'Please check your details',
        description: 'Fill in all required fields correctly before proceeding.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const data = form.getValues();
    const dataWithFee = { ...data, registrationAmount: fee };
    
    sessionStorage.setItem('kanakkmash_signup_data', JSON.stringify(dataWithFee));
    if (referralId) {
        sessionStorage.setItem('kanakkmash_referral_id', referralId);
    }
    
    router.push('/sign-up/payment');
  };
  
  return (
    <Form {...form}>
      <form onSubmit={(e) => { e.preventDefault(); handleContinue(); }} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="learningMode"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Learning Mode</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="group">Group Mode</SelectItem>
                            <SelectItem value="one to one">One to One Mode</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="courseModel"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Course Model</FormLabel>
                    <Select onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue('class', '');
                        form.setValue('level', '');
                        form.setValue('syllabus', '');
                        form.setValue('competitiveExam', '');
                        form.clearErrors(['class', 'level', 'syllabus', 'competitiveExam']);
                    }} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select course" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="MATHS ONLINE TUITION">MATHS ONLINE TUITION</SelectItem>
                            <SelectItem value="TWENTY 20 BASIC MATHS">TWENTY 20 BASIC MATHS</SelectItem>
                            <SelectItem value="COMPETITIVE EXAM">COMPETITIVE EXAM</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        
        {showClassField && (
            <FormField
            control={form.control}
            name="class"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Class</FormLabel>
                <Select onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue('syllabus', '');
                    form.clearErrors('syllabus');
                }} defaultValue={field.value}>
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

        {showLevelField && (
            <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Level</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a level" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {twenty20Levels.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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

        {showCompetitiveExamField && (
            <FormField
            control={form.control}
            name="competitiveExam"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Competitive Exam</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select an exam" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {competitiveExams.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                    <Input {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                    <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
        <div>
          <Label>Mobile Number</Label>
          <div className="mt-2 flex flex-row gap-2">
            <FormField
              control={form.control}
              name="countryCode"
              render={({ field }) => (
                <FormItem className="w-auto">
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          <div className="flex items-center gap-2">
                            <span>{country.flag}</span>
                            <span className="sm:hidden">{country.phone}</span>
                            <span className="hidden sm:inline">{country.name} ({country.phone})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mobile"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="pt-2 text-center text-sm text-muted-foreground">
          By continuing you agree to all our{' '}
          <Link href="/terms-and-conditions" target="_blank" className="underline underline-offset-4 hover:text-primary">
            Terms & Conditions
          </Link>
        </div>
        
        <Button type="submit" className="w-full" size="lg" disabled={loading || loadingFee}>
          {loading || loadingFee ? <Loader2 className="animate-spin" /> : 'Continue to Payment'}
        </Button>
      </form>
    </Form>
  );
}
