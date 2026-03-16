'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { CourseFee } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, PlusCircle, Trash2, IndianRupee } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const classes = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).concat('DEGREE');
const syllabuses = ['Kerala State syllabus', 'CBSE kerala', 'CBSE UAE', 'CBSE KSA', 'ICSE'];
const competitiveExams = ['LSS', 'NuMATs', 'USS', 'NMMS', 'NTSE', 'PSC', 'MAT', 'KTET', 'CTET', 'NET', 'CSAT'];
const twenty20Levels = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];


const feeSchema = z.object({
  courseModel: z.enum(['MATHS ONLINE TUITION', 'TWENTY 20 BASIC MATHS', 'COMPETITIVE EXAM'], { required_error: 'Course model is required.'}),
  amount: z.coerce.number().min(0, 'Amount must be a positive number.'),
  class: z.string().optional(),
  level: z.string().optional(),
  syllabus: z.string().optional(),
  competitiveExam: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.courseModel === 'MATHS ONLINE TUITION') {
        if (!data.class) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Class is required.', path: ['class'] });
        } else if (data.class !== 'DEGREE' && !data.syllabus) {
             ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Syllabus is required for this class.', path: ['syllabus'] });
        }
    }
    if (data.courseModel === 'TWENTY 20 BASIC MATHS') {
        if (!data.level) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Level is required.', path: ['level'] });
        }
    }
    if (data.courseModel === 'COMPETITIVE EXAM') {
        if (!data.competitiveExam) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Competitive exam is required.', path: ['competitiveExam'] });
        }
    }
});
type FeeFormValues = z.infer<typeof feeSchema>;

export default function AdminFeesPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fees, setFees] = useState<CourseFee[]>([]);
    const [loadingFees, setLoadingFees] = useState(true);
    const [feeToDelete, setFeeToDelete] = useState<CourseFee | null>(null);

    const form = useForm<FeeFormValues>({
        resolver: zodResolver(feeSchema),
        defaultValues: { amount: 0, class: '', level: '', syllabus: '', competitiveExam: '' },
    });

    const courseModel = form.watch('courseModel');

    useEffect(() => {
        if (!firestore) return;
        const q = query(collection(firestore, 'courseFees'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const feesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseFee));
            setFees(feesData);
            setLoadingFees(false);
        }, (err: any) => {
            if (err.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'courseFees', operation: 'list' }, { cause: err }));
            }
            setLoadingFees(false);
        });
        return () => unsubscribe();
    }, [firestore]);

    const onSubmit = async (data: FeeFormValues) => {
        if (!firestore) return;
        setLoading(true);
        setError(null);
        
        try {
            const feeData: any = {
                courseModel: data.courseModel,
                amount: data.amount,
                createdAt: serverTimestamp(),
            };
            if (data.class) feeData.class = data.class;
            if (data.level) feeData.level = data.level;
            if (data.syllabus) feeData.syllabus = data.syllabus;
            if (data.competitiveExam) feeData.competitiveExam = data.competitiveExam;

            await addDoc(collection(firestore, 'courseFees'), feeData);
            toast({ title: 'Success', description: 'New fee rule has been created.' });
            form.setValue('amount', 0);
            form.setValue('class', '');
            form.setValue('level', '');
            form.setValue('syllabus', '');
            form.setValue('competitiveExam', '');
        } catch (err: any) {
            if (err.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'courseFees', operation: 'create' }, { cause: err }));
                setError("You don't have permission to create fees.");
            } else {
                setError('An unexpected error occurred.');
            }
        } finally {
            setLoading(false);
        }
    };
    
    const handleDeleteFee = async () => {
        if (!firestore || !feeToDelete) return;
        setLoading(true);
        try {
            await deleteDoc(doc(firestore, 'courseFees', feeToDelete.id));
            toast({ title: 'Success', description: 'Fee rule deleted.' });
        } catch (err: any) {
            if (err.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `courseFees/${feeToDelete.id}`, operation: 'delete' }, { cause: err }));
            }
        } finally {
            setLoading(false);
            setFeeToDelete(null);
        }
    };
    
    const getConditionText = (fee: CourseFee) => {
        if (fee.courseModel === 'COMPETITIVE EXAM') return fee.competitiveExam || '-';
        if (fee.courseModel === 'TWENTY 20 BASIC MATHS') return fee.level || 'General';
        if (fee.courseModel === 'MATHS ONLINE TUITION') {
            if (!fee.class) return 'General';
            if (fee.class === 'DEGREE') return 'Degree';
            return `${fee.class || ''} - ${fee.syllabus || ''}`;
        }
        return '-';
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Course Fee Management</h1>
                    <p className="text-muted-foreground">Set and manage registration fees for different courses.</p>
                </div>
            </div>

            <Card>
                <CardHeader><CardTitle>Create New Fee Rule</CardTitle></CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <FormField control={form.control} name="courseModel" render={({ field }) => (
                                    <FormItem><FormLabel>Course Model</FormLabel>
                                        <Select 
                                            onValueChange={(value) => { 
                                                field.onChange(value); 
                                                form.setValue('class', '');
                                                form.setValue('level', '');
                                                form.setValue('syllabus', '');
                                                form.setValue('competitiveExam', '');
                                            }} 
                                            value={field.value}
                                        >
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select a course model" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="MATHS ONLINE TUITION">MATHS ONLINE TUITION</SelectItem>
                                                <SelectItem value="TWENTY 20 BASIC MATHS">TWENTY 20 BASIC MATHS</SelectItem>
                                                <SelectItem value="COMPETITIVE EXAM">COMPETITIVE EXAM</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    <FormMessage /></FormItem>
                                )}/>
                                
                                {courseModel === 'MATHS ONLINE TUITION' && (
                                    <>
                                        <FormField control={form.control} name="class" render={({ field }) => (
                                            <FormItem><FormLabel>Class</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger></FormControl>
                                                    <SelectContent>{classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                                </Select>
                                            <FormMessage /></FormItem>
                                        )}/>
                                        {form.watch('class') && form.watch('class') !== 'DEGREE' && (
                                            <FormField control={form.control} name="syllabus" render={({ field }) => (
                                                <FormItem><FormLabel>Syllabus</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a syllabus" /></SelectTrigger></FormControl>
                                                        <SelectContent>{syllabuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                <FormMessage /></FormItem>
                                            )}/>
                                        )}
                                    </>
                                )}

                                {courseModel === 'TWENTY 20 BASIC MATHS' && (
                                    <FormField control={form.control} name="level" render={({ field }) => (
                                        <FormItem><FormLabel>Level</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select a level" /></SelectTrigger></FormControl>
                                                <SelectContent>{twenty20Levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                                            </Select>
                                        <FormMessage /></FormItem>
                                    )}/>
                                )}

                                {courseModel === 'COMPETITIVE EXAM' && (
                                    <FormField control={form.control} name="competitiveExam" render={({ field }) => (
                                        <FormItem><FormLabel>Competitive Exam</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select an exam" /></SelectTrigger></FormControl>
                                                <SelectContent>{competitiveExams.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                                            </Select>
                                        <FormMessage /></FormItem>
                                    )}/>
                                )}
                                <FormField control={form.control} name="amount" render={({ field }) => (
                                    <FormItem><FormLabel>Fee Amount (INR)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
                            <Button type="submit" disabled={loading}><PlusCircle className="mr-2 h-4 w-4"/> {loading ? 'Creating...' : 'Create Fee Rule'}</Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader><CardTitle>Existing Fee Rules</CardTitle></CardHeader>
                <CardContent>
                    {loadingFees ? <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div> : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader><TableRow><TableHead>Course Model</TableHead><TableHead>Condition</TableHead><TableHead>Amount</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {fees.map(fee => (
                                        <TableRow key={fee.id}>
                                            <TableCell className="whitespace-nowrap">{fee.courseModel}</TableCell>
                                            <TableCell>{getConditionText(fee)}</TableCell>
                                            <TableCell className="flex items-center"><IndianRupee className="h-4 w-4 mr-1"/>{fee.amount.toLocaleString('en-IN')}</TableCell>
                                            <TableCell><Button variant="ghost" size="icon" onClick={() => setFeeToDelete(fee)}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={!!feeToDelete} onOpenChange={(open) => !open && setFeeToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete the fee rule. This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteFee} disabled={loading} className="bg-destructive hover:bg-destructive/90">
                             {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}