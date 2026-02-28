'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import type { Exam, Schedule, User, ExamSubmission } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Timer } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface Props {
  exam: Exam;
  schedule: Schedule | null;
  user: User;
}

export function ExamInterface({ exam, schedule, user }: Props) {
  const router = useRouter();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(exam.questions.length).fill(null));
  const [timeLeft, setTimeLeft] = useState(schedule?.duration ? schedule.duration * 60 : 1800);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!firestore || isSubmitting) return;
    setIsSubmitting(true);
    setShowConfirmDialog(false);

    let score = 0;
    exam.questions.forEach((q, index) => {
      if (answers[index] === q.correctAnswerIndex) {
        score++;
      }
    });
    
    const submissionData: Omit<ExamSubmission, 'id'> = {
      examId: exam.id,
      studentId: user.id,
      studentName: user.name,
      answers: answers,
      submittedAt: Timestamp.now(),
      score: score,
      totalQuestions: exam.questions.length,
      examTitle: exam.title,
    };

    try {
      const submissionId = `${user.id}_${exam.id}`;
      const submissionRef = doc(firestore, 'exams', exam.id, 'submissions', user.id);
      await setDoc(submissionRef, submissionData);
      
      toast({
        title: 'Exam Submitted!',
        description: 'Your results have been recorded.',
      });
      
      router.push(`/exams/result/${submissionId}`);

    } catch (serverError) {
      const permissionError = new FirestorePermissionError(
        { path: `exams/${exam.id}/submissions/${user.id}`, operation: 'create', requestResourceData: submissionData },
        { cause: serverError }
      );
      errorEmitter.emit('permission-error', permissionError);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: 'Could not submit your exam. Please try again.',
      });
      setIsSubmitting(false);
    }
  }, [firestore, isSubmitting, exam, user, answers, toast, router]);


  useEffect(() => {
    if (!schedule?.duration) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [schedule?.duration, handleSubmit]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleAnswerChange = (value: string) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = parseInt(value, 10);
    setAnswers(newAnswers);
  };
  
  const currentQuestion = exam.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / exam.questions.length) * 100;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle className="font-headline text-3xl">{exam.title}</CardTitle>
                <CardDescription>Question {currentQuestionIndex + 1} of {exam.questions.length}</CardDescription>
            </div>
            <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                <Timer className="h-6 w-6" />
                <span>{formatTime(timeLeft)}</span>
            </div>
          </div>
          <Progress value={progress} className="mt-4" />
        </CardHeader>
        <CardContent className="min-h-[250px]">
          <h3 className="text-xl font-semibold mb-6">{currentQuestion.questionText}</h3>
          <RadioGroup 
            value={answers[currentQuestionIndex] !== null ? String(answers[currentQuestionIndex]) : undefined}
            onValueChange={handleAnswerChange}
            className="space-y-3"
          >
            {currentQuestion.options.map((option, index) => (
              <Label key={index} htmlFor={`q${currentQuestionIndex}-o${index}`} className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent has-[:checked]:bg-primary/10 has-[:checked]:border-primary">
                <RadioGroupItem value={String(index)} id={`q${currentQuestionIndex}-o${index}`} />
                <span>{option.text}</span>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline"
            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>
          {currentQuestionIndex < exam.questions.length - 1 ? (
            <Button onClick={() => setCurrentQuestionIndex(prev => prev + 1)}>
              Next
            </Button>
          ) : (
            <Button onClick={() => setShowConfirmDialog(true)} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Exam
            </Button>
          )}
        </CardFooter>
      </Card>
      
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Submit your exam?</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to submit your answers? You won't be able to change them afterwards.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <Button variant="ghost" onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
                <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm & Submit
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
