
'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, getDocs, onSnapshot, addDoc, serverTimestamp, doc, getDoc, writeBatch, setDoc } from 'firebase/firestore';
import type { User, SalaryPayment, Schedule, TeacherPrivateDetails } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, University, Hash, Landmark, User as UserIcon, IndianRupee, PlusCircle, QrCode, Calendar as CalendarIcon, Clock, Users as UsersIconComponent, FileText, Info, Lock, Unlock, ShieldCheck } from 'lucide-react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type ScheduleWithAttendance = Schedule & { attendance: number };

const addPaymentSchema = z.object({
    paymentMonth: z.string().min(1, 'Please select a month.'),
    hourlyRateGroup: z.coerce.number().min(0, "Rate cannot be negative."),
    hourlyRateOneToOne: z.coerce.number().min(0, "Rate cannot be negative."),
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
    const [paymentLockLoading, setPaymentLockLoading] = useState(false);
    const [isLocked, setIsLocked] = useState(true);

    const form = useForm<AddPaymentValues>({
        resolver: zodResolver(addPaymentSchema),
        defaultValues: {
            hourlyRateGroup: 0,
            hourlyRateOneToOne: 0,
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

    const rateGroup = form.watch('hourlyRateGroup');
    const rateOneToOne = form.watch('hourlyRateOneToOne');

    const monthlyStats = useMemo(() => {
        let groupMinutes = 0;
        let oneToOneMinutes = 0;

        monthlySchedules.forEach(item => {
            const duration = item.type === 'class' ? getDurationInMinutes(item.startTime, item.endTime) : (item.duration || 0);
            if (item.learningMode === 'one to one' || item.studentId) {
                oneToOneMinutes += duration;
            } else {
                groupMinutes += duration;
            }
        });

        const groupHours = Math.round((groupMinutes / 60) * 100) / 100;
        const oneToOneHours = Math.round((oneToOneMinutes / 60) * 100) / 100;
        const totalAmount = (groupHours * rateGroup) + (oneToOneHours * rateOneToOne);

        return { groupHours, oneToOneHours, totalAmount };
    }, [monthlySchedules, rateGroup, rateOneToOne]);

    function getDurationInMinutes(startTime: string, endTime: string): number {
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
    }


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
                hourlyRateGroup: teacher.hourlyRateGroup || teacher.hourlyRate || 0,
                hourlyRateOneToOne: teacher.hourlyRateOneToOne || teacher.hourlyRate || 0,
                paymentMonth: undefined,
            });
            setSelectedMonth(undefined);
            setMonthlySchedules([]);
            setFormError(null);
            setIsLocked((teacher as any).isLocked !== false);
        }
    }, [isOpen, teacher, form]);

    const handleTogglePaymentLock = async () => {
        if (!firestore || !teacher) return;
        setPaymentLockLoading(true);
        const detailsRef = doc(firestore, 'users', teacher.id, 'teacher_details', 'payment');
        const newLockedStatus = !isLocked;

        try {
            await setDoc(detailsRef, { isLocked: newLockedStatus }, { merge: true });
            setIsLocked(newLockedStatus);
            toast({
                title: newLockedStatus ? "Payment Details Locked" : "Payment Details Unlocked",
                description: `Teacher can ${newLockedStatus ? 'no longer' : 'now'} edit their payment information.`
            });
        } catch (e: any) {
            console.error("Error toggling payment lock:", e);
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: "Could not update payment lock status."
            });
        } finally {
            setPaymentLockLoading(false);
        }
    };

    useEffect(() => {
        if (!selectedMonth || !firestore) {
            setMonthlySchedules([]);
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
            setLoadingSchedules(false);
        };
        
        fetchMonthDetails();

    }, [selectedMonth, allSchedules, firestore]);


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
            hourlyRateGroup: data.hourlyRateGroup,
            hourlyRateOneToOne: data.hourlyRateOneToOne,
            totalHoursGroup: monthlyStats.groupHours,
            totalHoursOneToOne: monthlyStats.oneToOneHours,
            totalHours: monthlyStats.groupHours + monthlyStats.oneToOneHours,
            amount: monthlyStats.totalAmount,
        };
        batch.set(newInvoiceRef, invoiceData);

        const salaryPaymentRef = doc(collection(firestore, 'users', teacher.id, 'salaryPayments'));
        const paymentData = {
            teacherId: teacher.id,
            hourlyRateGroup: data.hourlyRateGroup,
            hourlyRateOneToOne: data.hourlyRateOneToOne,
            totalHoursGroup: monthlyStats.groupHours,
            totalHoursOneToOne: monthlyStats.oneToOneHours,
            totalHours: monthlyStats.groupHours + monthlyStats.oneToOneHours,
            amount: monthlyStats.totalAmount,
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
            <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <DialogTitle className="text-2xl font-bold font-headline">Salary Details for {teacher.name}</DialogTitle>
                            <DialogDescription>View payment history and record new salary payments based on Group and One-to-One hours.</DialogDescription>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                             <Badge variant={isLocked ? "secondary" : "destructive"} className="px-3 py-1 flex gap-1.5 items-center">
                                {isLocked ? <Lock size={12}/> : <Unlock size={12}/>}
                                {isLocked ? "LOCKED" : "UNLOCKED"}
                             </Badge>
                             <Button 
                                size="sm"
                                variant={isLocked ? "outline" : "destructive"}
                                onClick={handleTogglePaymentLock}
                                disabled={paymentLockLoading}
                                className="h-8 rounded-lg text-[11px] font-bold"
                             >
                                {paymentLockLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : (isLocked ? <ShieldCheck className="mr-2 h-3 w-3" /> : <Lock className="mr-2 h-3 w-3" />)}
                                {isLocked ? "Allow Teacher Update" : "Disable Teacher Update"}
                             </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="grid gap-6">
                    <Card>
                        <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
                        <CardContent>
                             {loadingHistory ? <div className="flex justify-center my-8"><Loader2 className="animate-spin" /></div> :
                             payments.length > 0 ? (
                                <div className="overflow-x-auto border rounded-lg">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Payment Month</TableHead><TableHead>Payment Date</TableHead><TableHead>Group Rate</TableHead><TableHead>1-1 Rate</TableHead><TableHead>Total Hours</TableHead><TableHead className="text-right">Amount Paid</TableHead><TableHead className="text-right">Invoice</TableHead></TableRow></TableHeader>
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
                                                    <TableCell className="whitespace-nowrap flex items-center gap-1"><IndianRupee className="h-3 w-3" />{(p.hourlyRateGroup || p.hourlyRate || 0).toLocaleString('en-IN')}</TableCell>
                                                    <TableCell className="whitespace-nowrap">
                                                        <div className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />{(p.hourlyRateOneToOne || p.hourlyRate || 0).toLocaleString('en-IN')}</div>
                                                    </TableCell>
                                                    <TableCell>{p.totalHours}</TableCell>
                                                    <TableCell className="text-right font-medium whitespace-nowrap"><div className="flex items-center justify-end gap-1"><IndianRupee className="h-4 w-4" />{p.amount.toLocaleString('en-IN')}</div></TableCell>
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
                                    <FormField name="hourlyRateGroup" control={form.control} render={({field}) => (
                                        <FormItem>
                                            <FormLabel>Group Hourly Rate (INR)</FormLabel>
                                            <FormControl><Input type="number" {...field}/></FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )} />
                                    <FormField name="hourlyRateOneToOne" control={form.control} render={({field}) => (
                                        <FormItem>
                                            <FormLabel>One-to-One Hourly Rate (INR)</FormLabel>
                                            <FormControl><Input type="number" {...field}/></FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )} />
                                </div>
                                {loadingSchedules ? (
                                    <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                                ) : monthlySchedules.length > 0 ? (
                                     <div className="space-y-4">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            <div className="p-3 border rounded-md bg-muted/30">
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Group Hours</p>
                                                <p className="text-lg font-bold">{monthlyStats.groupHours}</p>
                                            </div>
                                            <div className="p-3 border rounded-md bg-muted/30">
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold">1-1 Hours</p>
                                                <p className="text-lg font-bold">{monthlyStats.oneToOneHours}</p>
                                            </div>
                                            <div className="p-3 border rounded-md bg-primary/10 col-span-2 sm:col-span-1">
                                                <p className="text-[10px] text-primary uppercase font-bold">Total Amount</p>
                                                <p className="text-lg font-bold flex items-center"><IndianRupee className="h-4 w-4 mr-1" />{monthlyStats.totalAmount.toLocaleString('en-IN')}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <h4 className="font-semibold flex items-center gap-2"><CalendarIcon className="h-4 w-4"/> Session Breakdown</h4>
                                            <div className="overflow-x-auto border rounded-md">
                                                <Table>
                                                    <TableHeader className="bg-muted/50"><TableRow><TableHead>Date</TableHead><TableHead>Mode</TableHead><TableHead>Title</TableHead><TableHead>Hours</TableHead><TableHead>Attd</TableHead></TableRow></TableHeader>
                                                    <TableBody>
                                                        {monthlySchedules.map(item => {
                                                            const duration = item.type === 'class' ? getDurationInMinutes(item.startTime, item.endTime) : (item.duration || 0);
                                                            const isOneToOne = item.learningMode === 'one to one' || item.studentId;
                                                            return (
                                                                <TableRow key={item.id}>
                                                                    <TableCell className="whitespace-nowrap text-xs">{format(item.date.toDate(), 'MMM dd')}</TableCell>
                                                                    <TableCell>
                                                                        <Badge variant={isOneToOne ? "secondary" : "outline"} className="capitalize text-[10px] px-1.5 py-0">
                                                                            {isOneToOne ? '1-1' : 'Grp'}
                                                                        </Badge>
                                                                    </TableCell>
                                                                    <TableCell className="font-medium text-xs max-w-[120px] truncate">{item.title}</TableCell>
                                                                    <TableCell className="text-xs">{(duration / 60).toFixed(2)}</TableCell>
                                                                    <TableCell className="text-xs whitespace-nowrap">{item.attendance}</TableCell>
                                                                </TableRow>
                                                            )
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                     </div>
                                ) : selectedMonth && <p className="text-sm text-center text-muted-foreground p-4 border rounded-md">No schedules found for this month.</p>}

                                {formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>Error</AlertTitle><AlertDescription>{formError}</AlertDescription></Alert>}
                                <Button type="submit" disabled={isSubmitting || monthlyStats.totalAmount <= 0} className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4"/> {isSubmitting ? 'Recording...' : 'Record Payment'}</Button>
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
    const { user: currentUser } = useUser();
    const [teachers, setTeachers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTeacher, setSelectedTeacher] = useState<User | null>(null);

    useEffect(() => {
        if (!firestore || !currentUser) return;

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
    }, [firestore, currentUser]);

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
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                    {teachers.map(teacher => (
                        <Card key={teacher.id} className="cursor-pointer hover:shadow-lg transition-shadow flex flex-col h-full" onClick={() => setSelectedTeacher(teacher)}>
                            <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
                                <Avatar className="h-12 w-12 shrink-0">
                                    <AvatarImage src={teacher.avatarUrl} alt={teacher.name} />
                                    <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="grid gap-1 overflow-hidden">
                                    <CardTitle className="truncate text-lg">{teacher.name}</CardTitle>
                                    <CardDescription className="truncate text-xs">{teacher.email}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 flex-grow flex flex-col justify-between">
                                <div className="flex justify-between items-center px-4 py-2 bg-muted rounded-md mb-2">
                                    <div className="text-center">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Group Rate</p>
                                        <p className="font-bold text-sm flex items-center justify-center gap-0.5"><IndianRupee className="h-3 w-3" />{(teacher.hourlyRateGroup || teacher.hourlyRate || 0).toLocaleString('en-IN')}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">1-1 Rate</p>
                                        <p className="font-bold text-sm flex items-center justify-center gap-0.5"><IndianRupee className="h-3 w-3" />{(teacher.hourlyRateOneToOne || teacher.hourlyRate || 0).toLocaleString('en-IN')}</p>
                                    </div>
                                </div>

                                {teacher.paymentMethod === 'upi' ? (
                                    <div className="space-y-3 rounded-md border p-4 text-sm bg-muted/30">
                                        <div className="font-semibold text-center mb-2 text-xs uppercase tracking-wider text-muted-foreground">UPI Details</div>
                                        <div className="flex items-center gap-3">
                                            <QrCode className="h-4 w-4 text-primary" />
                                            <span className="truncate">{teacher.upiId}</span>
                                        </div>
                                        {teacher.upiQrCodeUrl && (
                                            <div className="pt-2 flex justify-center">
                                                <div className="relative w-24 h-24 border bg-white p-1 rounded-md">
                                                    <Image src={teacher.upiQrCodeUrl} alt="UPI QR Code" fill className="object-contain" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : teacher.paymentMethod === 'bank' || teacher.accountHolderName ? (
                                    <div className="space-y-2 rounded-md border p-4 text-sm bg-muted/30">
                                        <div className="font-semibold text-center mb-2 text-xs uppercase tracking-wider text-muted-foreground">Bank Details</div>
                                        <div className="flex items-center gap-3">
                                            <UserIcon className="h-4 w-4 text-primary shrink-0" />
                                            <span className="truncate">{teacher.accountHolderName}</span>
                                        </div>
                                         <div className="flex items-center gap-3">
                                            <Landmark className="h-4 w-4 text-primary shrink-0" />
                                            <span className="truncate">{teacher.bankName}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Hash className="h-4 w-4 text-primary shrink-0" />
                                            <span className="truncate">{teacher.accountNumber}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <University className="h-4 w-4 text-primary shrink-0" />
                                            <span className="truncate uppercase">{teacher.ifscCode}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-muted-foreground p-6 border-2 border-dashed rounded-lg flex-grow flex items-center justify-center">
                                        <p className="text-xs">Payment details not provided.</p>
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
