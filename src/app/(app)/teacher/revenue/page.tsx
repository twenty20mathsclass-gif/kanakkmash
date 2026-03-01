
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const bankDetailsSchema = z.object({
  accountHolderName: z.string().min(1, 'Account holder name is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  accountNumber: z.string().min(1, 'Account number is required').regex(/^\d+$/, 'Account number must contain only digits'),
  ifscCode: z.string().min(1, 'IFSC code is required').regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format'),
});

type BankDetailsFormValues = z.infer<typeof bankDetailsSchema>;

export default function TeacherRevenuePage() {
    const { user, loading: userLoading } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<BankDetailsFormValues>({
        resolver: zodResolver(bankDetailsSchema),
        defaultValues: {
            accountHolderName: '',
            bankName: '',
            accountNumber: '',
            ifscCode: '',
        },
    });

    useEffect(() => {
        if (user) {
            form.reset({
                accountHolderName: user.accountHolderName || '',
                bankName: user.bankName || '',
                accountNumber: user.accountNumber || '',
                ifscCode: user.ifscCode || '',
            });
        }
    }, [user, form]);

    const onSubmit = async (data: BankDetailsFormValues) => {
        if (!user || !firestore) {
            setError('You must be logged in to update your details.');
            return;
        }

        setLoading(true);
        setError(null);

        const userDocRef = doc(firestore, 'users', user.id);
        
        updateDoc(userDocRef, { ...data })
            .then(() => {
                toast({
                    title: 'Success!',
                    description: 'Your bank account details have been saved.',
                });
            })
            .catch((serverError: any) => {
                if (serverError.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({ path: userDocRef.path, operation: 'update', requestResourceData: data }, { cause: serverError });
                    errorEmitter.emit('permission-error', permissionError);
                    setError("You don't have permission to perform this action.");
                } else {
                    console.error("Firestore error:", serverError);
                    setError('An unexpected error occurred. Please try again.');
                }
            })
            .finally(() => {
                setLoading(false);
            });
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
                    <CardTitle>Bank Account Details</CardTitle>
                    <CardDescription>This information is used to process your salary payments. It is kept private and secure.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="accountHolderName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Account Holder Name</FormLabel>
                                        <FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="bankName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Bank Name</FormLabel>
                                        <FormControl><Input placeholder="e.g., State Bank of India" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="accountNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Account Number</FormLabel>
                                        <FormControl><Input placeholder="e.g., 12345678901" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="ifscCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>IFSC Code</FormLabel>
                                        <FormControl><Input placeholder="e.g., SBIN0001234" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
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
