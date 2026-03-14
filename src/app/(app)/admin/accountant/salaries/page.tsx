

'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useFirebase } from '@/firebase';
import { collection, query, where, getDocs, onSnapshot, addDoc, serverTimestamp, doc, getDoc, writeBatch } from 'firebase/firestore';
import type { User, SalaryPayment, Schedule, TeacherPrivateDetails } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, University, Hash, Landmark, User as UserIcon, IndianRupee, PlusCircle, QrCode, Calendar as CalendarIcon, Clock, Users as UsersIconComponent, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, startOfMonth, endOfMonth, parse } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ScheduleWithAttendance = Schedule & { attendance: number };

const addPaymentSchema = z.object({
    paymentMonth: z.string().min(1, 'Please select a month.'),
    hourlyRate: z.coerce.number().positive("Hourly rate must be positive."),
    totalHours: z.coerce.number().min(0, "Total hours cannot be negative."),
});
type AddPaymentValues = z.infer<typeof addPaymentSchema>;


function SalaryDetailsModal({ teacher, isOpen, onOpenChange }: { teacher: User | null; isOpen: boolean; onOpenChange: (open: boolean) => void }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [payments, setPayments] = useState<SalaryPayment[]>([]);
    const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
    const [monthlySchedules, setMonthlySchedules] = useState<ScheduleWithAttendance[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [loadingSchedules, setLoadingSchedules] = useState(false);
    const [formError, setFormError] = useState<string|null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<string | undefined>();

    const form = useForm<AddPaymentValues>({
        resolver: zodResolver(addPaymentSchema),
        defaultValues: {
            hourlyRate: 0,
            totalHours: 0,
        },
    });

    const monthOptions = useMemo(() => {
        if (!teacher?.createdAt) return [];
        const options: { label: string; value: string }[] = [];
        const start = teacher.createdAt.toDate();
        const end = new Date();
        
        let current = new Date(start.getFullYear(), start.getMonth(), 1);

        while (current <= end) {
            options.push({
                label: format(current, 'MMMM yyyy'),
                value: format(current, 'yyyy-MM'),
            });
            current.setMonth(current.getMonth() + 1);
        }
        return options.reverse(); // Show most recent first
    }, [teacher]);

    const hourlyRate = form.watch('hourlyRate');
    const totalHours = form.watch('totalHours');
    const calculatedAmount = useMemo(() => hourlyRate * totalHours, [hourlyRate, totalHours]);

    const getDurationInMinutes = (startTime: string, endTime: string): number => {
        if (!startTime || !endTime) return 0;
        try {
            const start = parse(startTime, 'HH:mm', new Date());
            const end = parse(endTime, 'HH:mm', new Date());
            const diff = end.getTime() - start.getTime();
            return Math.round(diff / (1000 * 60));
        } catch (e) {
             console.warn("Could not parse time for schedule", e);
             return 0;
        }
    };


    useEffect(() => {
        if (!firestore || !teacher) {
            setPayments([]);
            setAllSchedules([]);
            setLoadingHistory(true);
            return;
        };
        setLoadingHistory(true);

        const paymentsQuery = query(collection(firestore, 'users', teacher.id, 'salaryPayments'));
        const unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
            const paymentsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalaryPayment));
            paymentsList.sort((a, b) => b.endDate.toMillis() - a.endDate.toMillis());
            setPayments(paymentsList);
            setLoadingHistory(false);
        }, (serverError: any) => {
            if (serverError.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `users/${teacher.id}/salaryPayments`, operation: 'list' }, { cause: serverError }));
            }
            setLoadingHistory(false);
        });

        const schedulesQuery = query(collection(firestore, 'schedules'), where('teacherId', '==', teacher.id));
        const unsubscribeSchedules = onSnapshot(schedulesQuery, (snapshot) => {
            setAllSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule)));
        }, (error) => console.warn("Error fetching schedules: ", error));


        return () => {
            unsubscribePayments();
            unsubscribeSchedules();
        };
    }, [firestore, teacher]);

    useEffect(() => {
        if (isOpen && teacher) {
            form.reset({
                hourlyRate: teacher.hourlyRate || 0,
                totalHours: 0,
                paymentMonth: undefined,
            });
            setSelectedMonth(undefined);
            setMonthlySchedules([]);
            setFormError(null);
        }
    }, [isOpen, teacher, form]);

    useEffect(() => {
        if (!selectedMonth || !firestore) {
            setMonthlySchedules([]);
            form.setValue('totalHours', 0);
            return;
        }

        const fetchMonthDetails = async () => {
            setLoadingSchedules(true);
            
            const [year, month] = selectedMonth.split('-').map(Number);
            const monthStart = startOfMonth(new Date(year, month - 1, 1));
            const monthEnd = endOfMonth(monthStart);

            const schedulesInMonth = allSchedules.filter(s => {
                const scheduleDate = s.date.toDate();
                return scheduleDate >= monthStart && scheduleDate <= monthEnd;
            });
            
            const scheduleDetailsPromises = schedulesInMonth.map(async (schedule) => {
                const attendeesSnap = await getDocs(collection(firestore, 'schedules', schedule.id, 'attendees'));
                return { ...schedule, attendance: attendeesSnap.size };
            });
            
            const detailedSchedules = await Promise.all(scheduleDetailsPromises);
            setMonthlySchedules(detailedSchedules);

            const totalMinutes = schedulesInMonth.reduce((acc, schedule) => {
                let duration = 0;
                if (schedule.type === 'exam' && typeof schedule.duration === 'number') {
                    duration = schedule.duration;
                }
                if (schedule.type === 'class' && schedule.startTime && schedule.endTime) {
                    duration = getDurationInMinutes(schedule.startTime, schedule.endTime);
                }
                return acc + duration;
            }, 0);
            
            form.setValue('totalHours', Math.round((totalMinutes / 60) * 100) / 100);
            setLoadingSchedules(false);
        };
        
        fetchMonthDetails();

    }, [selectedMonth, allSchedules, firestore, form]);


    if (!teacher) return null;

    const handleAddPayment = async (data: AddPaymentValues) => {
        if (!firestore || !teacher) return;
        setIsSubmitting(true);
        setFormError(null);

        // Overlap check
        const hasOverlap = payments.some(p => p.paymentMonth === data.paymentMonth);

        if (hasOverlap) {
            setFormError("A payment for this month has already been recorded. Please check the payment history.");
            setIsSubmitting(false);
            return;
        }
        
        const [year, month] = data.paymentMonth.split('-').map(Number);
        const startDate = startOfMonth(new Date(year, month - 1));
        const endDate = endOfMonth(new Date(year, month - 1));

        const batch = writeBatch(firestore);
        const newInvoiceRef = doc(collection(firestore, 'salaryInvoices'));
        const invoiceData = {
            teacherId: teacher.id,
            teacherName: teacher.name,
            teacherEmail: teacher.email,
            paymentDate: serverTimestamp(),
            startDate: startDate,
            endDate: endDate,
            hourlyRate: data.hourlyRate,
            totalHours: data.totalHours,
            amount: data.hourlyRate * data.totalHours,
        };
        batch.set(newInvoiceRef, invoiceData);

        const salaryPaymentRef = doc(collection(firestore, 'users', teacher.id, 'salaryPayments'));
        const paymentData = {
            teacherId: teacher.id,
            hourlyRate: data.hourlyRate,
            totalHours: data.totalHours,
            amount: data.hourlyRate * data.totalHours,
            paymentDate: serverTimestamp(),
            startDate: startDate,
            endDate: endDate,
            paymentMonth: data.paymentMonth,
            invoiceId: newInvoiceRef.id,
        };
        batch.set(salaryPaymentRef, paymentData);


        try {
             await batch.commit();
             toast({ title: "Success", description: `Payment of ${paymentData.amount.toLocaleString('en-IN')} recorded and invoice created for ${teacher.name}.` });
             form.reset();
             setSelectedMonth(undefined);
             setMonthlySchedules([]);
        } catch (serverError: any) {
            if (serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({ path: `salaryInvoices or users/${teacher.id}/salaryPayments`, operation: 'create' }, { cause: serverError });
                errorEmitter.emit('permission-error', permissionError);
                setFormError("You don't have permission to add payments.");
            } else {
                    setFormError("An unexpected error occurred.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Salary Details for {teacher.name}</DialogTitle>
                    <DialogDescription>View payment history and record new salary payments.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-6">
                    <Card>
                        <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
                        <CardContent>
                             {loadingHistory ? <div className="flex justify-center my-8"><Loader2 className="animate-spin" /></div> :
                             payments.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Payment Month</TableHead><TableHead>Payment Date</TableHead><TableHead>Hourly Rate</TableHead><TableHead>Total Hours</TableHead><TableHead className="text-right">Amount Paid</TableHead><TableHead className="text-right">Invoice</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {payments.map(p => (
                                                <TableRow key={p.id}>
                                                    <TableCell className="whitespace-nowrap">
                                                        {p.paymentMonth 
                                                            ? format(parse(p.paymentMonth, 'yyyy-MM', new Date()), 'MMMM yyyy')
                                                            : (p.startDate && p.endDate ? `${format(p.startDate.toDate(), 'dd/MM/yy')} - ${format(p.endDate.toDate(), 'dd/MM/yy')}` : 'N/A')
                                                        }
                                                    </TableCell>
                                                    <TableCell className="whitespace-nowrap">{p.paymentDate ? format(p.paymentDate.toDate(), 'PPP') : 'Processing'}</TableCell>
                                                    <TableCell className="flex items-center gap-1 whitespace-nowrap"><IndianRupee className="h-4 w-4" />{p.hourlyRate.toLocaleString('en-IN')}</TableCell>
                                                    <TableCell>{p.totalHours}</TableCell>
                                                    <TableCell className="text-right font-medium flex items-center justify-end gap-1 whitespace-nowrap"><IndianRupee className="h-4 w-4" />{p.amount.toLocaleString('en-IN')}</TableCell>
                                                    <TableCell className="text-right">
                                                        {p.invoiceId && (
                                                            <Button asChild variant="ghost" size="icon">
                                                                <Link href={`/salary-invoice/${p.invoiceId}`} target="_blank"><FileText className="h-4 w-4" /></Link>
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                             ) : <p className="text-sm text-center text-muted-foreground py-4">No payment records found.</p>
                            }
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader><CardTitle>Record New Payment</CardTitle></CardHeader>
                        <CardContent>
                           <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleAddPayment)} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                                     <FormField
                                        control={form.control}
                                        name="paymentMonth"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Payment Month</FormLabel>
                                                <Select onValueChange={(value) => { field.onChange(value); setSelectedMonth(value); }} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a month" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {monthOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
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
                                            <FormControl><Input type="number" {...field} readOnly className="bg-muted"/></FormControl>
                                            <FormDescription>Auto-calculated from selected month.</FormDescription>
                                            <FormMessage/>
                                        </FormItem>
                                    )} />
                                </div>
                                {loadingSchedules ? (
                                    <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                                ) : monthlySchedules.length > 0 ? (
                                     <div className="space-y-2">
                                        <h4 className="font-semibold">Schedules for {format(parse(selectedMonth!, 'yyyy-MM', new Date()), 'MMMM yyyy')}</h4>
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Title</TableHead><TableHead>Hours</TableHead><TableHead>Attendees</TableHead></TableRow></TableHeader>
                                                <TableBody>
                                                    {monthlySchedules.map(item => {
                                                        const duration = item.type === 'class' ? getDurationInMinutes(item.startTime, item.endTime) : (item.duration || 0);
                                                        return (
                                                            <TableRow key={item.id}>
                                                                <TableCell className="whitespace-nowrap">{format(item.date.toDate(), 'MMM dd')}</TableCell>
                                                                <TableCell className="whitespace-nowrap">{format(parse(item.startTime, 'HH:mm', new Date()), 'p')}</TableCell>
                                                                <TableCell>{item.title}</TableCell>
                                                                <TableCell>{(duration / 60).toFixed(2)}</TableCell>
                                                                <TableCell className="flex items-center gap-1 whitespace-nowrap"><UsersIconComponent className="h-4 w-4"/>{item.attendance}</TableCell>
                                                            </TableRow>
                                                        )
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                     </div>
                                ) : selectedMonth && <p className="text-sm text-center text-muted-foreground p-4 border rounded-md">No schedules found for this month.</p>}

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
                    const permissionError = new FirestorePermissionError({ path: 'users or users/{userId}/teacher_details/payment', operation: 'list' }, { cause: serverError });
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
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
