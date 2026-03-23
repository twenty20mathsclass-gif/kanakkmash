'use client';

import { useEffect, useState, useRef } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import type { Invoice, User } from '@/lib/definitions';
import { Loader2, Download, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { PageLoader } from '@/components/shared/page-loader';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export const dynamic = 'force-dynamic';

function InvoicePageContents() {
    const { firestore } = useFirebase();
    const params = useParams();
    const invoiceId = params.invoiceId as string;
    
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [student, setStudent] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const componentRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        window.print();
    };

    useEffect(() => {
        if (!firestore || !invoiceId) {
            setLoading(false);
            return;
        }

        const fetchInvoice = async () => {
            try {
                const invoiceRef = doc(firestore, 'invoices', invoiceId);
                const invoiceSnap = await getDoc(invoiceRef);

                if (!invoiceSnap.exists()) {
                    setError('Invoice not found.');
                    setLoading(false);
                    return;
                }

                const invoiceData = { id: invoiceSnap.id, ...invoiceSnap.data() } as Invoice;
                setInvoice(invoiceData);

                const userRef = doc(firestore, 'users', invoiceData.studentId);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    setStudent(userSnap.data() as User);
                } else {
                    setError('Student details not found for this invoice.');
                }
            } catch (err: any) {
                console.error("Error fetching invoice:", err);
                if (err.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({
                        path: `invoices/${invoiceId}`,
                        operation: 'get'
                    }, { cause: err });
                    errorEmitter.emit('permission-error', permissionError);
                    setError('You do not have permission to view this invoice.');
                } else {
                    setError('Failed to load invoice details.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchInvoice();
    }, [firestore, invoiceId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading your invoice...</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle>Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive">{error}</p>
                </CardContent>
            </Card>
        );
    }
    
    if (!invoice || !student) {
        return <p>Could not load invoice data.</p>
    }
    
    return (
        <div className="max-w-4xl mx-auto">
            <div ref={componentRef} className="p-8 print-area bg-background rounded-lg shadow-lg">
                <header className="flex justify-between items-center pb-8 border-b">
                    <div>
                        <Image src="/logo mlm@4x.png" alt="kanakkmash logo" width={200} height={62} className="object-contain" unoptimized/>
                        <p className="text-muted-foreground text-sm mt-2">An ISO 9001: 2015 Certified Institution</p>
                    </div>
                    <div className="text-right">
                        <h1 className="text-4xl font-bold font-headline text-primary">INVOICE</h1>
                        <p className="text-muted-foreground break-all"># {invoice.id}</p>
                    </div>
                </header>

                <section className="grid md:grid-cols-2 gap-8 my-8">
                    <div>
                        <h2 className="font-bold text-lg mb-2">Billed To:</h2>
                        <p className="font-semibold text-xl">{student.name}</p>
                        <p>{student.email}</p>
                    </div>
                    <div className="text-right">
                        <p><span className="font-bold">Payment Date:</span> {invoice.paidAt ? format(invoice.paidAt.toDate(), 'PPP') : 'N/A'}</p>
                        <p><span className="font-bold">Payment Method:</span> <span className="capitalize">{invoice.paymentMethod}</span></p>
                        <p><span className="font-bold">Transaction ID:</span> <span className="break-all">{invoice.paymentId}</span></p>
                    </div>
                </section>

                <section className="my-8">
                    <table className="w-full">
                        <thead className="bg-muted">
                            <tr>
                                <th className="p-3 text-left font-semibold">Description</th>
                                <th className="p-3 text-right font-semibold">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b">
                                <td className="p-3">
                                    <p className="font-bold">Student Registration Fee</p>
                                    <p className="text-sm text-muted-foreground">{student.courseModel}</p>
                                    {student.class && <p className="text-sm text-muted-foreground">Class: {student.class}</p>}
                                    {student.syllabus && <p className="text-sm text-muted-foreground">Syllabus: {student.syllabus}</p>}
                                    {student.competitiveExam && <p className="text-sm text-muted-foreground">Exam: {student.competitiveExam}</p>}
                                </td>
                                <td className="p-3 text-right font-mono">₹{Number(invoice.amount).toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                <section className="flex justify-end my-8">
                    <div className="w-full max-w-xs space-y-2">
                        <div className="flex justify-between font-bold text-2xl bg-primary text-primary-foreground p-4 rounded-lg">
                            <span>Total</span>
                            <span className="font-mono">₹{Number(invoice.amount).toFixed(2)}</span>
                        </div>
                         <div className="flex justify-center pt-2">
                             <p className="text-green-600 font-bold text-lg">PAID</p>
                         </div>
                    </div>
                </section>

                <footer className="text-center text-muted-foreground text-xs pt-8 border-t">
                    <p>Thank you for choosing kanakkmash!</p>
                    <p>If you have any questions, please contact us at support@kanakkmash.com</p>
                </footer>
            </div>
            
            <div className="flex justify-center gap-4 mt-8 print-hide">
                <Button onClick={handlePrint} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                </Button>
                <Button asChild>
                    <Link href="/dashboard">
                        <LogIn className="mr-2 h-4 w-4" />
                        Go to Student Portal
                    </Link>
                </Button>
            </div>
        </div>
    );
}


export default function InvoicePage() {
    const { user, loading: userLoading } = useUser();

    if (userLoading) {
        return <PageLoader />;
    }

    return (
        <div className="bg-secondary/30 min-h-screen p-4 sm:p-8">
            <style jsx global>{`
                @media print {
                    body {
                        background-color: white !important;
                    }
                    body * {
                        visibility: hidden;
                    }
                    .print-area, .print-area * {
                        visibility: visible;
                    }
                    .print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background-color: white !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                    .print-hide {
                        display: none;
                    }
                    @page {
                      size: auto;
                      margin: 0mm;
                    }
                }
            `}</style>
            <InvoicePageContents />
        </div>
    );
}