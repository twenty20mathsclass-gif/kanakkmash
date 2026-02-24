'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { users } from './data';
import { createSession, deleteSession } from './session';
import { generateCustomMathPractice } from '@/ai/flows/generate-custom-math-practice';
import type { GenerateCustomMathPracticeOutput } from '@/ai/flows/generate-custom-math-practice';
import { revalidatePath } from 'next/cache';

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

  const { email, password } = validatedFields.data;

  const user = users.find((u) => u.email === email);

  if (!user) {
    return {
      message: 'Invalid credentials. Please try again.',
    };
  }

  // Mock password check for admin
  if (user.role === 'admin' && password !== 'admin@twenty20') {
    return {
      message: 'Invalid credentials. Please try again.',
    };
  }

  // For other users in this mock app, we can assume password is correct if user is found.
  // In a real app, you would hash and compare the password.

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

  if (users.some((u) => u.email === email)) {
    return {
      message: 'A user with this email already exists.',
    };
  }

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

const createUserSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['student', 'teacher']),
});

export async function createUser(prevState: any, formData: FormData) {
    const validatedFields = createUserSchema.safeParse(
        Object.fromEntries(formData.entries())
    );

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: null,
        };
    }

    const { email, name, role } = validatedFields.data;

    if (users.some((u) => u.email === email)) {
        return {
            errors: {},
            message: 'A user with this email already exists.',
        };
    }

    const newUser = {
        id: String(users.length + 1),
        name,
        email,
        role: role,
        avatarUrl: `https://picsum.photos/seed/avatar${users.length + 1}/100/100`,
    };
    users.push(newUser);
    
    revalidatePath('/admin/users');
    return {
        errors: {},
        message: `Successfully created ${role}: ${name}`,
        success: true,
    };
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
