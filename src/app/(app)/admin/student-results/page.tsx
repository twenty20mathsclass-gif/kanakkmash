
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirebase } from '@/firebase';
import { collection, query, where, orderBy, onSnapshot, collectionGroup } from 'firebase/firestore';
import type { User, ExamSubmission } from '@/lib/definitions';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Calendar as CalendarIcon, X, Award } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, isSameDay, formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

function ScoreBadge({ score, total }: { score: number, total: number }) {
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const colorClass = 
        percentage >= 80 ? 'bg-green-500/10 text-green-700 border-green-500/20' :
        percentage >= 50 ? 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' :
        'bg-red-500/10 text-red-700 border-red-500/20';

    return (
        <Badge variant="outline" className={cn("text-base font-bold", colorClass)}>
            {score} / {total}
        </Badge>
    )
}

function StudentResults({ student }: { student: User }) {
    const { firestore } = useFirebase();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    useEffect(() => {
        if (!firestore || !student) return;
        setLoading(true);

        const submissionsQuery = query(
            collectionGroup(firestore, 'submissions'),
            where('studentId', '==', student.id),
            orderBy('submittedAt', 'desc')
        );

        const unsubscribe = onSnapshot(submissionsQuery, (snapshot) => {
            const subs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamSubmission));
            setSubmissions(subs);
            setLoading(false);
        }, (serverError: any) => {
            if (serverError.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'submissions collection group', operation: 'list', }, { cause: serverError }));
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, student]);

    const filteredSubmissions = useMemo(() => {
        if (!selectedDate) return submissions;
        return submissions.filter(sub => isSameDay(sub.submittedAt.toDate(), selectedDate));
    }, [submissions, selectedDate]);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                     <Avatar className="h-12 w-12">
                        <AvatarImage src={student.avatarUrl} alt={student.name} />
                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="font-headline">{student.name}'s Results</CardTitle>
                        <CardDescription>{student.email}</CardDescription>
                    </div>
                </div>
                 <div className="flex items-center gap-2 pt-4">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDate ? format(selectedDate, 'PPP') : <span>Filter by date...</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={selectedDate || undefined}
                                onSelect={(date) => setSelectedDate(date || null)}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                    {selectedDate && (
                        <Button variant="ghost" size="icon" onClick={() => setSelectedDate(null)}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {loading ? <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8" /></div> : (
                     <ScrollArea className="h-96">
                        {filteredSubmissions.length > 0 ? (
                            <Table>
                                <TableHeader><TableRow><TableHead>Exam Title</TableHead><TableHead>Submitted</TableHead><TableHead className="text-right">Result</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {filteredSubmissions.map(sub => (
                                        <TableRow key={sub.id} className="cursor-pointer" onClick={() => router.push(`/exams/result/${sub.studentId}_${sub.examId}`)}>
                                            <TableCell className="font-medium">{sub.examTitle}</TableCell>
                                            <TableCell>{formatDistanceToNow(sub.submittedAt.toDate(), { addSuffix: true })}</TableCell>
                                            <TableCell className="text-right">
                                                {sub.examType === 'mcq' && sub.score !== undefined && sub.totalQuestions ? (
                                                    <ScoreBadge score={sub.score} total={sub.totalQuestions} />
                                                ) : sub.examType === 'descriptive' ? (
                                                    sub.status === 'reviewed' && sub.score !== undefined && sub.totalMarks ? (
                                                        <ScoreBadge score={sub.score} total={sub.totalMarks} />
                                                    ) : (
                                                        <Badge variant="secondary">Pending</Badge>
                                                    )
                                                ) : null}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : <p className="text-center text-muted-foreground py-10">No results found for {selectedDate ? format(selectedDate, 'PPP') : 'this student'}.</p>}
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    )
}


export default function AdminStudentResultsPage() {
    const { firestore } = useFirebase();
    const [students, setStudents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    useEffect(() => {
        if (!firestore) return;

        const studentsQuery = query(collection(firestore, 'users'), where('role', '==', 'student'), orderBy('name', 'asc'));
        const unsubscribe = onSnapshot(studentsQuery, (snapshot) => {
            const studentsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setStudents(studentsList);
            setLoading(false);
        }, (err) => {
            if (err.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'users', operation: 'list' }, { cause: err }));
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);
    
    const filteredStudents = useMemo(() => {
        if (!searchTerm) return students;
        return students.filter(student => student.name.toLowerCase().includes(searchTerm.toLowerCase()) || student.email.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [students, searchTerm]);


    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
    }

    return (
        <div className="space-y-8">
             <div>
                <h1 className="text-3xl font-bold font-headline">Student Results</h1>
                <p className="text-muted-foreground">Review student exam performance.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 items-start">
                <div className="md:col-span-1">
                     <Card>
                        <CardHeader>
                            <CardTitle>All Students ({students.length})</CardTitle>
                            <CardDescription>Select a student to view their exam results.</CardDescription>
                            <div className="pt-2">
                                <Input 
                                    placeholder="Search by name or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                             <ScrollArea className="h-[70vh]">
                                <div className="space-y-2 pr-2">
                                {filteredStudents.length > 0 ? filteredStudents.map(student => (
                                    <button key={student.id} onClick={() => setSelectedStudent(student)}
                                        className={cn('w-full text-left p-3 rounded-lg border flex items-center gap-3 transition-colors',
                                            selectedStudent?.id === student.id ? 'bg-accent border-primary ring-1 ring-primary' : 'hover:bg-accent/50'
                                        )}
                                    >
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={student.avatarUrl} alt={student.name} />
                                            <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{student.name}</p>
                                            <p className="text-xs text-muted-foreground">{student.email}</p>
                                        </div>
                                    </button>
                                )) : <p className="text-center text-muted-foreground p-8">No students found.</p>}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-2 sticky top-20">
                     {selectedStudent ? <StudentResults student={selectedStudent} /> : (
                        <Card className="flex flex-col items-center justify-center h-96 border-2 border-dashed">
                            <Award className="h-16 w-16 text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">Select a student to see their results</p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
