'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, IndianRupee, Save, X, Banknote, Calendar as CalendarIcon } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Reward, PromoterPrivateDetails } from '@/lib/definitions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, isSameDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { uploadImage } from '@/lib/actions';

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

function PaymentDetailsForm() {
    const { user } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
    const [qrCodePreview, setQrCodePreview] = useState<string | null>(null);
    const [existingQrUrl, setExistingQrUrl] = useState<string | null>(null);


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
            const detailsRef = doc(firestore, 'users', user.id, 'promoter_details', 'payment');
            try {
                const docSnap = await getDoc(detailsRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as PromoterPrivateDetails;
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
                }
            } catch (serverError: any) {
                 if (serverError.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({ path: detailsRef.path, operation: 'get' }, { cause: serverError });
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

        setLoading(true);
        setError(null);

        const detailsDocRef = doc(firestore, 'users', user.id, 'promoter_details', 'payment');
        let dataToUpdate: PromoterPrivateDetails = { paymentMethod: data.paymentMethod };
        
        try {
            if (data.paymentMethod === 'upi') {
                dataToUpdate.upiId = data.upiId;
                dataToUpdate.accountHolderName = undefined;
                dataToUpdate.bankName = undefined;
                dataToUpdate.accountNumber = undefined;
                dataToUpdate.ifscCode = undefined;

                if (qrCodeFile) {
                    const uploadFormData = new FormData();
                    uploadFormData.append('image', qrCodeFile);
                    dataToUpdate.upiQrCodeUrl = await uploadImage(uploadFormData);
                } else if (existingQrUrl) {
                    dataToUpdate.upiQrCodeUrl = existingQrUrl;
                }
            } else { // 'bank'
                dataToUpdate.accountHolderName = data.accountHolderName;
                dataToUpdate.bankName = data.bankName;
                dataToUpdate.accountNumber = data.accountNumber;
                dataToUpdate.ifscCode = data.ifscCode;
                dataToUpdate.upiId = undefined;
                dataToUpdate.upiQrCodeUrl = undefined;
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

    return (
        <Card>
            <CardHeader>
                <CardTitle>Payment Details</CardTitle>
                <CardDescription>This information is used to process your reward payments. It is kept private and secure.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="paymentMethod"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Payment Method</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl><RadioGroupItem value="bank" /></FormControl>
                                                <FormLabel className="font-normal">Bank Account</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl><RadioGroupItem value="upi" /></FormControl>
                                                <FormLabel className="font-normal">UPI</FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {paymentMethod === 'bank' && (
                            <div className="space-y-4 p-4 border rounded-md">
                                <FormField control={form.control} name="accountHolderName" render={({ field }) => (
                                    <FormItem><FormLabel>Account Holder Name</FormLabel><FormControl><Input placeholder="e.g., John Doe" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="bankName" render={({ field }) => (
                                    <FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input placeholder="e.g., State Bank of India" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="accountNumber" render={({ field }) => (
                                    <FormItem><FormLabel>Account Number</FormLabel><FormControl><Input placeholder="e.g., 12345678901" {...field} value={field.value || ''}/></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="ifscCode" render={({ field }) => (
                                    <FormItem><FormLabel>IFSC Code</FormLabel><FormControl><Input placeholder="e.g., SBIN0001234" {...field} value={field.value || ''}/></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                        )}

                        {paymentMethod === 'upi' && (
                            <div className="space-y-4 p-4 border rounded-md">
                                 <FormField control={form.control} name="upiId" render={({ field }) => (
                                    <FormItem><FormLabel>UPI ID</FormLabel><FormControl><Input placeholder="e.g., username@okhdfcbank" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <div className="space-y-2">
                                    <Label htmlFor="qrCode">UPI QR Code (Optional)</Label>
                                    <Input id="qrCode" type="file" accept="image/*" onChange={handleImageChange} className="file:text-foreground" />
                                    <FormDescription>Upload an image of your UPI QR code.</FormDescription>
                                    {qrCodePreview && (
                                        <div className="mt-4 relative w-40 h-40">
                                            <Image src={qrCodePreview} alt="QR Code preview" fill className="rounded-md object-cover border p-1" />
                                            <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                                onClick={() => { setQrCodeFile(null); setQrCodePreview(null); setExistingQrUrl(null); }}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {loading ? 'Saving...' : 'Save Details'}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}


export default function RewardHistoryPage() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    useEffect(() => {
        if (!firestore || !user) return;
        setLoading(true);

        const rewardsQuery = query(
            collection(firestore, 'users', user.id, 'rewards'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(rewardsQuery, (snapshot) => {
            const rewardsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reward));
            setRewards(rewardsList);
            setLoading(false);
        }, (serverError: any) => {
            if (serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({ path: `users/${user.id}/rewards`, operation: 'list' }, { cause: serverError });
                errorEmitter.emit('permission-error', permissionError);
                toast({ title: 'Error', description: "You don't have permission to view rewards.", variant: 'destructive' });
            } else {
                console.warn("Error fetching rewards: ", serverError);
                toast({ title: 'Error', description: "Could not fetch reward history.", variant: 'destructive' });
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, user, toast]);

    const filteredRewards = useMemo(() => {
        if (!selectedDate) {
            return rewards;
        }
        return rewards.filter(reward => 
            reward.createdAt && isSameDay(reward.createdAt.toDate(), selectedDate)
        );
    }, [rewards, selectedDate]);

    const totalEarned = filteredRewards.reduce((acc, reward) => acc + reward.rewardAmount, 0);
    const totalPaid = filteredRewards.filter(r => r.paidOut).reduce((acc, reward) => acc + reward.rewardAmount, 0);
    const totalUnpaid = totalEarned - totalPaid;

    const handleRedeem = () => {
        toast({
            title: "Coming Soon!",
            description: "The reward redemption feature is currently under development. Please ensure your payment details are up to date."
        })
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">My Reward History</h1>
                <p className="text-muted-foreground">Track the rewards you've earned from your referrals.</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Total Rewards Earned</CardTitle>
                        <CardDescription>Total rewards for the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold flex items-center gap-2">
                            <IndianRupee className="h-8 w-8"/>
                            {totalEarned.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Redeem Your Rewards</CardTitle>
                        <CardDescription>Redeem your unpaid earnings to your linked bank account.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                             <p className="text-muted-foreground">Available to redeem</p>
                             <p className="text-4xl font-bold flex items-center">
                                <IndianRupee />
                                {totalUnpaid.toLocaleString('en-IN')}
                            </p>
                        </div>
                        <Button onClick={handleRedeem} disabled={totalUnpaid <= 0}>
                            <Banknote className="mr-2 h-4 w-4" />
                            Redeem Rewards
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <PaymentDetailsForm />

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle>Reward Details</CardTitle>
                            <CardDescription>A record of all rewards you have received.</CardDescription>
                        </div>
                         <div className="flex items-center gap-2">
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
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                         <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : filteredRewards.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Referred Student</TableHead>
                                    <TableHead>Fee Paid</TableHead>
                                    <TableHead>Reward (10%)</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRewards.map(reward => (
                                    <TableRow key={reward.id}>
                                        <TableCell>{reward.createdAt ? format(reward.createdAt.toDate(), 'PPP') : 'Processing...'}</TableCell>
                                        <TableCell>{reward.studentName}</TableCell>
                                        <TableCell className="flex items-center gap-1">
                                            <IndianRupee className="h-4 w-4" />
                                            {reward.feeAmount.toLocaleString('en-IN')}
                                        </TableCell>
                                        <TableCell className="font-medium flex items-center gap-1">
                                            <IndianRupee className="h-4 w-4" />
                                            {reward.rewardAmount.toLocaleString('en-IN')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={reward.paidOut ? 'default' : 'secondary'}>
                                                {reward.paidOut ? 'Paid' : 'Unpaid'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                            <p>{selectedDate ? 'No rewards found for the selected date.' : 'No rewards earned yet. Share your referral link to get started!'}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}