'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import Link from 'next/link';

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
import type { User } from '@/lib/definitions';
import { Label } from '@/components/ui/label';
import { Checkbox } from '../ui/checkbox';
import { countries } from '@/lib/countries';

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
  terms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions to continue.',
  }),
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      courseModel: '',
      countryCode: 'IN',
      mobile: '',
      terms: false,
    },
  });

  const courseModel = form.watch('courseModel');
  const selectedClass = form.watch('class');
  
  const showClassField = courseModel === 'MATHS ONLINE TUITION' || courseModel === 'ONE TO ONE';
  const showSyllabusField = showClassField && selectedClass && selectedClass !== 'DEGREE';
  const showCompetitiveExamField = courseModel === 'COMPETITIVE EXAM';

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const user = userCredential.user;

      const avatarUrl = `https://picsum.photos/seed/${user.uid}/100/100`;

      await updateProfile(user, {
        displayName: data.name,
        photoURL: avatarUrl,
      });

      const selectedCountry = countries.find(c => c.code === data.countryCode);
      const phoneCode = selectedCountry ? selectedCountry.phone : data.countryCode;

      // Create user profile in Firestore
      const userProfile: User = {
        id: user.uid,
        name: data.name,
        email: data.email,
        role: 'student',
        avatarUrl: avatarUrl,
        courseModel: data.courseModel,
        countryCode: phoneCode,
        mobile: data.mobile,
      };

      if (showClassField && data.class) {
        userProfile.class = data.class;
      }
      if (showSyllabusField && data.syllabus) {
          userProfile.syllabus = data.syllabus;
      }
      if (showCompetitiveExamField && data.competitiveExam) {
          userProfile.competitiveExam = data.competitiveExam;
      }

      await setDoc(doc(firestore, 'users', user.uid), userProfile);

      // On success, the useUser hook will update, and the sign-up page will handle the redirect.
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else {
        setError(error.message);
      }
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <FormItem className="w-auto min-w-[180px]">
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
                            <span>{country.name} ({country.phone})</span>
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

        <FormField
            control={form.control}
            name="terms"
            render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                <FormControl>
                    <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    id="terms"
                    />
                </FormControl>
                <div className="space-y-1 leading-none">
                    <Label htmlFor="terms" className="font-normal">
                    I agree to the{' '}
                    <Link href="/terms-and-conditions" target="_blank" className="font-medium text-primary underline underline-offset-4 hover:text-primary/80">
                        Terms and Conditions
                    </Link>
                    </Label>
                    <FormMessage />
                </div>
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

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : 'Create Account'}
        </Button>
      </form>
    </Form>
  );
}
