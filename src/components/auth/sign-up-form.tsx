'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';

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

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  syllabus: z.string({ required_error: 'Please select your syllabus.' }),
  class: z.string({ required_error: 'Please select your class.' }),
  countryCode: z.string().min(1, 'Country code is required.'),
  mobile: z.string().min(1, 'Mobile number is required.'),
});

type FormValues = z.infer<typeof formSchema>;

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
      syllabus: '',
      class: '',
      countryCode: '',
      mobile: '',
    },
  });

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

      // Create user profile in Firestore
      const userProfile: User = {
        id: user.uid,
        name: data.name,
        email: data.email,
        role: 'student',
        avatarUrl: avatarUrl,
        syllabus: data.syllabus,
        class: data.class,
        countryCode: data.countryCode,
        mobile: data.mobile,
      };

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
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="john.doe@example.com" {...field} />
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
        <FormField
          control={form.control}
          name="syllabus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Syllabus</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your syllabus" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="kerala-state">Kerala state</SelectItem>
                  <SelectItem value="cbse-kerala">CBSE Kerala</SelectItem>
                  <SelectItem value="cbse-uae">CBSE UAE</SelectItem>
                  <SelectItem value="cbse-ksa">CBSE KSA</SelectItem>
                  <SelectItem value="icse">ICSE</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="class"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Class</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your class" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((classNum) => (
                    <SelectItem key={classNum} value={String(classNum)}>
                      Class {classNum}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <FormItem className="w-1/3">
                  <FormControl>
                    <Input placeholder="+91" {...field} />
                  </FormControl>
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
                    <Input placeholder="9876543210" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

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
