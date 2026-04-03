
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, updateDoc, deleteDoc } from 'firebase/firestore';
import type { User, Schedule, SalaryPayment, Invoice, ReferredStudent, Reward, TeacherPrivateDetails, PromoterPrivateDetails } from '@/lib/definitions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft, Mail, Phone, Edit, IndianRupee, Ban, CheckCircle, Trash2, Lock, Unlock, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { EditUserDialog } from '@/components/admin/edit-user-dialog';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function UserProfilePage() {
    const params = useParams();
    const userId = params.userId as string;
    const router = useRouter();
    const { firestore } = useFirebase();
    const { user: currentUser, loading: authLoading } = useUser();
    const { toast } = useToast();

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusLoading, setStatusLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    
    // Data states
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [referrals, setReferrals] = useState<ReferredStudent[]>([]);
    const [rewards, setRewards] = useState<Reward[]>([]);

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const [paymentLockLoading, setPaymentLockLoading] = useState(false);

    const fetchUserData = useCallback(async () => {
        if (!firestore || !userId) return;
        setLoading(true);
        setError(null);

        try {
            const userRef = doc(firestore, 'users', userId);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                setError('User not found.');
                setLoading(false);
                return;
            }
            
            let userData = { id: userSnap.id, ...userSnap.data() } as User;

            if (userData.role === 'teacher') {
                const detailsRef = doc(firestore, 'users', userId, 'teacher_details', 'payment');
                const detailsSnap = await getDoc(detailsRef);
                if (detailsSnap.exists()) {
                    userData = { ...userData, ...(detailsSnap.data() as TeacherPrivateDetails) };
                }
            } else if (userData.role === 'promoter') {
                 const detailsRef = doc(firestore, 'users', userId, 'promoter_details', 'payment');
                 const detailsSnap = await getDoc(detailsRef);
                 if (detailsSnap.exists()) {
                    userData = { ...userData, ...(detailsSnap.data() as PromoterPrivateDetails) };
                }
            }
            setUser(userData);

            // Fetch related data based on role
            if (userData.role === 'teacher') {
                const schedulesQuery = query(collection(firestore, 'schedules'), where('teacherId', '==', userId));
                const salaryQuery = query(collection(firestore, 'users', userId, 'salaryPayments'), orderBy('paymentDate', 'desc'));
                const referralsQuery = query(collection(firestore, 'users', userId, 'referrals'), orderBy('referredAt', 'desc'));

                const [schedulesSnap, salarySnap, referralsSnap] = await Promise.all([
                    getDocs(schedulesQuery),
                    getDocs(salaryQuery),
                    getDocs(referralsQuery)
                ]);

                const schedulesList = schedulesSnap.docs.map(d => ({id: d.id, ...d.data()} as Schedule));
                schedulesList.sort((a,b) => b.date.toMillis() - a.date.toMillis());

                setSchedules(schedulesList);
                setSalaryPayments(salarySnap.docs.map(d => ({id: d.id, ...d.data()} as SalaryPayment)));
                setReferrals(referralsSnap.docs.map(d => d.data() as ReferredStudent));
            } else if (userData.role === 'student') {
                const invoicesQuery = query(collection(firestore, 'invoices'), where('studentId', '==', userId));
                const invoicesSnap = await getDocs(invoicesQuery);
                const invoicesList = invoicesSnap.docs.map(d => ({id: d.id, ...d.data()} as Invoice));
                invoicesList.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
                setInvoices(invoicesList);
            } else if (userData.role === 'promoter') {
                const referralsQuery = query(collection(firestore, 'users', userId, 'referrals'), orderBy('referredAt', 'desc'));
                const rewardsQuery = query(collection(firestore, 'users', userId, 'rewards'), orderBy('createdAt', 'desc'));
                 const [referralsSnap, rewardsSnap] = await Promise.all([
                    getDocs(referralsQuery),
                    getDocs(rewardsQuery),
                ]);
                setReferrals(referralsSnap.docs.map(d => d.data() as ReferredStudent));
                setRewards(rewardsSnap.docs.map(d => ({id: d.id, ...d.data()} as Reward)));
            }

        } catch (e: any) {
            if (e.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({path: `users/${userId} or related subcollections`, operation: 'get'}, {cause: e}));
            } else {
                console.error("Error fetching user data:", e);
            }
            setError("Failed to load user details.");
        } finally {
            setLoading(false);
        }
    }, [firestore, userId]);
    
    useEffect(() => {
        if (!authLoading && currentUser && currentUser.role === 'admin') {
            fetchUserData();
        }
    }, [authLoading, currentUser, fetchUserData]);

    const handleTogglePaymentLock = async () => {
        if (!firestore || !user || user.role !== 'teacher') return;
        setPaymentLockLoading(true);
        const detailsRef = doc(firestore, 'users', user.id, 'teacher_details', 'payment');
        const newLockedStatus = !((user as any).isLocked !== false);

        try {
            await updateDoc(detailsRef, { isLocked: newLockedStatus });
            setUser({ ...user, isLocked: newLockedStatus } as any);
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

    const handleToggleStatus = async () => {
        if (!firestore || !user) return;
        setStatusLoading(true);
        const userRef = doc(firestore, 'users', user.id);
        const newStatus = !user.isDisabled;

        try {
            await updateDoc(userRef, { isDisabled: newStatus });
            setUser({ ...user, isDisabled: newStatus });
            toast({
                title: newStatus ? "Account Disabled" : "Account Enabled",
                description: `${user.name}'s account has been ${newStatus ? 'disabled' : 'enabled'}.`
            });
        } catch (e: any) {
            if (e.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `users/${user.id}`, operation: 'update', requestResourceData: { isDisabled: newStatus } }, { cause: e }));
            } else {
                toast({
                    variant: "destructive",
                    title: "Update Failed",
                    description: "Could not update user status."
                });
            }
        } finally {
            setStatusLoading(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!firestore || !user) return;
        setDeleteLoading(true);
        const userRef = doc(firestore, 'users', user.id);
        try {
            await deleteDoc(userRef);
            toast({
                title: "User Deleted",
                description: `${user.name}'s account profile has been removed from the database.`
            });
            router.push('/admin/users');
        } catch (e: any) {
            if (e.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `users/${user.id}`, operation: 'delete' }, { cause: e }));
            } else {
                toast({
                    variant: "destructive",
                    title: "Delete Failed",
                    description: "Could not delete user. They may have related data that prevents deletion."
                });
            }
            setDeleteLoading(false);
            setIsDeleteDialogOpen(false);
        }
    };
    
    if (loading || authLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;
    if (error) return <div className="text-destructive text-center">{error}</div>;
    if (!user) return <div className="text-center text-muted-foreground">User data could not be loaded.</div>;

    const defaultTab = user.role === 'student' ? 'invoices' : (user.role === 'teacher' ? 'schedules' : 'referrals');

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                 <Button variant="outline" size="icon" onClick={() => router.push('/admin/users')}><ArrowLeft/></Button>
                 <div>
                    <h1 className="text-3xl font-bold font-headline">User Profile</h1>
                    <p className="text-muted-foreground">Detailed information for {user.name}.</p>
                 </div>
            </div>

            <Card>
                <CardHeader className="flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={user.avatarUrl} alt={user.name} />
                            <AvatarFallback className="text-3xl">{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-2xl font-bold">{user.name}</CardTitle>
                                {user.isDisabled && <Badge variant="destructive">Disabled</Badge>}
                            </div>
                            <CardDescription>
                                <Badge className="capitalize">{user.role}</Badge>
                            </CardDescription>
                            <div className="flex flex-col md:flex-row md:items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {user.email}</span>
                                {user.mobile && <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> {user.mobile}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </Button>
                        <Button 
                            variant={user.isDisabled ? "secondary" : "destructive"} 
                            onClick={handleToggleStatus}
                            disabled={statusLoading}
                            className="min-w-[120px]"
                        >
                            {statusLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
                                user.isDisabled ? <CheckCircle className="mr-2 h-4 w-4" /> : <Ban className="mr-2 h-4 w-4" />
                            )}
                            {user.isDisabled ? "Enable" : "Disable"}
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={() => setIsDeleteDialogOpen(true)}
                            disabled={deleteLoading}
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <Tabs defaultValue={defaultTab}>
                <TabsList>
                    {user.role === 'teacher' && <TabsTrigger value="schedules">Schedules ({schedules.length})</TabsTrigger>}
                    {user.role === 'teacher' && <TabsTrigger value="salary">Salary ({salaryPayments.length})</TabsTrigger>}
                    {user.role === 'teacher' && <TabsTrigger value="payment">Payment Details</TabsTrigger>}
                    {(user.role === 'teacher' || user.role === 'promoter') && <TabsTrigger value="referrals">Referrals ({referrals.length})</TabsTrigger>}
                    {user.role === 'promoter' && <TabsTrigger value="rewards">Rewards ({rewards.length})</TabsTrigger>}
                    {user.role === 'student' && <TabsTrigger value="invoices">Fee Payments ({invoices.length})</TabsTrigger>}
                </TabsList>

                <TabsContent value="schedules">
                    <Card><CardHeader><CardTitle>Schedules Created</CardTitle></CardHeader><CardContent><Table>
                        <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                        <TableBody>{schedules.map(s => (<TableRow key={s.id}><TableCell>{s.title}</TableCell><TableCell><Badge variant={s.type === 'exam' ? 'destructive' : 'default'} className="capitalize">{s.type}</Badge></TableCell><TableCell>{format(s.date.toDate(), 'PPP')}</TableCell><TableCell>{s.startTime}</TableCell></TableRow>))}</TableBody>
                    </Table></CardContent></Card>
                </TabsContent>
                <TabsContent value="salary">
                    <Card><CardHeader><CardTitle>Salary Payments</CardTitle></CardHeader><CardContent><Table>
                        <TableHeader><TableRow><TableHead>Payment Date</TableHead><TableHead>Amount</TableHead><TableHead>For Period</TableHead></TableRow></TableHeader>
                        <TableBody>{salaryPayments.map(p => (<TableRow key={p.id}><TableCell>{p.paymentDate ? format(p.paymentDate.toDate(), 'PPP') : '-'}</TableCell><TableCell className="font-medium flex items-center"><IndianRupee className="h-4 w-4"/>{p.amount.toLocaleString()}</TableCell><TableCell>{p.paymentMonth ? format(new Date(p.paymentMonth), 'MMMM yyyy') : (p.startDate && p.endDate ? `${format(p.startDate.toDate(), 'MMM d')} - ${format(p.endDate.toDate(), 'MMM d, yyyy')}` : '-')}</TableCell></TableRow>))}</TableBody>
                    </Table></CardContent></Card>
                </TabsContent>
                <TabsContent value="payment">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Payment Details & Security</CardTitle>
                                <CardDescription>View and manage teacher's payment platform information.</CardDescription>
                            </div>
                            <Button 
                                variant={(user as any).isLocked !== false ? "outline" : "destructive"}
                                onClick={handleTogglePaymentLock}
                                disabled={paymentLockLoading}
                            >
                                {paymentLockLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
                                    (user as any).isLocked !== false ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />
                                )}
                                {(user as any).isLocked !== false ? "Unlock for Edit" : "Lock Details"}
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {(user as any).paymentMethod ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">General Info</h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Method</span><Badge className="capitalize">{(user as any).paymentMethod}</Badge></div>
                                            <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Status</span><Badge variant={(user as any).isLocked !== false ? "secondary" : "destructive"}>{(user as any).isLocked !== false ? "LOCKED" : "UNLOCKED"}</Badge></div>
                                        </div>
                                    </div>
                                    
                                    {(user as any).paymentMethod === 'bank' ? (
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Bank Account Details</h3>
                                            <div className="space-y-2">
                                                <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Holder</span><span className="font-medium">{(user as any).accountHolderName}</span></div>
                                                <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Bank</span><span className="font-medium">{(user as any).bankName}</span></div>
                                                <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">A/C No</span><span className="font-medium">{(user as any).accountNumber}</span></div>
                                                <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">IFSC</span><span className="font-medium">{(user as any).ifscCode}</span></div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">UPI Details</h3>
                                            <div className="space-y-2">
                                                <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">UPI ID</span><span className="font-medium">{(user as any).upiId}</span></div>
                                                {(user as any).upiQrCodeUrl && (
                                                    <div className="pt-2">
                                                        <span className="text-muted-foreground block mb-2">QR Code</span>
                                                        <Link href={(user as any).upiQrCodeUrl} target="_blank" className="block relative h-40 w-40 border rounded-xl overflow-hidden hover:opacity-80 transition-opacity">
                                                            <img src={(user as any).upiQrCodeUrl} alt="UPI QR" className="object-cover w-full h-full" />
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-3xl">
                                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                    <p>Teacher has not submitted any payment details yet.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="referrals">
                    <Card><CardHeader><CardTitle>Referred Users</CardTitle></CardHeader><CardContent><Table>
                        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Date Joined</TableHead></TableRow></TableHeader>
                        <TableBody>{referrals.map((r, i) => (<TableRow key={i}><TableCell>{r.studentName}</TableCell><TableCell>{format(r.referredAt.toDate(), 'PPP')}</TableCell></TableRow>))}</TableBody>
                    </Table></CardContent></Card>
                </TabsContent>
                <TabsContent value="rewards">
                    <Card><CardHeader><CardTitle>Rewards Earned</CardTitle></CardHeader><CardContent><Table>
                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                        <TableBody>{rewards.map(r => (<TableRow key={r.id}><TableCell>{format(r.createdAt.toDate(), 'PPP')}</TableCell><TableCell className="font-medium flex items-center"><IndianRupee className="h-4 w-4"/>{r.rewardAmount.toLocaleString()}</TableCell><TableCell><Badge variant={r.paidOut ? 'default' : 'secondary'}>{r.paidOut ? 'Paid' : 'Unpaid'}</Badge></TableCell></TableRow>))}</TableBody>
                    </Table></CardContent></Card>
                </TabsContent>
                <TabsContent value="invoices">
                    <Card><CardHeader><CardTitle>Invoices</CardTitle></CardHeader><CardContent><Table>
                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                        <TableBody>{invoices.map(inv => (<TableRow key={inv.id}><TableCell>{format(inv.createdAt.toDate(), 'PPP')}</TableCell><TableCell className="font-medium flex items-center"><IndianRupee className="h-4 w-4"/>{inv.amount.toLocaleString()}</TableCell><TableCell><Badge variant={inv.status === 'paid' ? 'default' : 'destructive'} className="capitalize">{inv.status}</Badge></TableCell><TableCell><Button variant="link" asChild><Link href={`/invoice/${inv.id}`} target="_blank">View</Link></Button></TableCell></TableRow>))}</TableBody>
                    </Table></CardContent></Card>
                </TabsContent>
            </Tabs>
            
            {user && <EditUserDialog user={user} isOpen={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} onUserUpdated={fetchUserData} />}

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete {user.name}'s profile from the database. 
                            <strong> Note:</strong> This does not delete the user from Authentication.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90" disabled={deleteLoading}>
                            {deleteLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Delete User
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
