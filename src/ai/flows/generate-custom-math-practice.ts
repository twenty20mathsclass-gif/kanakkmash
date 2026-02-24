'use server';
/**
 * @fileOverview A Genkit flow for generating custom math practice questions.
 *
 * - generateCustomMathPractice - A function that handles the generation of math practice questions.
 * - GenerateCustomMathPracticeInput - The input type for the generateCustomMathPractice function.
 * - GenerateCustomMathPracticeOutput - The return type for the generateCustomMathPractice function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateCustomMathPracticeInputSchema = z.object({
  lessonTopic: z
    .string()
    .describe('The specific math lesson topic for which to generate questions.'),
  difficultyLevel: z
    .string()
    .describe('The desired difficulty level for the practice questions (e.g., "Beginner", "Intermediate", "Advanced").'),
});
export type GenerateCustomMathPracticeInput = z.infer<
  typeof GenerateCustomMathPracticeInputSchema
>;

const GenerateCustomMathPracticeOutputSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string().describe('The generated math practice question.'),
      answer: z.string().describe('The correct answer to the practice question.'),
    })
  ),
});
export type GenerateCustomMathPracticeOutput = z.infer<
  typeof GenerateCustomMathPracticeOutputSchema
>;

export async function generateCustomMathPractice(
  input: GenerateCustomMathPracticeInput
): Promise<GenerateCustomMathPracticeOutput> {
  return generateCustomMathPracticeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCustomMathPracticePrompt',
  input: { schema: GenerateCustomMathPracticeInputSchema },
  output: { schema: GenerateCustomMathPracticeOutputSchema },
  prompt: `You are an expert math tutor. Your task is to generate 5 unique math practice questions and their corresponding answers.

Generate questions based on the following lesson topic and desired difficulty level:

Lesson Topic: {{{lessonTopic}}}
Difficulty Level: {{{difficultyLevel}}}

Ensure the questions are challenging but appropriate for the specified difficulty. Provide only the questions and answers in a structured JSON format. Make sure to only return the JSON, no other conversational text.

Example Output Structure:
{{"questions": [{"question": "What is 2+2?", "answer": "4"}, {"question": "What is 5*5?", "answer": "25"}]}}
`,
});

const generateCustomMathPracticeFlow = ai.defineFlow(
  {
    name: 'generateCustomMathPracticeFlow',
    inputSchema: GenerateCustomMathPracticeInputSchema,
    outputSchema: GenerateCustomMathPracticeOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
