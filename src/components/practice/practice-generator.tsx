'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generatePractice } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { GenerateCustomMathPracticeOutput } from '@/ai/flows/generate-custom-math-practice';
import { Loader2, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { practiceTopics } from '@/lib/data';

const practiceFormSchema = z.object({
  topic: z.string({ required_error: 'Please select a topic.' }),
  difficulty: z.string({ required_error: 'Please select a difficulty level.' }),
});

type PracticeFormValues = z.infer<typeof practiceFormSchema>;

export function PracticeGenerator({ defaultTopic, standalone = false }: { defaultTopic?: string, standalone?: boolean }) {
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<GenerateCustomMathPracticeOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<PracticeFormValues>({
    resolver: zodResolver(practiceFormSchema),
    defaultValues: {
      topic: defaultTopic,
      difficulty: 'Intermediate',
    },
  });

  async function onSubmit(data: PracticeFormValues) {
    setIsLoading(true);
    setQuestions(null);
    const selectedTopic = practiceTopics.find(t => t.id === data.topic)?.title || data.topic;
    
    const result = await generatePractice(selectedTopic, data.difficulty);
    if (result.error || !result.data) {
      toast({
        variant: 'destructive',
        title: 'An error occurred',
        description: result.error || 'Could not generate questions.',
      });
    } else {
      setQuestions(result.data);
    }
    setIsLoading(false);
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:flex md:items-end md:gap-4 md:space-y-0">
          {standalone && (
            <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                <FormItem className='flex-1'>
                    <FormLabel>Topic</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select a topic to practice" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {practiceTopics.map(topic => (
                            <SelectItem key={topic.id} value={topic.id}>{topic.title}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
          )}

          <FormField
            control={form.control}
            name="difficulty"
            render={({ field }) => (
              <FormItem className='flex-1'>
                <FormLabel>Difficulty</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a difficulty" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isLoading} className='w-full md:w-auto'>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Generate
          </Button>
        </form>
      </Form>

      {questions && questions.questions.length > 0 && (
        <div className="mt-8">
            <h3 className="text-xl font-bold font-headline mb-4">Generated Questions</h3>
          <Accordion type="single" collapsible className="w-full">
            {questions.questions.map((q, index) => (
              <AccordionItem value={`item-${index}`} key={index}>
                <AccordionTrigger className='text-left'>
                  {index + 1}. {q.question}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="font-bold text-primary">{q.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
    </div>
  );
}
