'use server';

import { generateCustomMathPractice } from '@/ai/flows/generate-custom-math-practice';
import type { GenerateCustomMathPracticeOutput } from '@/ai/flows/generate-custom-math-practice';

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
