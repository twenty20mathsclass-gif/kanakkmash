'use server';

import { z } from 'zod';
import { generateCustomMathPractice } from '@/ai/flows/generate-custom-math-practice';
import type { GenerateCustomMathPracticeOutput } from '@/ai/flows/generate-custom-math-practice';
import { revalidatePath } from 'next/cache';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { firebaseConfig, firestore } from '@/firebase/config';
import type { User } from './definitions';


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
            message: 'Validation failed.',
            success: false,
        };
    }

    const { name, email, password, role } = validatedFields.data;
    
    // Create a temporary app to create the user without signing the admin out
    const tempAppName = `temp-user-creation-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
        const userCredential = await createUserWithEmailAndPassword(
            tempAuth,
            email,
            password
        );
        const user = userCredential.user;

        const avatarUrl = `https://picsum.photos/seed/${user.uid}/100/100`;

        const userProfile: User = {
            id: user.uid,
            name: name,
            email: email,
            role: role,
            avatarUrl: avatarUrl,
        };

        // Use the main firestore instance to create the document
        await setDoc(doc(firestore, 'users', user.uid), userProfile);
        
        revalidatePath('/admin/users');
        
        return {
            errors: {},
            message: `Successfully created user ${name}.`,
            success: true,
        };

    } catch (error: any) {
        let message = 'An unknown error occurred.';
        if (error.code === 'auth/email-already-in-use') {
            message = 'A user with this email already exists.';
        } else if (error.message) {
            message = error.message;
        }

        return {
            errors: {},
            message: message,
            success: false,
        };
    } finally {
        await deleteApp(tempApp);
    }
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
