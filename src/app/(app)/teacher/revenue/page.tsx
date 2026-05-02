'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirebase } from '@/firebase';
import { doc, getDoc, setDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Save, X, IndianRupee, FileText, Lock, Info, Headset, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import type { TeacherPrivateDetails, SalaryPayment } from '@/lib/definitions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { uploadImage } from '@/lib/actions';
import { Reveal } from '@/components/shared/reveal';

const paymentDetailsSchema = z.object({
  paymentMethod: z.enum(['bank', 'upi'], { required_error: 'Please select a payment method.' }),
  accountHolderName: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  upiId: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.paymentMethod === 'bank') {
    if (!data.accountHolderName) ctx.addIssue({ code: 'custom', message: 'Account holder name is required.', path: ['accountHolderName'] });
    if (!data.bankName) ctx.addIssue({ code: 'custom', message: 'Bank name is required.', path: ['bankName'] });
    if (!data.accountNumber) ctx.addIssue({ code: 'custom', message: 'Account number is required.', path: ['accountNumber'] });
    else if (!/^\d+$/.test(data.accountNumber)) ctx.addIssue({ code: 'custom', message: 'Account number must contain only digits.', path: ['accountNumber'] });
    if (!data.ifscCode) ctx.addIssue({ code: 'custom', message: 'IFSC code is required.', path: ['ifscCode'] });
    else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.ifscCode)) ctx.addIssue({ code: 'custom', message: 'Invalid IFSC code format.', path: ['ifscCode'] });
  } else if (data.paymentMethod === 'upi') {
    if (!data.upiId) ctx.addIssue({ code: 'custom', message: 'UPI ID is required.', path: ['upiId'] });
  }
});


type PaymentDetailsFormValues = z.infer<typeof paymentDetailsSchema>;


function SalaryHistory() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const [payments, setPayments] = useState<SalaryPayment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore || !user) return;
        setLoading(true);

        const paymentsQuery = query(
            collection(firestore, 'users', user.id, 'salaryPayments')
        );

        const unsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
            const paymentsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalaryPayment));
            
            paymentsList.sort((a, b) => {
                const aIsPending = !a.paymentDate;
                const bIsPending = !b.paymentDate;

                if (aIsPending && !bIsPending) return -1; // a comes first
                if (!aIsPending && bIsPending) return 1;  // b comes first
                if (aIsPending && bIsPending) return 0;   // Order doesn't matter

                // Both have dates, sort descending
                return b.paymentDate!.toDate().getTime() - a.paymentDate!.toDate().getTime();
            });

            setPayments(paymentsList);
            setLoading(false);
        }, (serverError: any) => {
            if (serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({ path: `users/${user.id}/salaryPayments`, operation: 'list' }, { cause: serverError });
                errorEmitter.emit('permission-error', permissionError);
            } else {
                console.warn("Error fetching salary history: ", serverError);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, user]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Salary History</CardTitle>
                <CardDescription>A record of all salary payments you have received, from most recent to oldest.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                     <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : payments.length > 0 ? (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Payment Date</TableHead>
                                    <TableHead>Group Rate</TableHead>
                                    <TableHead>1-1 Rate</TableHead>
                                    <TableHead>Total Hours</TableHead>
                                    <TableHead className="text-right">Amount Paid</TableHead>
                                    <TableHead className="text-right">Invoice</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments.map(payment => (
                                    <TableRow key={payment.id}>
                                        <TableCell className="whitespace-nowrap">{payment.paymentDate ? format(payment.paymentDate.toDate(), 'PPP') : 'Processing...'}</TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            <div className="flex items-center gap-1">
                                                <IndianRupee className="h-3 w-3" />
                                                {(payment.hourlyRateGroup || payment.hourlyRate || 0).toLocaleString('en-IN')}
                                            </div>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            <div className="flex items-center gap-1">
                                                <IndianRupee className="h-3 w-3" />
                                                {(payment.hourlyRateOneToOne || payment.hourlyRate || 0).toLocaleString('en-IN')}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {payment.totalHours}
                                        </TableCell>
                                        <TableCell className="text-right font-medium whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1">
                                                <IndianRupee className="h-4 w-4" />
                                                {payment.amount.toLocaleString('en-IN')}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {payment.invoiceId && (
                                                <Button asChild variant="ghost" size="icon">
                                                    <Link href={`/salary-invoice/${payment.invoiceId}`} target="_blank"><FileText className="h-4 w-4"/></Link>
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                        <p>No salary payment records found.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}


export default function TeacherRevenuePage() {
    const { user, loading: userLoading } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
    const [qrCodePreview, setQrCodePreview] = useState<string | null>(null);
    const [existingQrUrl, setExistingQrUrl] = useState<string | null>(null);

    const [isLocked, setIsLocked] = useState(false);


    const form = useForm<PaymentDetailsFormValues>({
        resolver: zodResolver(paymentDetailsSchema),
        defaultValues: {
            paymentMethod: 'bank',
            accountHolderName: '',
            bankName: '',
            accountNumber: '',
            ifscCode: '',
            upiId: '',
        },
    });

    const paymentMethod = form.watch('paymentMethod');

    useEffect(() => {
        if (!user || !firestore) return;
        
        const fetchDetails = async () => {
            const detailsRef = doc(firestore, 'users', user.id, 'teacher_details', 'payment');
            try {
                const docSnap = await getDoc(detailsRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as TeacherPrivateDetails;
                    form.reset({
                        paymentMethod: data.paymentMethod || 'bank',
                        accountHolderName: data.accountHolderName || '',
                        bankName: data.bankName || '',
                        accountNumber: data.accountNumber || '',
                        ifscCode: data.ifscCode || '',
                        upiId: data.upiId || '',
                    });
                    if (data.upiQrCodeUrl) {
                        setQrCodePreview(data.upiQrCodeUrl);
                        setExistingQrUrl(data.upiQrCodeUrl);
                    }
                    // Only lock if payment method exists AND admin hasn't unlocked it
                    setIsLocked(!!data.paymentMethod && data.isLocked !== false);
                }
            } catch (serverError: any) {
                 if (serverError.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({
                        path: detailsRef.path,
                        operation: 'get'
                    }, { cause: serverError });
                    errorEmitter.emit('permission-error', permissionError);
                } else {
                    console.warn("Error fetching payment details: ", serverError);
                    toast({
                        variant: 'destructive',
                        title: 'Error',
                        description: 'Could not load your saved payment details.'
                    });
                }
            }
        };
        fetchDetails();
    }, [user, firestore, form, toast]);
    
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setQrCodeFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setQrCodePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };


    const onSubmit = async (data: PaymentDetailsFormValues) => {
        if (!user || !firestore) {
            setError('You must be logged in to update your details.');
            return;
        }

        if (isLocked) return;

        setLoading(true);
        setError(null);

        const detailsDocRef = doc(firestore, 'users', user.id, 'teacher_details', 'payment');
        let dataToUpdate: TeacherPrivateDetails = { paymentMethod: data.paymentMethod };
        
        try {
            if (data.paymentMethod === 'upi') {
                dataToUpdate.upiId = data.upiId;
                (dataToUpdate as any).accountHolderName = null;
                (dataToUpdate as any).bankName = null;
                (dataToUpdate as any).accountNumber = null;
                (dataToUpdate as any).ifscCode = null;

                if (qrCodeFile) {
                    const uploadFormData = new FormData();
                    uploadFormData.append('image', qrCodeFile);
                    dataToUpdate.upiQrCodeUrl = await uploadImage(uploadFormData);
                } else if (!existingQrUrl) {
                     setError('Please upload a QR code image for UPI payments.');
                     setLoading(false);
                     return;
                } else {
                    dataToUpdate.upiQrCodeUrl = existingQrUrl;
                }
            } else { // 'bank'
                dataToUpdate.accountHolderName = data.accountHolderName;
                dataToUpdate.bankName = data.bankName;
                dataToUpdate.accountNumber = data.accountNumber;
                dataToUpdate.ifscCode = data.ifscCode;
                (dataToUpdate as any).upiId = null;
                (dataToUpdate as any).upiQrCodeUrl = null;
            }

            await setDoc(detailsDocRef, dataToUpdate, { merge: true });
            toast({
                title: 'Success!',
                description: 'Your payment details have been saved.',
            });
             setQrCodeFile(null); // Clear file input after successful submission
             if (dataToUpdate.upiQrCodeUrl) {
                setExistingQrUrl(dataToUpdate.upiQrCodeUrl);
             }
             setIsLocked(true); // Lock the form after successful submission

        } catch (serverError: any) {
            if (serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({ path: detailsDocRef.path, operation: 'update', requestResourceData: dataToUpdate }, { cause: serverError });
                errorEmitter.emit('permission-error', permissionError);
                setError("You don't have permission to perform this action.");
            } else {
                console.warn("An unexpected error occurred:", serverError);
                setError(serverError.message || 'An unexpected error occurred. Please try again.');
            }
        } finally {
             setLoading(false);
        }
    };

    if (userLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <Reveal>
                <div>
                   <h1 className="text-3xl font-bold font-headline">My Revenue</h1>
                   <p className="text-muted-foreground">Manage your earnings and payment details.</p>
                </div>
            </Reveal>
            
            <Reveal delay={0.1}>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 via-background to-emerald-50/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <TrendingUp className="h-4 w-4 text-primary" />
                            </div>
                            Your Hourly Rate
                        </CardTitle>
                        <CardDescription>Rates set by the admin based on your experience and course type.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Group Rate */}
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border shadow-sm">
                                <div className="p-3 rounded-xl bg-blue-50 shrink-0">
                                    <IndianRupee className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Group Classes</p>
                                    {(user?.hourlyRateGroup || user?.hourlyRate) ? (
                                        <p className="text-2xl font-black text-foreground flex items-baseline gap-1">
                                            <IndianRupee className="h-4 w-4 text-muted-foreground" />
                                            {(user?.hourlyRateGroup || user?.hourlyRate)?.toLocaleString('en-IN')}
                                            <span className="text-xs font-medium text-muted-foreground">/hr</span>
                                        </p>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">Not set yet</p>
                                    )}
                                </div>
                            </div>
                            {/* One-to-One Rate */}
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border shadow-sm">
                                <div className="p-3 rounded-xl bg-emerald-50 shrink-0">
                                    <IndianRupee className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">One-to-One Classes</p>
                                    {(user?.hourlyRateOneToOne || user?.hourlyRate) ? (
                                        <p className="text-2xl font-black text-foreground flex items-baseline gap-1">
                                            <IndianRupee className="h-4 w-4 text-muted-foreground" />
                                            {(user?.hourlyRateOneToOne || user?.hourlyRate)?.toLocaleString('en-IN')}
                                            <span className="text-xs font-medium text-muted-foreground">/hr</span>
                                        </p>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">Not set yet</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        {!(user?.hourlyRateGroup || user?.hourlyRateOneToOne || user?.hourlyRate) && (
                            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                                <Info className="h-3.5 w-3.5" />
                                Your hourly rate will appear here once the admin has configured it in User Management.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </Reveal>

            <Card className={isLocked ? "bg-muted/30" : ""}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div className="space-y-1.5">
                        <CardTitle className="flex items-center gap-2">
                            Payment Details
                            {isLocked && <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none flex gap-1 items-center px-3 py-1"><Lock size={12} /> L0CKED</Badge>}
                        </CardTitle>
                        <CardDescription>This information is used to process your salary payments. It is kept private and secure.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLocked && (
                        <Alert className="mb-6 bg-amber-50/50 border-amber-200 text-amber-900 rounded-[1.5rem] p-4 flex flex-col md:flex-row items-center justify-between gap-4 overflow-hidden">
                            <div className="flex items-center gap-3">
                                <div className="bg-amber-100 p-2 rounded-xl h-fit shrink-0 border border-amber-200">
                                    <Lock className="h-4 w-4 text-amber-600" />
                                </div>
                                <div className="space-y-0.5">
                                    <AlertTitle className="font-black text-sm font-headline tracking-tight leading-none">Information Locked</AlertTitle>
                                    <AlertDescription className="font-medium text-[11px] text-amber-800/70 leading-normal max-w-md">
                                        Details finalized for security. Contact support to update.
                                    </AlertDescription>
                                </div>
                            </div>
                            <Button 
                                onClick={() => window.open('https://wa.me/917994875893', '_blank')}
                                className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl h-9 px-4 font-bold text-[11px] shadow-lg shadow-orange-600/20 flex gap-2 shrink-0 group transition-all active:scale-95"
                            >
                                <Headset className="h-3.5 w-3.5 group-hover:rotate-12 transition-transform" />
                                Contact Support
                            </Button>
                        </Alert>
                    )}

                    {isLocked ? (
                        /* ── Secure masked view — no sensitive data shown ── */
                        <div className="space-y-4">
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Payment Method</p>
                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/40 border">
                                <div className="p-2 rounded-lg bg-amber-100 shrink-0">
                                    <Lock className="h-4 w-4 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold">
                                        {form.getValues('paymentMethod') === 'upi' ? 'UPI' : 'Bank Account'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5 font-mono tracking-widest">
                                        {form.getValues('paymentMethod') === 'upi'
                                            ? (() => {
                                                const upi = form.getValues('upiId') || '';
                                                const atIdx = upi.lastIndexOf('@');
                                                if (atIdx > 2) return `${'•'.repeat(Math.min(atIdx - 2, 8))}${upi.slice(atIdx - 2)}`;
                                                return '••••••@••••';
                                              })()
                                            : (() => {
                                                const acc = form.getValues('accountNumber') || '';
                                                return acc.length > 4
                                                    ? `${'•'.repeat(Math.min(acc.length - 4, 10))} ${acc.slice(-4)}`
                                                    : '•••• ••••';
                                              })()
                                        }
                                    </p>
                                </div>
                                <Badge variant="outline" className="shrink-0 text-[10px] text-amber-700 border-amber-300 bg-amber-50">
                                    Secured
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground text-center pt-1">
                                🔒 Full account details are hidden for your security. Only admins can view the complete information.
                            </p>
                        </div>
                    ) : (
                        /* ── Editable form (unlocked by admin) ── */
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="paymentMethod"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">Payment Method</FormLabel>
                                            <FormControl>
                                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="bank" /></FormControl>
                                                        <FormLabel className="font-bold">Bank Account</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="upi" /></FormControl>
                                                        <FormLabel className="font-bold">UPI</FormLabel>
                                                    </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {paymentMethod === 'bank' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 sm:p-6 bg-white border rounded-[2rem] shadow-sm">
                                        <FormField control={form.control} name="accountHolderName" render={({ field }) => (
                                            <FormItem><FormLabel className="font-bold">Account Holder Name</FormLabel><FormControl><Input placeholder="Full Name" {...field} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="bankName" render={({ field }) => (
                                            <FormItem><FormLabel className="font-bold">Bank Name</FormLabel><FormControl><Input placeholder="Name of your bank" {...field} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="accountNumber" render={({ field }) => (
                                            <FormItem><FormLabel className="font-bold">Account Number</FormLabel><FormControl><Input placeholder="Your account number" {...field} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="ifscCode" render={({ field }) => (
                                            <FormItem><FormLabel className="font-bold">IFSC Code</FormLabel><FormControl><Input placeholder="Bank IFSC" {...field} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                    </div>
                                )}

                                {paymentMethod === 'upi' && (
                                    <div className="space-y-6 p-4 sm:p-6 bg-white border rounded-[2rem] shadow-sm">
                                        <FormField control={form.control} name="upiId" render={({ field }) => (
                                            <FormItem><FormLabel className="font-bold">UPI ID</FormLabel><FormControl><Input placeholder="e.g., username@bank" {...field} className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <div className="space-y-4">
                                            <Label htmlFor="qrCode" className="font-bold">UPI QR Code</Label>
                                            <Input id="qrCode" type="file" accept="image/*" onChange={handleImageChange} className="file:text-foreground h-12 flex items-center bg-muted/20" />
                                            <FormDescription>Upload an image of your UPI QR code.</FormDescription>
                                            {qrCodePreview && (
                                                <div className="mt-4 relative w-56 h-56 group">
                                                    <Image src={qrCodePreview} alt="QR Code preview" fill className="rounded-3xl object-cover border-4 border-white shadow-xl" />
                                                    <Button type="button" variant="destructive" size="icon" className="absolute -top-3 -right-3 h-10 w-10 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => { setQrCodeFile(null); setQrCodePreview(null); setExistingQrUrl(null); }}>
                                                        <X size={20} />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {error && (
                                    <Alert variant="destructive" className="rounded-2xl">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Error</AlertTitle>
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}

                                <Button type="submit" disabled={loading} size="lg" className="rounded-2xl px-10 h-14 font-black shadow-lg hover:shadow-primary/25 transition-all">
                                    {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                                    {loading ? 'Finalizing Details...' : 'Save Payment Details'}
                                </Button>
                            </form>
                        </Form>
                    )}
                </CardContent>
            </Card>

            <SalaryHistory />
        </div>
    );
}