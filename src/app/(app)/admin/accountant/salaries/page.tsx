
'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useFirebase } from '@/firebase';
import { collection, query, where, getDocs, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import type { User, SalaryPayment, Schedule, TeacherPrivateDetails } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, University, Hash, Landmark, User as UserIcon, IndianRupee, PlusCircle, QrCode } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


const addPaymentSchema = z.object({
    hourlyRate: z.coerce.number().positive("Hourly rate must be positive."),
    totalHours: z.coerce.number().positive("Total hours must be positive."),
});
type AddPaymentValues = z.infer<typeof addPaymentSchema>;


function SalaryDetailsModal({ teacher, isOpen, onOpenChange }: { teacher: User | null; isOpen: boolean; onOpenChange: (open: boolean) => void }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [payments, setPayments] = useState<SalaryPayment[]>([]);
    const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [formError, setFormError] = useState<string|null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<AddPaymentValues>({
        resolver: zodResolver(addPaymentSchema),
        defaultValues: {
            hourlyRate: 0,
            totalHours: 0,
        },
    });

    const hourlyRate = form.watch('hourlyRate');
    const totalHours = form.watch('totalHours');
    const calculatedAmount = useMemo(() => hourlyRate * totalHours, [hourlyRate, totalHours]);


    useEffect(() => {
        if (!firestore || !teacher) {
            setPayments([]);
            setAllSchedules([]);
            setLoading(true);
            return;
        };
        setLoading(true);

        const paymentsQuery = query(
            collection(firestore, 'salaryPayments'),
            where('teacherId', '==', teacher.id)
        );

        const unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
            const paymentsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalaryPayment));
            
            paymentsList.sort((a, b) => {
                if (a.paymentDate && b.paymentDate) {
                    return b.paymentDate.toDate().getTime() - a.paymentDate.toDate().getTime();
                }
                return a.paymentDate ? -1 : 1;
            });

            setPayments(paymentsList);
            setLoading(false);
        }, (serverError: any) => {
            if (serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({ path: 'salaryPayments', operation: 'list' }, { cause: serverError });
                errorEmitter.emit('permission-error', permissionError);
            } else {
                console.warn("Error fetching salary history: ", serverError);
            }
            setLoading(false);
        });

        const schedulesQuery = query(collection(firestore, 'schedules'), where('teacherId', '==', teacher.id));
        const unsubscribeSchedules = onSnapshot(schedulesQuery, (snapshot) => {
            const schedulesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule));
            setAllSchedules(schedulesList);
        }, (error) => {
            console.warn("Error fetching schedules: ", error);
        });


        return () => {
            unsubscribePayments();
            unsubscribeSchedules();
        };
    }, [firestore, teacher]);

    const calculatedMonthlyHours = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const totalMinutes = allSchedules.reduce((acc, schedule) => {
            const scheduleDate = schedule.date.toDate();
            if (scheduleDate.getMonth() === currentMonth && scheduleDate.getFullYear() === currentYear) {
                if (schedule.type === 'exam' && typeof schedule.duration === 'number') {
                    return acc + schedule.duration;
                }
                if (schedule.type === 'class' && schedule.startTime && schedule.endTime) {
                    try {
                        const start = new Date(`1970-01-01T${schedule.startTime}:00`);
                        const end = new Date(`1970-01-01T${schedule.endTime}:00`);
                        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                            const diff = end.getTime() - start.getTime();
                            return acc + Math.round(diff / (1000 * 60));
                        }
                    } catch (e) {
                         console.warn("Could not parse time for schedule:", schedule.id, e);
                    }
                }
            }
            return acc;
        }, 0);

        const hours = totalMinutes / 60;
        return Math.round(hours * 100) / 100;
    }, [allSchedules]);

    useEffect(() => {
        if (isOpen && teacher) {
            form.reset({
                hourlyRate: teacher.hourlyRate || 0,
                totalHours: calculatedMonthlyHours > 0 ? calculatedMonthlyHours : 0,
            });
        }
    }, [isOpen, teacher, form, calculatedMonthlyHours]);


    if (!teacher) return null;

    const handleAddPayment = (data: AddPaymentValues) => {
        if (!firestore || !teacher) return;
        setIsSubmitting(true);
        setFormError(null);

        const salaryPaymentsCollection = collection(firestore, 'salaryPayments');
        const paymentData = {
            ...data,
            amount: data.hourlyRate * data.totalHours,
            teacherId: teacher.id,
            paymentDate: serverTimestamp(),
        };

        addDoc(salaryPaymentsCollection, paymentData)
            .then(() => {
                toast({ title: "Success", description: `Payment of ${paymentData.amount.toLocaleString('en-IN')} recorded for ${teacher.name}.` });
                form.reset({ hourlyRate: teacher.hourlyRate || 0, totalHours: calculatedMonthlyHours > 0 ? calculatedMonthlyHours : 0 });
            })
            .catch(async (serverError: any) => {
                if (serverError.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({ path: salaryPaymentsCollection.path, operation: 'create', requestResourceData: paymentData }, { cause: serverError });
                    errorEmitter.emit('permission-error', permissionError);
                    setFormError("You don't have permission to add payments.");
                } else {
                     console.warn("Error adding payment: ", serverError);
                     setFormError("An unexpected error occurred.");
                }
            })
            .finally(() => {
                setIsSubmitting(false);
            });
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
                                    <TableHeader><TableRow><TableHead>Payment Date</TableHead><TableHead>Hourly Rate</TableHead><TableHead>Total Hours</TableHead><TableHead className="text-right">Amount Paid</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {payments.map(p => (
                                            <TableRow key={p.id}>
                                                <TableCell>{p.paymentDate ? format(p.paymentDate.toDate(), 'PPP') : 'Processing'}</TableCell>
                                                <TableCell className="flex items-center gap-1"><IndianRupee className="h-4 w-4" />{p.hourlyRate.toLocaleString('en-IN')}</TableCell>
                                                <TableCell>{p.totalHours}</TableCell>
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
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField name="hourlyRate" control={form.control} render={({field}) => (
                                        <FormItem>
                                            <FormLabel>Hourly Rate (INR)</FormLabel>
                                            <FormControl><Input type="number" {...field}/></FormControl>
                                            <FormDescription>Pre-filled from teacher's profile.</FormDescription>
                                            <FormMessage/>
                                        </FormItem>
                                    )} />
                                    <FormField name="totalHours" control={form.control} render={({field}) => (
                                        <FormItem>
                                            <FormLabel>Total Hours</FormLabel>
                                            <FormControl><Input type="number" {...field}/></FormControl>
                                            <FormDescription>Auto-calculated for {format(new Date(), 'MMMM yyyy')}. You can override this.</FormDescription>
                                            <FormMessage/>
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="p-4 bg-muted rounded-md text-center">
                                    <p className="text-sm text-muted-foreground">Calculated Total Amount</p>
                                    <p className="text-2xl font-bold flex items-center justify-center gap-1"><IndianRupee className="h-6 w-6" />{calculatedAmount.toLocaleString('en-IN')}</p>
                                </div>
                                {formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>Error</AlertTitle><AlertDescription>{formError}</AlertDescription></Alert>}
                                <Button type="submit" disabled={isSubmitting || calculatedAmount <= 0}><PlusCircle className="mr-2 h-4 w-4"/> {isSubmitting ? 'Recording...' : 'Record Payment'}</Button>
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

                const teachersWithDetails = await Promise.all(teachersList.map(async (teacher) => {
                    const detailsRef = doc(firestore, 'users', teacher.id, 'teacher_details', 'payment');
                    const detailsSnap = await getDoc(detailsRef);
                    if (detailsSnap.exists()) {
                        return { ...teacher, ...(detailsSnap.data() as TeacherPrivateDetails) };
                    }
                    return teacher;
                }));

                setTeachers(teachersWithDetails);
            } catch (serverError: any) {
                if (serverError.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({ path: 'users', operation: 'list' }, { cause: serverError });
                    errorEmitter.emit('permission-error', permissionError);
                } else {
                    console.warn("Error fetching teachers: ", serverError);
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
                                {teacher.paymentMethod === 'upi' ? (
                                    <div className="space-y-3 rounded-md border p-4 text-sm">
                                        <div className="font-semibold text-center mb-2">UPI Details</div>
                                        <div className="flex items-center gap-3">
                                            <QrCode className="h-4 w-4 text-muted-foreground" />
                                            <span>{teacher.upiId}</span>
                                        </div>
                                        {teacher.upiQrCodeUrl && (
                                            <div className="pt-2">
                                                <p className="text-xs text-muted-foreground mb-2">QR Code:</p>
                                                <Image src={teacher.upiQrCodeUrl} alt="UPI QR Code" width={128} height={128} className="rounded-md mx-auto border p-1" />
                                            </div>
                                        )}
                                    </div>
                                ) : teacher.paymentMethod === 'bank' || teacher.accountHolderName ? (
                                    <div className="space-y-3 rounded-md border p-4 text-sm">
                                        <div className="font-semibold text-center mb-2">Bank Details</div>
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
                                        <p>Payment details not provided.</p>
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
