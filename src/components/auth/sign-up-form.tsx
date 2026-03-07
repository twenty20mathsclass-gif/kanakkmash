
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createUserWithEmailAndPassword, updateProfile, type User as AuthUser } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, writeBatch, collection } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

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
import { AlertCircle, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { countries } from '@/lib/countries';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  courseModel: z.string({ required_error: 'Please select a course model.' }),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  countryCode: z.string().min(1, 'Country code is required.'),
  mobile: z.string().min(1, 'Mobile number is required.'),
  class: z.string().optional(),
  syllabus: z.string().optional(),
  competitiveExam: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.courseModel === 'MATHS ONLINE TUITION' || data.courseModel === 'ONE TO ONE') {
        if (!data.class) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Please select a class.',
                path: ['class'],
            });
        } else if (data.class && data.class !== 'DEGREE' && !data.syllabus) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Please select a syllabus.',
                path: ['syllabus'],
            });
        }
    }
    if (data.courseModel === 'COMPETITIVE EXAM') {
        if (!data.competitiveExam) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Please select a competitive exam.',
                path: ['competitiveExam'],
            });
        }
    }
});


type FormValues = z.infer<typeof formSchema>;

const classes = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).concat('DEGREE');
const syllabuses = ['Kerala State syllabus', 'CBSE kerala', 'CBSE UAE', 'CBSE KSA', 'ICSE'];
const competitiveExams = ['LSS', 'NuMATs', 'USS', 'NMMS', 'NTSE', 'PSC', 'MAT', 'KTET', 'CTET', 'NET', 'CSAT'];

export function SignUpForm() {
  const { auth, firestore } = useFirebase();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const referralId = searchParams.get('ref');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      courseModel: '',
      countryCode: 'IN',
      mobile: '',
    },
  });

  const courseModel = form.watch('courseModel');
  const selectedClass = form.watch('class');
  
  const showClassField = courseModel === 'MATHS ONLINE TUITION' || courseModel === 'ONE TO ONE';
  const showSyllabusField = showClassField && selectedClass && selectedClass !== 'DEGREE';
  const showCompetitiveExamField = courseModel === 'COMPETITIVE EXAM';

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast({
        title: 'Please check your details',
        description: 'Fill in all required fields correctly before proceeding.',
        variant: 'destructive',
      });
      return;
    }

    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      setError('Payment gateway is not configured. Please contact support.');
      return;
    }

    setLoading(true);
    setError(null);
    const data = form.getValues();
    // Placeholder registration fee. This can be made dynamic later.
    const registrationAmount = 99; // in INR

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: registrationAmount * 100, // Amount in the smallest currency unit (paise)
      currency: 'INR',
      name: 'kanakkmash',
      description: 'Student Registration Fee',
      image: 'https://www.kanakkmash.com/fv.png',
      handler: async (response: any) => {
        try {
          if (!auth || !firestore) throw new Error('Firebase not initialized.');

          const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
          const authUser = userCredential.user;

          const avatarUrl = `https://picsum.photos/seed/${authUser.uid}/100/100`;
          await updateProfile(authUser, { displayName: data.name, photoURL: avatarUrl });

          const selectedCountry = countries.find(c => c.code === data.countryCode);
          const phoneCode = selectedCountry ? selectedCountry.phone : data.countryCode;

          const userProfile: any = {
            id: authUser.uid,
            name: data.name,
            email: data.email,
            role: 'student' as 'student',
            avatarUrl,
            courseModel: data.courseModel,
            countryCode: phoneCode,
            mobile: data.mobile,
            class: data.class,
            syllabus: data.syllabus,
            competitiveExam: data.competitiveExam,
            createdAt: serverTimestamp(),
          };

          const batch = writeBatch(firestore);
          const userDocRef = doc(firestore, 'users', authUser.uid);
          
          if (referralId) {
            userProfile.referredBy = referralId;
            const referralDocRef = doc(firestore, 'users', referralId, 'referrals', authUser.uid);
            const referralData = {
              studentId: authUser.uid,
              studentName: data.name,
              studentAvatarUrl: avatarUrl,
              courseModel: data.courseModel,
              referredAt: serverTimestamp()
            };
            batch.set(referralDocRef, referralData);
          }

          batch.set(userDocRef, userProfile);
          
          const invoiceData = {
            studentId: authUser.uid,
            amount: registrationAmount,
            status: 'paid',
            type: 'fee',
            createdAt: serverTimestamp(),
            dueDate: serverTimestamp(),
            paidAt: serverTimestamp(),
            paymentId: response.razorpay_payment_id,
            paymentMethod: 'razorpay'
          };
          const invoiceDocRef = doc(collection(firestore, 'invoices'));
          batch.set(invoiceDocRef, invoiceData);
          
          await batch.commit();

          toast({
            title: 'Registration Successful!',
            description: "Your account has been created. Welcome to kanakkmash!",
          });
          // useUser hook will handle the redirect to the dashboard

        } catch (err: any) {
          console.error("Registration failed:", err);
          setError(err.message || 'An unknown error occurred during registration.');
          if (err.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({ path: 'users or invoices', operation: 'create' }, { cause: err });
            errorEmitter.emit('permission-error', permissionError);
          }
          setLoading(false);
        }
      },
      prefill: {
        name: data.name,
        email: data.email,
        contact: `${data.countryCode}${data.mobile}`,
      },
      theme: {
        color: '#F5A718',
      },
      modal: {
        ondismiss: () => {
          setLoading(false);
          toast({
            title: 'Payment Cancelled',
            description: 'Your registration is not complete without payment.',
            variant: 'destructive',
          });
        },
      },
    };

    if (!(window as any).Razorpay) {
      setError('Payment gateway failed to load. Please check your internet connection and try again.');
      setLoading(false);
      return;
    }

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };
  
  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
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

        <FormField
          control={form.control}
          name="courseModel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Course Model</FormLabel>
              <Select onValueChange={(value) => {
                  field.onChange(value);
                  form.setValue('class', '');
                  form.setValue('syllabus', '');
                  form.setValue('competitiveExam', '');
                  form.clearErrors(['class', 'syllabus', 'competitiveExam']);
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
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button onClick={handlePayment} className="w-full" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : 'Continue to Payment'}
        </Button>
      </form>
    </Form>
  );
}
