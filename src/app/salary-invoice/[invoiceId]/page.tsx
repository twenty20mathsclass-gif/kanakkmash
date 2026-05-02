'use client';

import { useEffect, useState, useRef } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Loader2, Download, LogIn, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { PageLoader } from '@/components/shared/page-loader';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export const dynamic = 'force-dynamic';

function SalaryInvoicePageContents() {
    const { firestore } = useFirebase();
    const params = useParams();

    const invoiceId = params.invoiceId as string;
    
    const [invoice, setInvoice] = useState<any>(null);
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
                const invoiceRef = doc(firestore, 'salaryInvoices', invoiceId);
                const invoiceSnap = await getDoc(invoiceRef);

                if (!invoiceSnap.exists()) {
                    setError('Invoice not found.');
                    setLoading(false);
                    return;
                }

                setInvoice({ id: invoiceSnap.id, ...invoiceSnap.data() });
            } catch (err: any) {
                console.error("Error fetching invoice:", err);
                if (err.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({
                        path: `salaryInvoices/${invoiceId}`,
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
            <Card className="border-destructive max-w-2xl mx-auto mt-8">
                <CardHeader>
                    <CardTitle>Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive">{error}</p>
                </CardContent>
            </Card>
        );
    }
    
    if (!invoice) {
        return <p className="text-center mt-8">Could not load invoice data.</p>;
    }
    
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div ref={componentRef} className="p-8 print-area bg-background rounded-lg shadow-lg border border-border/50">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-8 border-b">
                    <div>
                        <Image src="/logo mlm@4x.png" alt="kanakkmash logo" width={200} height={62} className="object-contain" unoptimized/>
                        <p className="text-muted-foreground text-sm mt-2">An ISO 9001: 2015 Certified Institution</p>
                    </div>
                    <div className="text-left sm:text-right">
                        <h1 className="text-3xl font-bold font-headline text-primary">SALARY INVOICE</h1>
                        <p className="text-muted-foreground break-all text-sm sm:text-base"># {invoice.id}</p>
                    </div>
                </header>

                <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 my-8">
                    <div>
                        <h2 className="font-bold text-lg mb-2">Paid To:</h2>
                        <p className="font-semibold text-xl">{invoice.teacherName}</p>
                        <p className="text-sm sm:text-base break-all">{invoice.teacherEmail}</p>
                    </div>
                    <div className="text-left sm:text-right space-y-1">
                        <p><span className="font-bold">Date:</span> {invoice.paymentDate ? format(invoice.paymentDate.toDate(), 'PPP') : 'N/A'}</p>
                        {invoice.startDate && invoice.endDate && (
                            <p><span className="font-bold">Period:</span> <span className="inline-block">{format(invoice.startDate.toDate(), 'dd/MM/yyyy')} - {format(invoice.endDate.toDate(), 'dd/MM/yyyy')}</span></p>
                        )}
                    </div>
                </section>

                <section className="my-8">
                    <div className="overflow-x-auto -mx-8 px-8 sm:mx-0 sm:px-0">
                        <table className="w-full min-w-[500px]">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="p-3 text-left font-semibold">Description</th>
                                    <th className="p-3 text-right font-semibold">Hours</th>
                                    <th className="p-3 text-right font-semibold">Rate</th>
                                    <th className="p-3 text-right font-semibold">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.totalHoursGroup > 0 || invoice.hourlyRateGroup > 0 ? (
                                    <tr className="border-b">
                                        <td className="p-3 font-bold">Group Classes</td>
                                        <td className="p-3 text-right">{invoice.totalHoursGroup || 0}</td>
                                        <td className="p-3 text-right">₹{Number(invoice.hourlyRateGroup || 0).toFixed(2)}</td>
                                        <td className="p-3 text-right font-mono">₹{Number((invoice.totalHoursGroup || 0) * (invoice.hourlyRateGroup || 0)).toFixed(2)}</td>
                                    </tr>
                                ) : null}
                                {invoice.totalHoursOneToOne > 0 || invoice.hourlyRateOneToOne > 0 ? (
                                    <tr className="border-b">
                                        <td className="p-3 font-bold">One-to-One Classes</td>
                                        <td className="p-3 text-right">{invoice.totalHoursOneToOne || 0}</td>
                                        <td className="p-3 text-right">₹{Number(invoice.hourlyRateOneToOne || 0).toFixed(2)}</td>
                                        <td className="p-3 text-right font-mono">₹{Number((invoice.totalHoursOneToOne || 0) * (invoice.hourlyRateOneToOne || 0)).toFixed(2)}</td>
                                    </tr>
                                ) : null}
                                {invoice.fixedAmount > 0 && (
                                    <tr className="border-b">
                                        <td className="p-3 font-bold">Fixed Amount / Base Salary</td>
                                        <td className="p-3 text-right">-</td>
                                        <td className="p-3 text-right">-</td>
                                        <td className="p-3 text-right font-mono">₹{Number(invoice.fixedAmount).toFixed(2)}</td>
                                    </tr>
                                )}
                                {invoice.incentives > 0 && (
                                    <tr className="border-b">
                                        <td className="p-3 font-bold">Incentives / Bonus</td>
                                        <td className="p-3 text-right">-</td>
                                        <td className="p-3 text-right">-</td>
                                        <td className="p-3 text-right font-mono">₹{Number(invoice.incentives).toFixed(2)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="flex justify-end my-8">
                    <div className="w-full sm:max-w-xs space-y-2">
                        <div className="flex justify-between items-center font-bold text-xl sm:text-2xl bg-primary text-primary-foreground p-4 rounded-lg">
                            <span>Total</span>
                            <span className="font-mono">₹{Number(invoice.amount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-center pt-2">
                             <p className="text-green-600 font-bold text-lg tracking-widest border-2 border-green-600 px-4 py-1 rounded-full rotate-[-5deg] opacity-80 mt-4">PAID</p>
                         </div>
                    </div>
                </section>

                <footer className="text-center text-muted-foreground text-xs pt-8 border-t">
                    <p>Thank you for your valuable contribution to kanakkmash!</p>
                    <p>If you have any questions about this invoice, please contact admin.</p>
                </footer>
            </div>
            
            <div className="flex justify-center gap-4 mt-8 print-hide">
                <Button onClick={handlePrint} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                </Button>
                <Button variant="secondary" onClick={() => window.close()}>
                    Close Window
                </Button>
            </div>
        </div>
    );
}

export default function SalaryInvoicePage() {
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
            <SalaryInvoicePageContents />
        </div>
    );
}
