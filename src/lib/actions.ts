'use server';

import { z } from 'zod';
import { generateCustomMathPractice } from '@/ai/flows/generate-custom-math-practice';
import type { GenerateCustomMathPracticeOutput } from '@/ai/flows/generate-custom-math-practice';
import { revalidatePath } from 'next/cache';

// signIn, signUp, and signOut actions have been removed.
// Authentication is now handled on the client-side using the Firebase SDK.
// See src/components/auth/ for the new implementation.

const createUserSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['student', 'teacher']),
});

export async function createUser(prevState: any, formData: FormData) {
    // NOTE: This function is now a placeholder.
    // Securely creating users on behalf of an admin requires the Firebase Admin SDK,
    // which can only be run in a secure server-side environment (like a Cloud Function or a custom backend).
    // The client-side SDK used in this app cannot create users for other users.
    
    const validatedFields = createUserSchema.safeParse(
        Object.fromEntries(formData.entries())
    );

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Validation failed.',
            success: false,
        };
    }
    
    // This will show an error in the dialog.
    revalidatePath('/admin/users');
    return {
        errors: {},
        message: 'User creation by an admin is not supported in this version of the app. This feature requires a backend with the Firebase Admin SDK.',
        success: false,
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
