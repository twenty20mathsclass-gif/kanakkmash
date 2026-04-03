'use client';
import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, query, getDocs, where, doc, updateDoc, getDoc } from 'firebase/firestore';
import type { Schedule, Exam, ExamSubmission, User } from '@/lib/definitions';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Loader2, CheckCircle, FileText, User as UserIcon } from 'lucide-react';
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
        } else if (schedule.type === 'homework' && schedule.homeworkId) {
            const submissionsQuery = query(collection(firestore, 'homeworks', schedule.homeworkId, 'submissions'));
            unsubscribe = onSnapshot(submissionsQuery, async (snapshot) => {
                const submissionsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const homeworkRef = doc(firestore, 'homeworks', schedule.homeworkId!);
                const homeworkSnap = await getDoc(homeworkRef);
                const homeworkData = homeworkSnap.exists() ? homeworkSnap.data() : null;
                setDetails({ type: 'homework', submissions: submissionsList, homework: homeworkData });
                setLoading(false);
            }, (serverError: any) => {
                if (serverError.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({ path: `homeworks/${schedule.homeworkId}/submissions`, operation: 'list', }, { cause: serverError });
                    errorEmitter.emit('permission-error', permissionError);
                }
                setLoading(false);
            });
        } else {
             setLoading(false);
        }

        return () => unsubscribe && unsubscribe();
    }, [firestore, schedule]);
    
    const displayDate = (schedule.date || schedule.startDate || schedule.createdAt)?.toDate();

    return (
        <Card className="rounded-[3rem] border-muted/20 shadow-2xl overflow-hidden bg-white/50 backdrop-blur-xl">
            <CardHeader className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-white p-8 flex flex-row items-center justify-between">
                <div>
                   <CardTitle className="text-2xl font-black font-headline tracking-tight text-slate-900">{schedule.title}</CardTitle>
                   <CardDescription className="capitalize font-medium flex items-center gap-2 mt-1">
                       <span className="text-primary font-bold">{schedule.subject}</span>
                       <span className="h-1 w-1 rounded-full bg-slate-300" />
                       <span>{schedule.type} on {displayDate ? format(displayDate, 'PPP') : 'N/A'}</span>
                   </CardDescription>
                </div>
                <Badge className="rounded-2xl bg-white shadow-sm border border-slate-100 px-6 py-2 text-[10px] font-black uppercase tracking-widest text-primary">{schedule.type}</Badge>
            </CardHeader>
            <CardContent className="p-0">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                         <div className="relative">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            <div className="absolute inset-0 blur-lg bg-primary/20 animate-pulse rounded-full" />
                        </div>
                    </div>
                ) : details?.type === 'class' ? (
                    <div className="p-8"><ClassAttendance attendees={details.attendees} /></div>
                ) : details?.type === 'exam' ? (
                    <div className="p-8"><ExamSubmissions submissions={details.submissions} exam={details.exam} /></div>
                ) : details?.type === 'homework' ? (
                    <div className="p-8"><HomeworkSubmissions submissions={details.submissions} homework={details.homework} /></div>
                ) : (
                    <div className="p-20 text-center">
                        <div className="h-20 w-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                            <FileText className="h-10 w-10 text-slate-200" />
                        </div>
                        <p className="text-slate-400 font-bold">No details found for this item.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function HomeworkSubmissions({ submissions, homework }: { submissions: any[], homework: any }) {
    const [viewingResults, setViewingResults] = useState<any>(null);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-primary/[0.03] p-6 rounded-[2rem] border border-primary/5">
                <div>
                    <h4 className="font-black text-lg font-headline leading-tight">Submission Flow</h4>
                    <p className="text-xs text-muted-foreground font-medium">{submissions.length} students have checked in</p>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-white shadow-sm border border-primary/10 flex items-center justify-center">
                    <p className="text-2xl font-black text-primary">{submissions.length}</p>
                </div>
            </div>
            {submissions.length > 0 ? (
                <ul className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {submissions.map(sub => (
                        <li key={sub.id} className="flex items-center gap-5 p-5 rounded-[2rem] border-2 border-transparent bg-slate-50/50 hover:bg-white hover:border-primary/10 hover:shadow-xl transition-all duration-300 group">
                            <div className="h-14 w-14 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:border-primary/20 transition-colors">
                                {sub.studentAvatar ? <img src={sub.studentAvatar} className="h-full w-full object-cover rounded-2xl"/> : sub.studentName?.charAt(0) || 'S'}
                            </div>
                            <div className="flex-1">
                                <p className="font-black text-slate-800 text-sm leading-none mb-1.5">{sub.studentName}</p>
                                <div className="flex items-center gap-1.5">
                                    <div className="h-4 w-4 bg-emerald-100 rounded-full flex items-center justify-center">
                                        <CheckCircle className="h-2.5 w-2.5 text-emerald-600" />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 tracking-tight">
                                        Submitted {format(sub.submittedAt.toDate(), 'MMM dd, p')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {sub.homeworkType === 'mcq' && (
                                    <Button 
                                        onClick={() => setViewingResults(sub)}
                                        size="sm" 
                                        variant="outline" 
                                        className="rounded-xl border-emerald-200 bg-emerald-50/50 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 text-emerald-700 text-[10px] font-black uppercase tracking-wider px-4 transition-all"
                                    >
                                        View Results
                                    </Button>
                                )}
                                {sub.homeworkType === 'descriptive' && (
                                    <Button asChild size="sm" variant="outline" className="rounded-xl border-primary/20 bg-primary/5 hover:bg-primary hover:text-white text-primary text-[10px] font-black uppercase tracking-wider px-4 transition-all">
                                        <a href={sub.answerFileUrl} target="_blank" rel="noopener noreferrer">View Answer</a>
                                    </Button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-[3rem] bg-slate-50/50">
                    <UserIcon className="h-12 w-12 mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 font-bold">No students have submitted yet.</p>
                </div>
            )}

            {viewingResults && homework && (
                <Dialog open={!!viewingResults} onOpenChange={(open) => !open && setViewingResults(null)}>
                    <DialogContent className="sm:max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                        <div className="bg-gradient-to-br from-primary/10 via-white to-white p-8 border-b border-slate-100">
                            <DialogHeader>
                                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                                    <CheckCircle className="h-6 w-6 text-primary" />
                                </div>
                                <DialogTitle className="text-2xl font-black font-headline text-slate-900">MCQ Results: {viewingResults.studentName}</DialogTitle>
                                <DialogDescription className="font-medium text-slate-500">{homework.title}</DialogDescription>
                            </DialogHeader>
                        </div>
                        <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-6">
                                {homework.questions?.map((q: any, idx: number) => {
                                    const studentAnswerIndex = viewingResults.answers?.[idx];
                                    const isCorrect = studentAnswerIndex === q.correctAnswerIndex;
                                    return (
                                        <div key={idx} className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                                            <div className="flex gap-4 mb-4">
                                                <div className="h-8 w-8 min-w-[32px] rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-xs font-black text-slate-400">
                                                    {idx + 1}
                                                </div>
                                                <p className="font-bold text-slate-800 leading-relaxed">{q.questionText}</p>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-12">
                                                {q.options.map((opt: any, optIdx: number) => {
                                                    const isSelected = studentAnswerIndex === optIdx;
                                                    const isTrueCorrect = q.correctAnswerIndex === optIdx;
                                                    return (
                                                        <div 
                                                            key={optIdx} 
                                                            className={cn(
                                                                "p-3 rounded-xl text-xs font-bold transition-all border-2",
                                                                isTrueCorrect 
                                                                    ? "bg-emerald-100 border-emerald-200 text-emerald-800" 
                                                                    : isSelected 
                                                                        ? "bg-rose-100 border-rose-200 text-rose-800"
                                                                        : "bg-white border-transparent text-slate-500"
                                                            )}
                                                        >
                                                            {opt.text}
                                                            {isTrueCorrect && <CheckCircle className="h-3 w-3 inline-block ml-2 mb-0.5" />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {!isCorrect && (
                                                <div className="mt-4 pl-12 flex items-center gap-2">
                                                    <Badge variant="outline" className="text-[10px] font-black uppercase text-rose-600 border-rose-200 bg-rose-50">Wrong Answer</Badge>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <DialogFooter className="p-6 bg-slate-50/50 border-t border-slate-100">
                            <Button onClick={() => setViewingResults(null)} className="rounded-2xl px-10 font-black h-12">Close Review</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

function ClassAttendance({ attendees }: { attendees: any[] }) {
    return attendees.length > 0 ? (
        <ul className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {attendees.map(attendee => (
                <li key={attendee.id} className="flex items-center gap-4 p-2 rounded-md border">
                    <Avatar>
                        {attendee.studentAvatar && !attendee.studentAvatar.includes('688z9X5/user.png') && <AvatarImage src={attendee.studentAvatar} alt={attendee.studentName} className="object-cover" />}
                        <AvatarFallback className="bg-muted text-muted-foreground flex items-center justify-center">
                            <UserIcon className="h-2/3 w-2/3" />
                        </AvatarFallback>
                    </Avatar>
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
                                {(exam as any)?.student?.avatarUrl && !(exam as any)?.student?.avatarUrl.includes('688z9X5/user.png') && <AvatarImage src={(exam as any)?.student?.avatarUrl} alt={sub.studentName} className="object-cover" />}
                                <AvatarFallback className="bg-muted text-muted-foreground flex items-center justify-center">
                                    <UserIcon className="h-2/3 w-2/3" />
                                </AvatarFallback>
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
