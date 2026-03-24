'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useFirebase } from '@/firebase';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import type { Exam, Schedule, User, ExamSubmission } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Timer, Upload } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { uploadImage } from '@/lib/actions';

interface Props {
  exam: Exam;
  schedule: Schedule | null;
  user: User;
}

function McqExamInterface({ exam, schedule, user, timeLeft, handleSubmit }: Props & { timeLeft: number; handleSubmit: (answers: (number | null)[]) => void }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(exam.questions?.length || 0).fill(null));
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleAnswerChange = (value: string) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = parseInt(value, 10);
    setAnswers(newAnswers);
  };
  
  const currentQuestion = exam.questions![currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / exam.questions!.length) * 100;
  
  const onFinalSubmit = () => {
    setShowConfirmDialog(false);
    handleSubmit(answers);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle className="font-headline text-3xl">{exam.title}</CardTitle>
                <CardDescription>Question {currentQuestionIndex + 1} of {exam.questions!.length}</CardDescription>
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
          
          {currentQuestion.imageUrl && (
            <div className="relative w-full h-64 mb-6">
                <Image src={currentQuestion.imageUrl} alt={`Question ${currentQuestionIndex + 1} image`} fill className="rounded-md object-contain"/>
            </div>
          )}

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
          {currentQuestionIndex < exam.questions!.length - 1 ? (
            <Button onClick={() => setCurrentQuestionIndex(prev => prev + 1)}>
              Next
            </Button>
          ) : (
            <Button onClick={() => setShowConfirmDialog(true)}>
              Submit Exam
            </Button>
          )}
        </CardFooter>
      </Card>
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Submit your exam?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to submit your answers? You won't be able to change them afterwards.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><Button variant="ghost" onClick={() => setShowConfirmDialog(false)}>Cancel</Button><AlertDialogAction onClick={onFinalSubmit}>Confirm & Submit</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function DescriptiveExamInterface({ exam, schedule, user, timeLeft, handleSubmit }: Props & { timeLeft: number; handleSubmit: (file: File) => void }) {
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAnswerFile(e.target.files[0]);
    }
  };

  const onFinalSubmit = () => {
    if (answerFile) {
        setShowConfirmDialog(false);
        handleSubmit(answerFile);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle className="font-headline text-3xl">{exam.title}</CardTitle>
                <CardDescription>Total Marks: {exam.totalMarks}</CardDescription>
            </div>
            <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                <Timer className="h-6 w-6" />
                <span>{formatTime(timeLeft)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <h3 className="font-semibold mb-2">Question Paper</h3>
                 {exam.questionPaperUrl ? (
                    <Button asChild>
                        <a href={exam.questionPaperUrl} target="_blank" rel="noopener noreferrer">View Question Paper</a>
                    </Button>
                ) : exam.questionPaperContent ? (
                    <div className="prose dark:prose-invert border p-4 rounded-md max-h-96 overflow-y-auto" dangerouslySetInnerHTML={{ __html: exam.questionPaperContent }} />
                ) : (
                    <p className="text-muted-foreground">No question paper available.</p>
                )}
            </div>
            <div>
                <h3 className="font-semibold mb-2">Upload Your Answer</h3>
                <Input type="file" accept="image/*,application/pdf" onChange={onFileChange} className="file:text-foreground"/>
                 <p className="text-sm text-muted-foreground mt-2">Upload your completed answer sheet as a single PDF or image file.</p>
            </div>
        </CardContent>
        <CardFooter>
            <Button onClick={() => setShowConfirmDialog(true)} disabled={!answerFile} className="w-full">
                Submit Exam
            </Button>
        </CardFooter>
      </Card>
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Submit your exam?</AlertDialogTitle><AlertDialogDescription>Please confirm your submission. You won't be able to change your answer file afterwards.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><Button variant="ghost" onClick={() => setShowConfirmDialog(false)}>Cancel</Button><AlertDialogAction onClick={onFinalSubmit}>Confirm & Submit</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


export function ExamInterface({ exam, schedule, user }: Props) {
  const router = useRouter();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(schedule?.duration ? schedule.duration * 60 : 1800);

  const handleMcqSubmit = useCallback(async (answers: (number|null)[]) => {
    if (!firestore || isSubmitting) return;
    setIsSubmitting(true);
    
    let score = 0;
    exam.questions!.forEach((q, index) => { if (answers[index] === q.correctAnswerIndex) score++; });
    
    const submissionData: Omit<ExamSubmission, 'id'> = {
      examId: exam.id, studentId: user.id, studentName: user.name,
      answers: answers, submittedAt: Timestamp.now(), score: score,
      totalQuestions: exam.questions!.length, examTitle: exam.title, examType: 'mcq'
    };
    
    try {
      const submissionId = `${user.id}_${exam.id}`;
      const submissionRef = doc(firestore, 'exams', exam.id, 'submissions', user.id);
      await setDoc(submissionRef, submissionData);
      toast({ title: 'Exam Submitted!', description: 'Your results have been recorded.' });
      router.push(`/exams/result/${submissionId}`);
    } catch (serverError: any) {
      if (serverError.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({ path: `exams/${exam.id}/submissions/${user.id}`, operation: 'create', requestResourceData: submissionData }, { cause: serverError });
        errorEmitter.emit('permission-error', permissionError);
      } else { console.warn("Firestore error:", serverError); }
      toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not submit your exam. Please try again.' });
      setIsSubmitting(false);
    }
  }, [firestore, isSubmitting, exam, user, toast, router]);

  const handleDescriptiveSubmit = useCallback(async (file: File) => {
    if (!firestore || isSubmitting) return;
    setIsSubmitting(true);

    try {
        const uploadFormData = new FormData();
        uploadFormData.append('image', file);
        const downloadUrl = await uploadImage(uploadFormData);
        
        const submissionData: Omit<ExamSubmission, 'id'> = {
          examId: exam.id, studentId: user.id, studentName: user.name,
          answerFileUrl: downloadUrl, submittedAt: Timestamp.now(), examTitle: exam.title,
          status: 'submitted', examType: 'descriptive', totalMarks: exam.totalMarks,
        };

        const submissionId = `${user.id}_${exam.id}`;
        const submissionRef = doc(firestore, 'exams', exam.id, 'submissions', user.id);
        await setDoc(submissionRef, submissionData);

        toast({ title: 'Answer Submitted!', description: 'Your answer has been submitted for review.' });
        router.push(`/exams/result/${submissionId}`);

    } catch (serverError: any) {
         if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({ path: `exams/${exam.id}/submissions/${user.id}`, operation: 'create' }, { cause: serverError });
            errorEmitter.emit('permission-error', permissionError);
        } else { console.warn("Firestore/Upload error:", serverError); }
        toast({ variant: 'destructive', title: 'Submission Failed', description: serverError.message || 'Could not submit your answer. Please try again.' });
        setIsSubmitting(false);
    }
  }, [firestore, isSubmitting, exam, user, toast, router]);


  useEffect(() => {
    if (!schedule?.duration) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          toast({ variant: 'destructive', title: 'Time is up!', description: 'Please submit your exam now.' });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [schedule?.duration, toast]);

  if (isSubmitting) {
    return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Submitting your exam...</p>
        </div>
    );
  }

  if (exam.examType === 'descriptive') {
    return <DescriptiveExamInterface exam={exam} schedule={schedule} user={user} timeLeft={timeLeft} handleSubmit={handleDescriptiveSubmit} />
  }

  return <McqExamInterface exam={exam} schedule={schedule} user={user} timeLeft={timeLeft} handleSubmit={handleMcqSubmit} />
}