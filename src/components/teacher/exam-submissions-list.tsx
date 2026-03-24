
'use client';

import { useState, useEffect } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import type { Exam, ExamSubmission } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

export function ExamSubmissionsList() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [gradingSubmission, setGradingSubmission] = useState<ExamSubmission | null>(null);
    const [marks, setMarks] = useState<string>('');
    const [submittingGrade, setSubmittingGrade] = useState(false);

    const fetchSubmissions = async () => {
        if (!firestore || !user) return;
        setLoading(true);
        try {
            // 1. Get all exams by this teacher
            const examsQuery = query(collection(firestore, 'exams'), where('teacherId', '==', user.id));
            const examsSnapshot = await getDocs(examsQuery);
            const teacherExams = examsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));

            // 2. For each exam, fetch submissions
            const allSubmissions: ExamSubmission[] = [];
            for (const exam of teacherExams) {
                const subRef = collection(firestore, 'exams', exam.id, 'submissions');
                const subSnapshot = await getDocs(subRef);
                subSnapshot.docs.forEach(doc => {
                    allSubmissions.push({ id: doc.id, ...doc.data() } as ExamSubmission);
                });
            }

            // 3. Sort by submission date
            allSubmissions.sort((a, b) => {
                const dateA = a.submittedAt instanceof Timestamp ? a.submittedAt.toMillis() : 0;
                const dateB = b.submittedAt instanceof Timestamp ? b.submittedAt.toMillis() : 0;
                return dateB - dateA;
            });

            setSubmissions(allSubmissions);
        } catch (error) {
            console.error("Error fetching submissions:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load submissions.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubmissions();
    }, [firestore, user]);

    const handleOpenGradeDialog = (submission: ExamSubmission) => {
        setGradingSubmission(submission);
        setMarks(String(submission.score || ''));
    };

    const handleSaveGrade = async () => {
        if (!firestore || !gradingSubmission || submittingGrade) return;
        
        setSubmittingGrade(true);
        try {
            const submissionRef = doc(firestore, 'exams', gradingSubmission.examId, 'submissions', gradingSubmission.studentId);
            await updateDoc(submissionRef, {
                score: parseFloat(marks),
                status: 'reviewed',
                gradedAt: Timestamp.now(),
            });
            
            toast({ title: 'Success', description: 'Grade saved successfully.' });
            setGradingSubmission(null);
            fetchSubmissions();
        } catch (error: any) {
            console.error("Grading error:", error);
            toast({ variant: 'destructive', title: 'Grading Failed', description: error.message });
        } finally {
            setSubmittingGrade(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <Card className="rounded-3xl border-muted/20 shadow-xl overflow-hidden backdrop-blur-sm bg-white/50">
            <CardHeader className="bg-primary/5 border-b border-muted/10 p-8">
                <CardTitle className="text-2xl font-bold font-headline">Student Answer Submissions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/5">
                            <TableRow className="border-muted/10">
                                <TableHead className="py-5 px-8 font-bold text-muted-foreground uppercase tracking-wider text-xs">Student</TableHead>
                                <TableHead className="py-5 px-8 font-bold text-muted-foreground uppercase tracking-wider text-xs">Exam Title</TableHead>
                                <TableHead className="py-5 px-8 font-bold text-muted-foreground uppercase tracking-wider text-xs">Type</TableHead>
                                <TableHead className="py-5 px-8 font-bold text-muted-foreground uppercase tracking-wider text-xs">Submitted At</TableHead>
                                <TableHead className="py-5 px-8 font-bold text-muted-foreground uppercase tracking-wider text-xs">Status / Score</TableHead>
                                <TableHead className="py-5 px-8 font-bold text-muted-foreground uppercase tracking-wider text-xs text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {submissions.map((sub, i) => (
                                <TableRow key={sub.id} className="border-muted/5 group hover:bg-muted/5 transition-colors duration-200">
                                    <TableCell className="py-5 px-8 font-medium">{sub.studentName}</TableCell>
                                    <TableCell className="py-5 px-8">{sub.examTitle}</TableCell>
                                    <TableCell className="py-5 px-8">
                                        <Badge variant={sub.examType === 'mcq' ? 'secondary' : 'outline'} className="rounded-full px-4 text-[10px] font-bold uppercase tracking-wider">
                                            {sub.examType}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-5 px-8 text-muted-foreground">
                                        {format(sub.submittedAt.toDate(), 'PPP p')}
                                    </TableCell>
                                    <TableCell className="py-5 px-8">
                                        {sub.examType === 'mcq' ? (
                                            <Badge className="bg-green-500 rounded-full px-4 text-[10px] font-bold uppercase tracking-wider">
                                                {sub.score} / {sub.totalQuestions} Marks
                                            </Badge>
                                        ) : (
                                            <Badge variant={sub.status === 'reviewed' ? 'secondary' : 'outline'} className={`rounded-full px-4 text-[10px] font-bold uppercase tracking-wider ${sub.status === 'reviewed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {sub.status === 'reviewed' ? `${sub.score} Marks` : 'Unchecked'}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-5 px-8 text-right">
                                        {sub.examType === 'descriptive' ? (
                                            <div className="flex gap-2 justify-end">
                                                {sub.answerFileUrl && (
                                                    <Button asChild size="sm" variant="ghost" className="h-8 w-8 rounded-lg p-0">
                                                        <a href={sub.answerFileUrl} target="_blank" rel="noopener noreferrer">
                                                            <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                    </Button>
                                                )}
                                                <Button size="sm" className="h-9 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white" onClick={() => handleOpenGradeDialog(sub)}>
                                                    Grade Answer
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button size="sm" variant="ghost" className="h-9 px-4 rounded-xl opacity-50 cursor-not-allowed">
                                                Completed
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {submissions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-24 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-4">
                                            <AlertCircle className="h-10 w-10 opacity-20" />
                                            <p className="text-lg">No student submissions found yet.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            <Dialog open={!!gradingSubmission} onOpenChange={() => setGradingSubmission(null)}>
                <DialogContent className="rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold font-headline">Grade Descriptive Answer</DialogTitle>
                        <DialogDescription>Assign marks for {gradingSubmission?.studentName}&apos;s submission for &quot;{gradingSubmission?.examTitle}&quot;.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-6">
                        {gradingSubmission?.answerFileUrl && (
                            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                        <FileText className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">Download Answer File</p>
                                        <p className="text-xs text-muted-foreground">PDF or Image submitted by student</p>
                                    </div>
                                </div>
                                <Button asChild variant="outline" size="sm" className="rounded-xl">
                                    <a href={gradingSubmission.answerFileUrl} target="_blank" rel="noopener noreferrer">
                                        <Eye className="mr-2 h-4 w-4" /> View Now
                                    </a>
                                </Button>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label className="font-bold">Score / Marks</Label>
                            <Input 
                                type="number" 
                                placeholder="Enter marks (e.g. 85)" 
                                value={marks} 
                                onChange={(e) => setMarks(e.target.value)}
                                className="h-12 rounded-xl focus-visible:ring-primary/20"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" className="rounded-xl" onClick={() => setGradingSubmission(null)}>Cancel</Button>
                        <Button className="rounded-xl px-8 bg-orange-600 hover:bg-orange-700 text-white" onClick={handleSaveGrade} disabled={!marks || submittingGrade}>
                            {submittingGrade && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Marks
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

const FileText = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M9 9h6"/><path d="M9 13h6"/><path d="M9 17h3"/></svg>
);
