
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useFirebase } from '@/firebase';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import type { Homework, Schedule, User } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar } from 'lucide-react';
import { uploadImage } from '@/lib/actions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Props {
  homework: Homework;
  schedule: Schedule | null;
  user: User;
}

function McqHomeworkInterface({ homework, schedule, user, handleSubmit }: Props & { handleSubmit: (answers: (number | null)[]) => void }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(homework.questions?.length || 0).fill(null));
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleAnswerChange = (value: string) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = parseInt(value, 10);
    setAnswers(newAnswers);
  };
  
  const currentQuestion = homework.questions![currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / homework.questions!.length) * 100;
  
  const onFinalSubmit = () => {
    setShowConfirmDialog(false);
    handleSubmit(answers);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle className="font-headline text-3xl">{homework.title}</CardTitle>
                <CardDescription>Question {currentQuestionIndex + 1} of {homework.questions!.length}</CardDescription>
            </div>
            <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                <Calendar className="h-6 w-6" />
                <span>{schedule?.startDate ? format(schedule.startDate.toDate(), 'MMM dd') : 'Now'} - {schedule?.endDate ? format(schedule.endDate.toDate(), 'MMM dd') : 'End'}</span>
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
          {currentQuestionIndex < homework.questions!.length - 1 ? (
            <Button onClick={() => setCurrentQuestionIndex(prev => prev + 1)}>
              Next
            </Button>
          ) : (
            <Button onClick={() => setShowConfirmDialog(true)}>
              Submit Homework
            </Button>
          )}
        </CardFooter>
      </Card>
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Submit your questions?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to submit your answers? You won't be able to change them afterwards.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><Button variant="ghost" onClick={() => setShowConfirmDialog(false)}>Cancel</Button><AlertDialogAction onClick={onFinalSubmit}>Confirm & Submit</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function DescriptiveHomeworkInterface({ homework, schedule, user, handleSubmit }: Props & { handleSubmit: (file: File) => void }) {
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle className="font-headline text-3xl">{homework.title}</CardTitle>
                <CardDescription>Total Marks: {homework.totalMarks || 50}</CardDescription>
            </div>
            <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                <Calendar className="h-5 w-5" />
                <span>{schedule?.startDate ? format(schedule.startDate.toDate(), 'MMM dd') : 'Now'} - {schedule?.endDate ? format(schedule.endDate.toDate(), 'MMM dd') : 'End'}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <h3 className="font-semibold mb-4 text-lg">Questions</h3>
                 {homework.questions && homework.questions.length > 0 ? (
                    <ul className="space-y-4 list-none p-0">
                        {homework.questions.map((q, i) => (
                            <li key={i} className="flex gap-4 p-4 border rounded-xl bg-muted/5">
                                <span className="font-bold text-primary shrink-0">Q{i + 1}.</span>
                                <span className="text-foreground leading-relaxed">{q.questionText}</span>
                            </li>
                        ))}
                    </ul>
                ) : homework.questionPaperUrl ? (
                    <Button asChild className="w-full sm:w-auto">
                        <a href={homework.questionPaperUrl} target="_blank" rel="noopener noreferrer">View Question Paper</a>
                    </Button>
                ) : homework.questionPaperContent ? (
                    <div className="prose dark:prose-invert border p-6 rounded-2xl max-h-96 overflow-y-auto bg-muted/5" dangerouslySetInnerHTML={{ __html: homework.questionPaperContent }} />
                ) : (
                    <p className="text-muted-foreground p-4 border border-dashed rounded-xl text-center">No questions available.</p>
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
                Submit Homework
            </Button>
        </CardFooter>
      </Card>
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Submit your homework?</AlertDialogTitle><AlertDialogDescription>Please confirm your submission. You won't be able to change your answer file afterwards.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><Button variant="ghost" onClick={() => setShowConfirmDialog(false)}>Cancel</Button><AlertDialogAction onClick={onFinalSubmit}>Confirm & Submit</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function HomeworkInterface({ homework, schedule, user }: Props) {
  const router = useRouter();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMcqSubmit = async (answers: (number | null)[]) => {
    if (!firestore || isSubmitting) return;
    setIsSubmitting(true);
    
    try {
        const submissionRef = doc(firestore, 'homeworks', homework.id, 'submissions', user.id);
        const submissionData: any = {
            homeworkId: homework.id, 
            teacherId: homework.teacherId,
            studentId: user.id, 
            studentName: user.name,
            homeworkTitle: homework.title, 
            submittedAt: Timestamp.now(), 
            homeworkType: 'mcq', 
            answers: answers, 
            status: 'submitted'
        };
        await setDoc(submissionRef, submissionData);

        // Global Tracking for Dashboard
        const globalSubRef = doc(firestore, 'homework_submissions', `${homework.id}_${user.id}`);
        await setDoc(globalSubRef, { 
            homeworkId: homework.id, 
            teacherId: homework.teacherId,
            studentId: user.id, 
            status: 'submitted',
            submittedAt: Timestamp.now()
        });
        
        toast({ title: 'Submitted!', description: 'Your homework responses have been recorded.' });
        router.push('/exam-schedule');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not submit your homework. Please try again.' });
        setIsSubmitting(false);
    }
  };

  const handleDescriptiveSubmit = async (file: File) => {
    if (!firestore || isSubmitting) return;
    setIsSubmitting(true);

    try {
        const uploadFormData = new FormData();
        uploadFormData.append('image', file);
        const downloadUrl = await uploadImage(uploadFormData);
        
        const submissionRef = doc(firestore, 'homeworks', homework.id, 'submissions', user.id);
        const submissionData: any = {
            homeworkId: homework.id, 
            teacherId: homework.teacherId,
            studentId: user.id, 
            studentName: user.name,
            homeworkTitle: homework.title, 
            submittedAt: Timestamp.now(), 
            homeworkType: 'descriptive', 
            answerFileUrl: downloadUrl, 
            status: 'submitted'
        };
        await setDoc(submissionRef, submissionData);

        // Global Tracking for Dashboard
        const globalSubRef = doc(firestore, 'homework_submissions', `${homework.id}_${user.id}`);
        await setDoc(globalSubRef, { 
            homeworkId: homework.id, 
            teacherId: homework.teacherId,
            studentId: user.id, 
            status: 'submitted',
            submittedAt: Timestamp.now()
        });

        toast({ title: 'Submitted!', description: 'Your solution sheet has been uploaded.' });
        router.push('/exam-schedule');

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not submit your solution. Please try again.' });
        setIsSubmitting(false);
    }
  };

  if (isSubmitting) {
    return (
        <div className="flex flex-col items-center justify-center p-20 gap-4 h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Submitting your homework...</p>
        </div>
    );
  }

  if (homework.homeworkType === 'mcq') {
    return <McqHomeworkInterface homework={homework} schedule={schedule} user={user} handleSubmit={handleMcqSubmit} />
  }

  return <DescriptiveHomeworkInterface homework={homework} schedule={schedule} user={user} handleSubmit={handleDescriptiveSubmit} />
}
