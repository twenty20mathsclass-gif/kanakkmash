
'use client';

import { useEffect, useState } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, IndianRupee } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Reward } from '@/lib/definitions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function RewardHistoryPage() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore || !user) return;
        setLoading(true);

        const rewardsQuery = query(
            collection(firestore, 'rewards'),
            where('promoterId', '==', user.id),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(rewardsQuery, (snapshot) => {
            const rewardsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reward));
            setRewards(rewardsList);
            setLoading(false);
        }, (serverError: any) => {
            if (serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({ path: `rewards`, operation: 'list' }, { cause: serverError });
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

    const totalEarned = rewards.reduce((acc, reward) => acc + reward.rewardAmount, 0);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">My Reward History</h1>
                <p className="text-muted-foreground">Track the rewards you've earned from your referrals.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Total Rewards Earned</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold flex items-center gap-2">
                        <IndianRupee className="h-8 w-8"/>
                        {totalEarned.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Reward Details</CardTitle>
                    <CardDescription>A record of all rewards you have received.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                         <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : rewards.length > 0 ? (
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
                                {rewards.map(reward => (
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
                            <p>No rewards earned yet. Share your referral link to get started!</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
