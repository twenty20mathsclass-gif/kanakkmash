
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirebase } from '@/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import type { User, ReferredStudent, Reward } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, IndianRupee, Users, TrendingUp } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { ScrollArea } from '@/components/ui/scroll-area';

function PromoterDetails({ promoter }: { promoter: User }) {
    const { firestore } = useFirebase();
    const [loading, setLoading] = useState(true);
    const [referrals, setReferrals] = useState<ReferredStudent[]>([]);
    const [rewards, setRewards] = useState<Reward[]>([]);

    useEffect(() => {
        if (!firestore || !promoter) return;
        setLoading(true);

        const referralsQuery = query(collection(firestore, 'users', promoter.id, 'referrals'), orderBy('referredAt', 'desc'));
        const rewardsQuery = query(collection(firestore, 'users', promoter.id, 'rewards'), orderBy('createdAt', 'desc'));

        const unsubReferrals = onSnapshot(referralsQuery, (snapshot) => {
            setReferrals(snapshot.docs.map(doc => doc.data() as ReferredStudent));
        }, (err) => {
            if (err.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `users/${promoter.id}/referrals`, operation: 'list' }, { cause: err }));
            }
        });

        const unsubRewards = onSnapshot(rewardsQuery, (snapshot) => {
            setRewards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reward)));
            setLoading(false);
        }, (err) => {
             if (err.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `users/${promoter.id}/rewards`, operation: 'list' }, { cause: err }));
            }
            setLoading(false);
        });

        return () => {
            unsubReferrals();
            unsubRewards();
        };

    }, [firestore, promoter]);

    const totalRevenue = useMemo(() => {
        return rewards.reduce((acc, reward) => acc + reward.rewardAmount, 0);
    }, [rewards]);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                     <Avatar className="h-12 w-12">
                        <AvatarImage src={promoter.avatarUrl} alt={promoter.name} />
                        <AvatarFallback>{promoter.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="font-headline">{promoter.name}</CardTitle>
                        <CardDescription>{promoter.email}</CardDescription>
                    </div>
                </div>
                <div className="pt-4">
                    <Card className="bg-muted">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <TrendingUp className="h-5 w-5" />
                                <span>Total Revenue Generated</span>
                            </div>
                            <p className="text-xl font-bold flex items-center">
                                <IndianRupee className="h-5 w-5" />{totalRevenue.toLocaleString('en-IN')}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8" /></div> : (
                    <Tabs defaultValue="referrals">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="referrals">Referred Students ({referrals.length})</TabsTrigger>
                            <TabsTrigger value="rewards">Reward History ({rewards.length})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="referrals" className="mt-4">
                            <ScrollArea className="h-96">
                                {referrals.length > 0 ? (
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Student</TableHead><TableHead className="text-right">Date Joined</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {referrals.map((ref, i) => (
                                                <TableRow key={i}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-9 w-9">
                                                                <AvatarImage src={ref.studentAvatarUrl} />
                                                                <AvatarFallback>{ref.studentName.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <span>{ref.studentName}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">{format(ref.referredAt.toDate(), 'PPP')}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : <p className="text-center text-muted-foreground py-10">No students referred yet.</p>}
                            </ScrollArea>
                        </TabsContent>
                         <TabsContent value="rewards" className="mt-4">
                             <ScrollArea className="h-96">
                                {rewards.length > 0 ? (
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Student</TableHead><TableHead>Reward</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {rewards.map(reward => (
                                                <TableRow key={reward.id}>
                                                    <TableCell>{format(reward.createdAt.toDate(), 'PPP')}</TableCell>
                                                    <TableCell>{reward.studentName}</TableCell>
                                                    <TableCell className="font-medium flex items-center"><IndianRupee className="h-4 w-4 mr-1"/>{reward.rewardAmount.toLocaleString('en-IN')}</TableCell>
                                                    <TableCell className="text-right"><Badge variant={reward.paidOut ? 'default' : 'secondary'}>{reward.paidOut ? 'Paid' : 'Unpaid'}</Badge></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : <p className="text-center text-muted-foreground py-10">No rewards earned yet.</p>}
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
                )}
            </CardContent>
        </Card>
    )
}

export default function AdminPromotersPage() {
    const { firestore } = useFirebase();
    const [promoters, setPromoters] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPromoter, setSelectedPromoter] = useState<User | null>(null);
    
    useEffect(() => {
        if (!firestore) return;

        const promotersQuery = query(collection(firestore, 'users'), where('role', '==', 'promoter'), orderBy('name', 'asc'));
        const unsubscribe = onSnapshot(promotersQuery, (snapshot) => {
            const promotersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setPromoters(promotersList);
            if (!selectedPromoter && promotersList.length > 0) {
                setSelectedPromoter(promotersList[0]);
            }
            setLoading(false);
        }, (err) => {
            if (err.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'users', operation: 'list' }, { cause: err }));
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, selectedPromoter]);

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
    }

    return (
        <div className="space-y-8">
             <div>
                <h1 className="text-3xl font-bold font-headline">Promoter Data</h1>
                <p className="text-muted-foreground">Review promoter performance, referrals, and revenue.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 items-start">
                <div className="md:col-span-1">
                     <Card>
                        <CardHeader>
                            <CardTitle>All Promoters ({promoters.length})</CardTitle>
                            <CardDescription>Select a promoter to view their details.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <ScrollArea className="h-[70vh]">
                                <div className="space-y-2 pr-2">
                                {promoters.length > 0 ? promoters.map(promoter => (
                                    <button key={promoter.id} onClick={() => setSelectedPromoter(promoter)}
                                        className={cn('w-full text-left p-3 rounded-lg border flex items-center gap-3 transition-colors',
                                            selectedPromoter?.id === promoter.id ? 'bg-accent border-primary ring-1 ring-primary' : 'hover:bg-accent/50'
                                        )}
                                    >
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={promoter.avatarUrl} alt={promoter.name} />
                                            <AvatarFallback>{promoter.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{promoter.name}</p>
                                            <p className="text-xs text-muted-foreground">{promoter.email}</p>
                                        </div>
                                    </button>
                                )) : <p className="text-center text-muted-foreground p-8">No promoters found.</p>}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-2 sticky top-20">
                     {selectedPromoter ? <PromoterDetails promoter={selectedPromoter} /> : (
                        <Card className="flex items-center justify-center h-96 border-2 border-dashed">
                            <p className="text-muted-foreground">Select a promoter to see details</p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
