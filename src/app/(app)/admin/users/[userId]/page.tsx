
'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { User, Schedule, SalaryPayment, Invoice, ReferredStudent, Reward, TeacherPrivateDetails, PromoterPrivateDetails } from '@/lib/definitions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft, Mail, Phone, Edit, IndianRupee } from 'lucide-react';
import { format } from 'date-fns';
import { EditUserDialog } from '@/components/admin/edit-user-dialog';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

export default function UserProfilePage() {
    const params = use(useParams() as Promise<{ userId: string; }>);
    const userId = params.userId;
    const router = useRouter();
    const { firestore } = useFirebase();

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Data states
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [referrals, setReferrals] = useState<ReferredStudent[]>([]);
    const [rewards, setRewards] = useState<Reward[]>([]);

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const fetchUserData = async () => {
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
                const schedulesQuery = query(collection(firestore, 'schedules'), where('teacherId', '==', userId), orderBy('date', 'desc'));
                const salaryQuery = query(collection(firestore, 'users', userId, 'salaryPayments'), orderBy('paymentDate', 'desc'));
                const referralsQuery = query(collection(firestore, 'users', userId, 'referrals'), orderBy('referredAt', 'desc'));

                const [schedulesSnap, salarySnap, referralsSnap] = await Promise.all([
                    getDocs(schedulesQuery),
                    getDocs(salaryQuery),
                    getDocs(referralsQuery)
                ]);

                setSchedules(schedulesSnap.docs.map(d => ({id: d.id, ...d.data()} as Schedule)));
                setSalaryPayments(salarySnap.docs.map(d => ({id: d.id, ...d.data()} as SalaryPayment)));
                setReferrals(referralsSnap.docs.map(d => d.data() as ReferredStudent));
            } else if (userData.role === 'student') {
                const invoicesQuery = query(collection(firestore, 'invoices'), where('studentId', '==', userId), orderBy('createdAt', 'desc'));
                const invoicesSnap = await getDocs(invoicesQuery);
                setInvoices(invoicesSnap.docs.map(d => ({id: d.id, ...d.data()} as Invoice)));
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
            console.error("Error fetching user data:", e);
            if (e.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({path: `users/${userId} or related subcollections`, operation: 'get'}, {cause: e}));
            }
            setError("Failed to load user details.");
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchUserData();
    }, [firestore, userId]);
    
    if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;
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
                            <CardTitle className="text-2xl font-bold">{user.name}</CardTitle>
                            <CardDescription>
                                <Badge className="capitalize">{user.role}</Badge>
                            </CardDescription>
                            <div className="flex flex-col md:flex-row md:items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {user.email}</span>
                                {user.mobile && <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> {`+${user.countryCode} ${user.mobile}`}</span>}
                            </div>
                        </div>
                    </div>
                     <Button onClick={() => setIsEditDialogOpen(true)}><Edit className="mr-2 h-4 w-4" /> Edit User</Button>
                </CardHeader>
            </Card>

            <Tabs defaultValue={defaultTab}>
                <TabsList>
                    {user.role === 'teacher' && <TabsTrigger value="schedules">Schedules ({schedules.length})</TabsTrigger>}
                    {user.role === 'teacher' && <TabsTrigger value="salary">Salary ({salaryPayments.length})</TabsTrigger>}
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
                        <TableBody>{salaryPayments.map(p => (<TableRow key={p.id}><TableCell>{p.paymentDate ? format(p.paymentDate.toDate(), 'PPP') : '-'}</TableCell><TableCell className="font-medium flex items-center"><IndianRupee className="h-4 w-4"/>{p.amount.toLocaleString()}</TableCell><TableCell>{p.paymentMonth ? format(new Date(p.paymentMonth), 'MMMM yyyy') : `${format(p.startDate.toDate(), 'MMM d')} - ${format(p.endDate.toDate(), 'MMM d, yyyy')}`}</TableCell></TableRow>))}</TableBody>
                    </Table></CardContent></Card>
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
        </div>
    );
}
