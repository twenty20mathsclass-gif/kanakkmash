
'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, query, where, getDocs, onSnapshot, addDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import type { User, SalaryPayment } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, University, Hash, Landmark, User as UserIcon, IndianRupee, PlusCircle, CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


const addPaymentSchema = z.object({
    amount: z.coerce.number().positive("Amount must be positive."),
    periodStart: z.date({ required_error: "Start date is required." }),
    periodEnd: z.date({ required_error: "End date is required." }),
}).refine(data => data.periodEnd > data.periodStart, {
    message: "End date must be after start date.",
    path: ["periodEnd"],
});
type AddPaymentValues = z.infer<typeof addPaymentSchema>;


function SalaryDetailsModal({ teacher, isOpen, onOpenChange }: { teacher: User | null; isOpen: boolean; onOpenChange: (open: boolean) => void }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [payments, setPayments] = useState<SalaryPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [formError, setFormError] = useState<string|null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<AddPaymentValues>({
        resolver: zodResolver(addPaymentSchema),
        defaultValues: { amount: 0 },
    });

    useEffect(() => {
        if (!firestore || !teacher) {
            setPayments([]);
            setLoading(true);
            return;
        };
        setLoading(true);

        const paymentsQuery = query(
            collection(firestore, 'salaryPayments'),
            where('teacherId', '==', teacher.id),
            orderBy('paymentDate', 'desc')
        );

        const unsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
            const paymentsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalaryPayment));
            setPayments(paymentsList);
            setLoading(false);
        }, (serverError: any) => {
            if (serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({ path: 'salaryPayments', operation: 'list' }, { cause: serverError });
                errorEmitter.emit('permission-error', permissionError);
            } else {
                console.error("Error fetching salary history: ", serverError);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, teacher]);

    if (!teacher) return null;

    const handleAddPayment = async (data: AddPaymentValues) => {
        if (!firestore || !teacher) return;
        setIsSubmitting(true);
        setFormError(null);

        const paymentData = {
            ...data,
            teacherId: teacher.id,
            paymentDate: serverTimestamp(),
        };

        try {
            await addDoc(collection(firestore, 'salaryPayments'), paymentData);
            toast({ title: "Success", description: `Payment of ${data.amount} recorded for ${teacher.name}.` });
            form.reset({amount: 0});
        } catch (serverError: any) {
            if (serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({ path: 'salaryPayments', operation: 'create', requestResourceData: paymentData }, { cause: serverError });
                errorEmitter.emit('permission-error', permissionError);
                setFormError("You don't have permission to add payments.");
            } else {
                 console.error("Error adding payment: ", serverError);
                 setFormError("An unexpected error occurred.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Salary Details for {teacher.name}</DialogTitle>
                    <DialogDescription>View payment history and record new salary payments.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-6">
                    <Card>
                        <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
                        <CardContent>
                             {loading ? <div className="flex justify-center my-8"><Loader2 className="animate-spin" /></div> :
                             payments.length > 0 ? (
                                <Table>
                                    <TableHeader><TableRow><TableHead>Payment Date</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {payments.map(p => (
                                            <TableRow key={p.id}>
                                                <TableCell>{p.paymentDate ? format(p.paymentDate.toDate(), 'PPP') : 'Processing'}</TableCell>
                                                <TableCell>{format(p.periodStart.toDate(), 'd MMM yyyy')} - {format(p.periodEnd.toDate(), 'd MMM yyyy')}</TableCell>
                                                <TableCell className="text-right font-medium flex items-center justify-end gap-1"><IndianRupee className="h-4 w-4" />{p.amount.toLocaleString('en-IN')}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                             ) : <p className="text-sm text-center text-muted-foreground py-4">No payment records found.</p>
                            }
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader><CardTitle>Record New Payment</CardTitle></CardHeader>
                        <CardContent>
                           <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleAddPayment)} className="space-y-4">
                                <FormField name="amount" control={form.control} render={({field}) => (
                                    <FormItem><FormLabel>Amount (INR)</FormLabel><FormControl><Input type="number" {...field}/></FormControl><FormMessage/></FormItem>
                                )} />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField name="periodStart" control={form.control} render={({field}) => (
                                        <FormItem className="flex flex-col"><FormLabel>Period Start</FormLabel><Popover><PopoverTrigger asChild><FormControl>
                                            <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button>
                                        </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                                    )}/>
                                     <FormField name="periodEnd" control={form.control} render={({field}) => (
                                        <FormItem className="flex flex-col"><FormLabel>Period End</FormLabel><Popover><PopoverTrigger asChild><FormControl>
                                            <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button>
                                        </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                                    )}/>
                                </div>
                                {formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>Error</AlertTitle><AlertDescription>{formError}</AlertDescription></Alert>}
                                <Button type="submit" disabled={isSubmitting}><PlusCircle className="mr-2 h-4 w-4"/> {isSubmitting ? 'Recording...' : 'Record Payment'}</Button>
                            </form>
                           </Form>
                        </CardContent>
                     </Card>
                </div>
                
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function AccountantSalariesPage() {
    const { firestore } = useFirebase();
    const [teachers, setTeachers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTeacher, setSelectedTeacher] = useState<User | null>(null);

    useEffect(() => {
        if (!firestore) return;

        const fetchTeachers = async () => {
            setLoading(true);
            try {
                const q = query(collection(firestore, 'users'), where('role', '==', 'teacher'));
                const querySnapshot = await getDocs(q);
                const teachersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                setTeachers(teachersList);
            } catch (serverError: any) {
                if (serverError.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({ path: 'users', operation: 'list' }, { cause: serverError });
                    errorEmitter.emit('permission-error', permissionError);
                } else {
                    console.error("Error fetching teachers: ", serverError);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchTeachers();
    }, [firestore]);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Teacher Salaries</h1>
                    <p className="text-muted-foreground">Manage and process salary payments for teachers.</p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : teachers.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {teachers.map(teacher => (
                        <Card key={teacher.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedTeacher(teacher)}>
                            <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={teacher.avatarUrl} alt={teacher.name} />
                                    <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="grid gap-1">
                                    <CardTitle>{teacher.name}</CardTitle>
                                    <CardDescription>{teacher.email}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {teacher.accountHolderName ? (
                                    <div className="space-y-3 rounded-md border p-4 text-sm">
                                        <div className="flex items-center gap-3">
                                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                                            <span>{teacher.accountHolderName}</span>
                                        </div>
                                         <div className="flex items-center gap-3">
                                            <Landmark className="h-4 w-4 text-muted-foreground" />
                                            <span>{teacher.bankName}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Hash className="h-4 w-4 text-muted-foreground" />
                                            <span>{teacher.accountNumber}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <University className="h-4 w-4 text-muted-foreground" />
                                            <span>{teacher.ifscCode}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-muted-foreground p-6 border-2 border-dashed rounded-lg">
                                        <p>Bank details not provided.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                    <p>No teachers found in the system.</p>
                </div>
            )}
            <SalaryDetailsModal teacher={selectedTeacher} isOpen={!!selectedTeacher} onOpenChange={(open) => { if (!open) setSelectedTeacher(null) }} />
        </div>
    );
}
