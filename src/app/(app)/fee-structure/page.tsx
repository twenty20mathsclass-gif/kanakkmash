
'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import type { CourseFee } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, IndianRupee } from 'lucide-react';
import { Reveal } from '@/components/shared/reveal';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function FeeStructurePage() {
    const { firestore } = useFirebase();
    const [fees, setFees] = useState<CourseFee[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;
        setLoading(true);
        const q = query(collection(firestore, 'courseFees'), orderBy('courseModel'), orderBy('amount'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const feesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseFee));
            setFees(feesData);
            setLoading(false);
        }, (err: any) => {
            if (err.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'courseFees', operation: 'list' }, { cause: err }));
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [firestore]);

    const getConditionText = (fee: CourseFee) => {
        if (fee.courseModel === 'COMPETITIVE EXAM') return fee.competitiveExam || '-';
        if (fee.courseModel === 'MATHS ONLINE TUITION' || fee.courseModel === 'ONE TO ONE') {
            if (!fee.class) return 'General';
            if (fee.class === 'DEGREE') return 'Degree';
            return `${fee.class || ''} - ${fee.syllabus || ''}`;
        }
        return '-';
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <Reveal>
                <div className="text-center">
                    <h1 className="text-4xl font-bold font-headline tracking-tight sm:text-5xl">Our Fee Structure</h1>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                        Transparent and affordable pricing for quality education.
                    </p>
                </div>
            </Reveal>

            <Reveal delay={0.2}>
                <Card>
                    <CardHeader>
                        <CardTitle>Registration Fees</CardTitle>
                        <CardDescription>A complete list of our one-time registration fees for various courses.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center items-center py-24">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            </div>
                        ) : fees.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Course Model</TableHead>
                                        <TableHead>Details</TableHead>
                                        <TableHead className="text-right">Amount (INR)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fees.map(fee => (
                                        <TableRow key={fee.id}>
                                            <TableCell className="font-medium">{fee.courseModel}</TableCell>
                                            <TableCell>{getConditionText(fee)}</TableCell>
                                            <TableCell className="text-right font-semibold flex items-center justify-end gap-1">
                                                <IndianRupee className="h-4 w-4" />
                                                {fee.amount.toLocaleString('en-IN')}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center text-muted-foreground py-24 border-2 border-dashed rounded-lg">
                                <p className="text-lg">Fee structure is not available at the moment.</p>
                                <p>Please check back later or contact us for details.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </Reveal>
        </div>
    );
}
