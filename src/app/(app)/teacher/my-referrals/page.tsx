
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { User } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Copy, Loader2, Users as UsersIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default function MyReferralsPage() {
    const { user } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [affiliates, setAffiliates] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const referralLink = useMemo(() => {
        if (typeof window !== 'undefined' && user) {
            return `${window.location.origin}/sign-up?ref=${user.id}`;
        }
        return '';
    }, [user]);

    useEffect(() => {
        if (!firestore || !user) return;

        const fetchAffiliates = async () => {
            setLoading(true);
            try {
                const affiliatesQuery = query(
                    collection(firestore, 'users'),
                    where('referredBy', '==', user.id)
                );
                const querySnapshot = await getDocs(affiliatesQuery);
                const affiliatesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                
                // Sort on the client-side to avoid needing a composite index
                affiliatesList.sort((a, b) => {
                    if (a.createdAt && b.createdAt) {
                        return b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime();
                    }
                    if (a.createdAt) return -1;
                    if (b.createdAt) return 1;
                    return 0;
                });

                setAffiliates(affiliatesList);
            } catch (serverError: any) {
                if (serverError.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({ path: 'users', operation: 'list' }, { cause: serverError });
                    errorEmitter.emit('permission-error', permissionError);
                    toast({
                        variant: 'destructive',
                        title: 'Permission Denied',
                        description: 'You do not have permission to view referral data.'
                    });
                } else {
                    console.warn("Error fetching affiliates:", serverError);
                    toast({
                        variant: 'destructive',
                        title: 'Error',
                        description: 'Could not fetch your affiliate list.'
                    });
                }
            } finally {
                setLoading(false);
            }
        };

        fetchAffiliates();
    }, [firestore, user, toast]);

    const copyToClipboard = () => {
        if (!referralLink) return;
        navigator.clipboard.writeText(referralLink);
        toast({
            title: 'Copied to Clipboard!',
            description: 'Your referral link has been copied.'
        });
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">My Referrals</h1>
                <p className="text-muted-foreground">Share your link to grow your network and see who has joined.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Your Unique Referral Link</CardTitle>
                    <CardDescription>Share this link with potential students or teachers.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex w-full max-w-lg items-center space-x-2">
                        <Input value={referralLink} readOnly />
                        <Button type="button" size="icon" onClick={copyToClipboard} disabled={!referralLink}>
                            <Copy className="h-4 w-4" />
                            <span className="sr-only">Copy Link</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UsersIcon className="h-6 w-6" />
                        My Affiliates ({affiliates.length})
                    </CardTitle>
                    <CardDescription>A list of users who have signed up using your referral link.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : affiliates.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead className="hidden md:table-cell">Email</TableHead>
                                        <TableHead className="hidden sm:table-cell">Role</TableHead>
                                        <TableHead className="text-right">Joined On</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {affiliates.map(affiliate => (
                                        <TableRow key={affiliate.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarImage src={affiliate.avatarUrl} alt={affiliate.name} />
                                                        <AvatarFallback>{affiliate.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium">{affiliate.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-muted-foreground">{affiliate.email}</TableCell>
                                            <TableCell className="hidden sm:table-cell">
                                                <Badge variant={affiliate.role === 'teacher' ? 'default' : 'secondary'}>{affiliate.role}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground">
                                                {affiliate.createdAt ? format(affiliate.createdAt.toDate(), 'PPP') : 'N/A'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                         <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                            <p>No affiliates have joined using your link yet.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
