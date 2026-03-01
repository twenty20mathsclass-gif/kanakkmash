
'use client';

import { useState, useEffect } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import type { SalaryPayment } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, IndianRupee } from 'lucide-react';
import { format } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function TeacherSalaryHistoryPage() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const [payments, setPayments] = useState<SalaryPayment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore || !user) return;
        setLoading(true);

        const paymentsQuery = query(
            collection(firestore, 'salaryPayments'),
            where('teacherId', '==', user.id),
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
    }, [firestore, user]);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Salary History</h1>
                <p className="text-muted-foreground">A record of all salary payments you have received.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Payment Records</CardTitle>
                    <CardDescription>Your salary payments are listed below, from most recent to oldest.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                         <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : payments.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Payment Date</TableHead>
                                    <TableHead>Payment Period</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments.map(payment => (
                                    <TableRow key={payment.id}>
                                        <TableCell>{payment.paymentDate ? format(payment.paymentDate.toDate(), 'PPP') : 'Processing...'}</TableCell>
                                        <TableCell>
                                            {format(payment.periodStart.toDate(), 'MMM d, yyyy')} - {format(payment.periodEnd.toDate(), 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell className="text-right font-medium flex items-center justify-end gap-1">
                                            <IndianRupee className="h-4 w-4" />
                                            {payment.amount.toLocaleString('en-IN')}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                            <p>No salary payment records found.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
