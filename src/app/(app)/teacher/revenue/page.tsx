
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirebase } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Save, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { TeacherPrivateDetails } from '@/lib/definitions';

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

export default function TeacherRevenuePage() {
    const { user, loading: userLoading } = useUser();
    const { firestore, storage } = useFirebase();
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
            const detailsRef = doc(firestore, 'users', user.id, 'teacher_details', 'payment');
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
            }
        }
        fetchDetails();
    }, [user, firestore, form]);
    
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
        if (!user || !firestore || !storage) {
            setError('You must be logged in to update your details.');
            return;
        }

        setLoading(true);
        setError(null);

        const detailsDocRef = doc(firestore, 'users', user.id, 'teacher_details', 'payment');
        let dataToUpdate: TeacherPrivateDetails = { paymentMethod: data.paymentMethod };
        
        try {
            if (data.paymentMethod === 'upi') {
                dataToUpdate.upiId = data.upiId;
                dataToUpdate.accountHolderName = undefined;
                dataToUpdate.bankName = undefined;
                dataToUpdate.accountNumber = undefined;
                dataToUpdate.ifscCode = undefined;

                if (qrCodeFile) {
                    const storageRef = ref(storage, `upi-qr-codes/${user.id}/${qrCodeFile.name}`);
                    const uploadResult = await uploadBytes(storageRef, qrCodeFile);
                    dataToUpdate.upiQrCodeUrl = await getDownloadURL(uploadResult.ref);
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
            if (serverError.code?.startsWith('storage/')) {
                setError('Image upload failed. You may not have permission or your network connection is unstable.');
                console.warn("Storage error:", serverError);
            } else if (serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({ path: detailsDocRef.path, operation: 'update', requestResourceData: dataToUpdate }, { cause: serverError });
                errorEmitter.emit('permission-error', permissionError);
                setError("You don't have permission to perform this action.");
            } else {
                console.warn("An unexpected error occurred:", serverError);
                setError('An unexpected error occurred. Please try again.');
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
            <div>
                <h1 className="text-3xl font-bold font-headline">My Revenue</h1>
                <p className="text-muted-foreground">Manage your earnings and payment details.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Payment Details</CardTitle>
                    <CardDescription>This information is used to process your salary payments. It is kept private and secure.</CardDescription>
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
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                value={field.value}
                                                className="flex flex-col space-y-1"
                                            >
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
                                        <FormItem><FormLabel>Account Holder Name</FormLabel><FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="bankName" render={({ field }) => (
                                        <FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input placeholder="e.g., State Bank of India" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="accountNumber" render={({ field }) => (
                                        <FormItem><FormLabel>Account Number</FormLabel><FormControl><Input placeholder="e.g., 12345678901" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="ifscCode" render={({ field }) => (
                                        <FormItem><FormLabel>IFSC Code</FormLabel><FormControl><Input placeholder="e.g., SBIN0001234" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                            )}

                            {paymentMethod === 'upi' && (
                                <div className="space-y-4 p-4 border rounded-md">
                                     <FormField control={form.control} name="upiId" render={({ field }) => (
                                        <FormItem><FormLabel>UPI ID</FormLabel><FormControl><Input placeholder="e.g., username@okhdfcbank" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <div className="space-y-2">
                                        <Label htmlFor="qrCode">UPI QR Code</Label>
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
        </div>
    );
}
