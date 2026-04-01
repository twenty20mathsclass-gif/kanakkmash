
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc, where, getDocs, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { CourseFee, CourseModel } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, PlusCircle, Trash2, IndianRupee, Edit } from 'lucide-react';
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
const twenty20Levels = [
    { label: 'Level 1 (Class 1 & 2)', value: 'Level 1' },
    { label: 'Level 2 (Class 3 & 4)', value: 'Level 2' },
    { label: 'Level 3 (Class 5, 6, 7)', value: 'Level 3' },
    { label: 'Level 4 (Class 8, 9, 10)', value: 'Level 4' },
    { label: 'Level 5 (Class +1 & +2)', value: 'Level 5' },
];

const feeSchema = z.object({
  courseModel: z.string().min(1, 'Course model is required.'),
  learningMode: z.enum(['group', 'one to one']).optional(),
  amount: z.coerce.number().min(0, 'Amount must be a positive number.'),
  class: z.string().optional(),
  level: z.string().optional(),
  syllabus: z.string().optional(),
  competitiveExam: z.string().optional(),
});
type FeeFormValues = z.infer<typeof feeSchema>;

export default function AdminFeesPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fees, setFees] = useState<CourseFee[]>([]);
    const [courseModels, setCourseModels] = useState<CourseModel[]>([]);
    const [loadingFees, setLoadingFees] = useState(true);
    const [feeToDelete, setFeeToDelete] = useState<CourseFee | null>(null);

    const form = useForm<FeeFormValues>({
        resolver: zodResolver(feeSchema),
        defaultValues: { amount: 0, class: '', level: '', syllabus: '', competitiveExam: '', courseModel: '', learningMode: 'group' },
    });

    const courseModelName = form.watch('courseModel');
    const activeModel = courseModels.find(m => m.name === courseModelName);

    useEffect(() => {
        if (!firestore) return;
        const qModels = query(collection(firestore, 'courseModels'));
        const unsubModels = onSnapshot(qModels, (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseModel)).filter(m => m.isActive);
            list.sort((a, b) => a.name.localeCompare(b.name));
            setCourseModels(list);
        });

        const qFees = query(collection(firestore, 'courseFees'), orderBy('createdAt', 'desc'));
        const unsubFees = onSnapshot(qFees, (snapshot) => {
            const feesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseFee));
            setFees(feesData);
            setLoadingFees(false);
        }, (err: any) => {
            if (err.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'courseFees', operation: 'list' }, { cause: err }));
            }
            setLoadingFees(false);
        });
        return () => { unsubModels(); unsubFees(); };
    }, [firestore]);

    const [feeToEdit, setFeeToEdit] = useState<CourseFee | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const openEditDialog = (fee: CourseFee) => {
        setFeeToEdit(fee);
        form.reset({
            courseModel: fee.courseModel,
            learningMode: fee.learningMode || 'group',
            amount: fee.amount,
            class: fee.class || '',
            level: fee.level || '',
            syllabus: fee.syllabus || '',
            competitiveExam: fee.competitiveExam || '',
        });
        setIsEditDialogOpen(true);
    };

    const onSubmit = async (data: FeeFormValues) => {
        if (!firestore) return;
        setLoading(true);
        setError(null);
        
        try {
            const feeData: any = {
                courseModel: data.courseModel,
                learningMode: data.learningMode,
                amount: data.amount,
                updatedAt: serverTimestamp(),
            };
            if (data.class) feeData.class = data.class; else feeData.class = null;
            if (data.level) feeData.level = data.level; else feeData.level = null;
            if (data.syllabus) feeData.syllabus = data.syllabus; else feeData.syllabus = null;
            if (data.competitiveExam) feeData.competitiveExam = data.competitiveExam; else feeData.competitiveExam = null;

            if (feeToEdit) {
                await updateDoc(doc(firestore, 'courseFees', feeToEdit.id), feeData);
                toast({ title: 'Success', description: 'Fee rule has been updated.' });
            } else {
                feeData.createdAt = serverTimestamp();
                await addDoc(collection(firestore, 'courseFees'), feeData);
                toast({ title: 'Success', description: 'New fee rule has been created.' });
            }
            
            setIsEditDialogOpen(false);
            setFeeToEdit(null);
            form.reset({ amount: 0, class: '', level: '', syllabus: '', competitiveExam: '', courseModel: data.courseModel, learningMode: data.learningMode });
        } catch (err: any) {
            if (err.code === 'permission-denied') {
                const path = feeToEdit ? `courseFees/${feeToEdit.id}` : 'courseFees';
                const op = feeToEdit ? 'update' : 'create';
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path, operation: op }, { cause: err }));
                setError(`You don't have permission to ${op} fees.`);
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
        if (fee.competitiveExam) return fee.competitiveExam;
        if (fee.level) {
            const levelObj = twenty20Levels.find(l => l.value === fee.level);
            return levelObj ? levelObj.label : fee.level;
        }
        if (fee.class) {
            if (fee.class === 'DEGREE') return 'Degree';
            return `${fee.class}${fee.syllabus ? ` - ${fee.syllabus}` : ''}`;
        }
        return 'General';
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Course Fee Management</h1>
                    <p className="text-muted-foreground">Set and manage registration fees for different course models.</p>
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
                                                {courseModels.map(m => (
                                                    <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    <FormMessage /></FormItem>
                                )}/>

                                <FormField control={form.control} name="learningMode" render={({ field }) => (
                                    <FormItem><FormLabel>Learning Mode</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="group">Group Mode</SelectItem>
                                                <SelectItem value="one to one">One to One Mode</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    <FormMessage /></FormItem>
                                )}/>
                                
                                {activeModel?.configType === 'class-syllabus' && (
                                    <>
                                        <FormField control={form.control} name="class" render={({ field }) => (
                                            <FormItem><FormLabel>Class</FormLabel>
                                                <Select onValueChange={(value) => {
                                                    field.onChange(value);
                                                    form.setValue('syllabus', '');
                                                }} value={field.value}>
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

                                {activeModel?.configType === 'level' && (
                                    <FormField control={form.control} name="level" render={({ field }) => (
                                        <FormItem><FormLabel>Level</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select a level" /></SelectTrigger></FormControl>
                                                <SelectContent>{twenty20Levels.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                        <FormMessage /></FormItem>
                                    )}/>
                                )}

                                {activeModel?.configType === 'competitive-exam' && (
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
                            <Button type="submit" disabled={loading} className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4"/> {loading ? 'Creating...' : 'Create Fee Rule'}</Button>
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
                                <TableHeader><TableRow><TableHead>Course Model</TableHead><TableHead>Mode</TableHead><TableHead>Condition</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {fees.map(fee => (
                                        <TableRow key={fee.id}>
                                            <TableCell className="whitespace-nowrap font-medium">{fee.courseModel}</TableCell>
                                            <TableCell className="capitalize">{fee.learningMode || 'All'}</TableCell>
                                            <TableCell>{getConditionText(fee)}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap"><div className="flex items-center justify-end font-bold"><IndianRupee className="h-3 w-3 mr-0.5"/>{fee.amount.toLocaleString('en-IN')}</div></TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(fee)} className="text-primary hover:bg-primary/10"><Edit className="h-4 w-4"/></Button>
                                                    <Button variant="ghost" size="icon" onClick={() => setFeeToDelete(fee)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4"/></Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {fees.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No fee rules defined yet.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={isEditDialogOpen} onOpenChange={(open) => {
                setIsEditDialogOpen(open);
                if (!open) setFeeToEdit(null);
            }}>
                <AlertDialogContent className="max-w-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Edit Fee Rule</AlertDialogTitle>
                        <AlertDialogDescription>Update the details and amount for this fee rule.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
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
                                                {courseModels.map(m => (
                                                    <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    <FormMessage /></FormItem>
                                )}/>

                                <FormField control={form.control} name="learningMode" render={({ field }) => (
                                    <FormItem><FormLabel>Learning Mode</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="group">Group Mode</SelectItem>
                                                <SelectItem value="one to one">One to One Mode</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    <FormMessage /></FormItem>
                                )}/>
                                
                                {activeModel?.configType === 'class-syllabus' && (
                                    <>
                                        <FormField control={form.control} name="class" render={({ field }) => (
                                            <FormItem><FormLabel>Class</FormLabel>
                                                <Select onValueChange={(value) => {
                                                    field.onChange(value);
                                                    form.setValue('syllabus', '');
                                                }} value={field.value}>
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

                                {activeModel?.configType === 'level' && (
                                    <FormField control={form.control} name="level" render={({ field }) => (
                                        <FormItem><FormLabel>Level</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select a level" /></SelectTrigger></FormControl>
                                                <SelectContent>{twenty20Levels.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                        <FormMessage /></FormItem>
                                    )}/>
                                )}

                                {activeModel?.configType === 'competitive-exam' && (
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
                            <AlertDialogFooter>
                                <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                                <Button type="submit" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update Fee Rule
                                </Button>
                            </AlertDialogFooter>
                        </form>
                    </Form>
                </AlertDialogContent>
            </AlertDialog>
            
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
