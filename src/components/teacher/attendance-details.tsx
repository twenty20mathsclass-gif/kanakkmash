'use client';
import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, query, getDocs, where, doc, updateDoc, getDoc } from 'firebase/firestore';
import type { Schedule, Exam, ExamSubmission, User } from '@/lib/definitions';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Loader2, CheckCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';


export function AttendanceDetails({ schedule }: { schedule: Schedule }) {
    const { firestore } = useFirebase();
    const [loading, setLoading] = useState(true);
    const [details, setDetails] = useState<any>(null); // Can be attendees or submissions

    useEffect(() => {
        if (!firestore || !schedule) return;
        setLoading(true);
        setDetails(null);

        let unsubscribe: () => void;

        if (schedule.type === 'class') {
            const attendeesQuery = query(collection(firestore, 'schedules', schedule.id, 'attendees'));
            unsubscribe = onSnapshot(attendeesQuery, (snapshot) => {
                const attendeesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setDetails({ type: 'class', attendees: attendeesList });
                setLoading(false);
            }, (serverError: any) => {
                if (serverError.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({ path: `schedules/${schedule.id}/attendees`, operation: 'list', }, { cause: serverError });
                    errorEmitter.emit('permission-error', permissionError);
                }
                setLoading(false);
            });
        } else if (schedule.type === 'exam' && schedule.examId) {
            const submissionsQuery = query(collection(firestore, 'exams', schedule.examId, 'submissions'));
            unsubscribe = onSnapshot(submissionsQuery, async (snapshot) => {
                const submissionsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamSubmission));
                 const examRef = doc(firestore, 'exams', schedule.examId!);
                 const examSnap = await getDoc(examRef);
                 const examData = examSnap.exists() ? (examSnap.data() as Exam) : null;
                setDetails({ type: 'exam', submissions: submissionsList, exam: examData });
                setLoading(false);
            }, (serverError: any) => {
                if (serverError.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({ path: `exams/${schedule.examId}/submissions`, operation: 'list', }, { cause: serverError });
                    errorEmitter.emit('permission-error', permissionError);
                }
                setLoading(false);
            });
        } else {
             setLoading(false);
        }

        return () => unsubscribe && unsubscribe();
    }, [firestore, schedule]);
    

    return (
        <Card>
            <CardHeader>
                <CardTitle>Details for: {schedule.title}</CardTitle>
                <CardDescription className="capitalize">
                    {schedule.type} on {schedule.date.toDate().toLocaleDateString()}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-24"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : details?.type === 'class' ? (
                    <ClassAttendance attendees={details.attendees} />
                ) : details?.type === 'exam' ? (
                    <ExamSubmissions submissions={details.submissions} exam={details.exam} />
                ) : (
                    <p className="text-muted-foreground text-center py-8">No details found for this item.</p>
                )}
            </CardContent>
        </Card>
    );
}

function ClassAttendance({ attendees }: { attendees: any[] }) {
    return attendees.length > 0 ? (
        <ul className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {attendees.map(attendee => (
                <li key={attendee.id} className="flex items-center gap-4 p-2 rounded-md border">
                    <Avatar><AvatarImage src={attendee.studentAvatar} alt={attendee.studentName} /><AvatarFallback>{attendee.studentName.charAt(0)}</AvatarFallback></Avatar>
                    <div className="flex-1">
                        <p className="font-medium">{attendee.studentName}</p>
                        <p className="text-sm text-muted-foreground">Joined at: {format(attendee.attendedAt.toDate(), 'p')}</p>
                    </div>
                </li>
            ))}
        </ul>
    ) : (
        <p className="text-muted-foreground text-center py-8">No attendance records found.</p>
    );
}

function ExamSubmissions({ submissions, exam }: { submissions: ExamSubmission[], exam: Exam | null }) {
    const [reviewingSubmission, setReviewingSubmission] = useState<ExamSubmission | null>(null);

    return (
        <>
            {submissions.length > 0 ? (
                <ul className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {submissions.map(sub => (
                        <li key={sub.id} className="flex items-center gap-4 p-3 rounded-md border">
                            <Avatar>
                                <AvatarImage src={(exam as any)?.student?.avatarUrl} alt={sub.studentName} />
                                <AvatarFallback>{sub.studentName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-medium">{sub.studentName}</p>
                                <p className="text-sm text-muted-foreground">Submitted at: {format(sub.submittedAt.toDate(), 'p')}</p>
                                {sub.examType === 'mcq' && <Badge variant="secondary">MCQ Score: {sub.score}/{sub.totalQuestions}</Badge>}
                                {sub.examType === 'descriptive' && <Badge variant={sub.status === 'reviewed' ? 'default' : 'outline'}>{sub.status}</Badge>}
                            </div>
                            {sub.examType === 'descriptive' && (
                                <Button size="sm" onClick={() => setReviewingSubmission(sub)}>
                                    {sub.status === 'reviewed' ? 'View/Edit' : 'Review'}
                                </Button>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-muted-foreground text-center py-8">No submissions found for this exam.</p>
            )}
            {reviewingSubmission && exam && (
                 <ReviewDescriptiveSubmissionDialog
                    submission={reviewingSubmission}
                    exam={exam}
                    isOpen={!!reviewingSubmission}
                    onOpenChange={(open) => !open && setReviewingSubmission(null)}
                />
            )}
        </>
    );
}

function ReviewDescriptiveSubmissionDialog({ submission, exam, isOpen, onOpenChange }: { submission: ExamSubmission, exam: Exam, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [marks, setMarks] = useState(submission.score ?? '');
    const [feedback, setFeedback] = useState(submission.feedback ?? '');
    const [loading, setLoading] = useState(false);

    const handleSaveReview = async () => {
        if (!firestore) return;
        setLoading(true);

        const marksAwarded = Number(marks);
        if (isNaN(marksAwarded) || marksAwarded < 0 || marksAwarded > (exam.totalMarks || 0)) {
            toast({ variant: 'destructive', title: 'Invalid Marks', description: `Marks must be between 0 and ${exam.totalMarks}.` });
            setLoading(false);
            return;
        }

        const submissionRef = doc(firestore, 'exams', submission.examId, 'submissions', submission.studentId);
        try {
            await updateDoc(submissionRef, {
                score: marksAwarded,
                feedback: feedback,
                status: 'reviewed'
            });
            toast({ title: 'Review Saved', description: `Marks and feedback for ${submission.studentName} have been updated.` });
            onOpenChange(false);
        } catch (serverError: any) {
             if (serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({ path: submissionRef.path, operation: 'update' }, { cause: serverError });
                errorEmitter.emit('permission-error', permissionError);
                toast({ variant: 'destructive', title: 'Permission Denied', description: 'You do not have permission to update this submission.' });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to save the review.' });
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Review Submission for {submission.studentName}</DialogTitle>
                    <DialogDescription>{submission.examTitle}</DialogDescription>
                </DialogHeader>
                <div className="grid md:grid-cols-3 gap-6 py-4 max-h-[70vh] overflow-y-auto">
                    <div className="md:col-span-1 space-y-4">
                         <h3 className="font-semibold">Question Paper</h3>
                        <div className="border rounded-md p-4 h-96 overflow-y-auto bg-muted/50">
                            {exam.questionPaperUrl ? (
                                <div>
                                    <p>Question paper is a file.</p>
                                    <Button asChild variant="link" className="p-0">
                                        <a href={exam.questionPaperUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">View file in new tab</a>
                                    </Button>
                                </div>
                            ) : exam.questionPaperContent ? (
                                <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: exam.questionPaperContent }} />
                            ) : <p>No question paper found.</p>}
                        </div>
                    </div>
                    <div className="md:col-span-1 space-y-4">
                        <h3 className="font-semibold">Student's Answer</h3>
                         {submission.answerFileUrl ? (
                            <iframe src={submission.answerFileUrl} className="w-full h-96 border rounded-md" title="Student Submission" />
                         ) : <p>No file submitted.</p>}
                         <Button variant="outline" asChild><a href={submission.answerFileUrl} target="_blank" rel="noopener noreferrer">Open Answer in New Tab</a></Button>
                    </div>
                     <div className="md:col-span-1 space-y-4">
                        <h3 className="font-semibold">Marking</h3>
                        <div>
                            <Label htmlFor="marks">Marks Awarded (out of {exam.totalMarks})</Label>
                            <Input id="marks" type="number" value={marks} onChange={(e) => setMarks(e.target.value)} max={exam.totalMarks} min={0} />
                        </div>
                        <div>
                            <Label htmlFor="feedback">Feedback</Label>
                            <Textarea id="feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Provide constructive feedback..." className="min-h-48"/>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSaveReview} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Save Review
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
