'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { users } from './data';
import { createSession, deleteSession } from './session';
import { generateCustomMathPractice } from '@/ai/flows/generate-custom-math-practice';
import type { GenerateCustomMathPracticeOutput } from '@/ai/flows/generate-custom-math-practice';

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function signIn(prevState: any, formData: FormData) {
  const validatedFields = signInSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email } = validatedFields.data;

  // In a real app, you would check the password against a hashed version in the DB.
  const user = users.find((u) => u.email === email);

  if (!user) {
    return {
      message: 'Invalid credentials. Please try again.',
    };
  }

  await createSession(user.id);

  if (user.role === 'admin') {
    redirect('/admin');
  }
  redirect('/dashboard');
}

const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function signUp(prevState: any, formData: FormData) {
  const validatedFields = signUpSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, name } = validatedFields.data;

  // Check if user already exists
  if (users.some((u) => u.email === email)) {
    return {
      message: 'A user with this email already exists.',
    };
  }

  // Create a new mock user. In a real app, this would be a DB insert.
  const newUser = {
    id: String(users.length + 1),
    name,
    email,
    role: 'student' as const,
    avatarUrl: `https://picsum.photos/seed/avatar${users.length + 1}/100/100`,
  };
  users.push(newUser);

  await createSession(newUser.id);
  redirect('/dashboard');
}

export async function signOut() {
  await deleteSession();
  redirect('/sign-in');
}

export async function generatePractice(
  topic: string,
  difficulty: string
): Promise<{ data: GenerateCustomMathPracticeOutput | null; error: string | null }> {
  try {
    const output = await generateCustomMathPractice({
      lessonTopic: topic,
      difficultyLevel: difficulty,
    });
    return { data: output, error: null };
  } catch (e) {
    console.error(e);
    return { data: null, error: 'Failed to generate practice questions. Please try again.' };
  }
}
