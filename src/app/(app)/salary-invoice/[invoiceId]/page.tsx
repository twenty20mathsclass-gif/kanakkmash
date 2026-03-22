
'use client';

import { useEffect, useState, useRef } from 'react';
import { useFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import type { SalaryInvoice } from '@/lib/definitions';
import { Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

function SalaryInvoicePageContents() {
    const { firestore } = useFirebase();
    const params = useParams();
    const invoiceId = params.invoiceId as string;
    
    const [invoice, setInvoice] = useState<SalaryInvoice | null>(null);
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
                    setError('Salary invoice not found.');
                } else {
                    setInvoice({ id: invoiceSnap.id, ...invoiceSnap.data() } as SalaryInvoice);
                }
            } catch (err: any) {
                console.error("Error fetching salary invoice:", err);
                setError('Failed to load invoice details.');
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
                <CardHeader><CardTitle>Error</CardTitle></CardHeader>
                <CardContent><p className="text-destructive">{error}</p></CardContent>
            </Card>
        );
    }
    
    if (!invoice) {
        return <p>Could not load invoice data.</p>
    }
    
    return (
        <div className="max-w-4xl mx-auto">
             <style jsx global>{`
                @media print {
                    body {
                        background-color: white !important;
                    }
                    .print-hide {
                        display: none;
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
                    @page {
                      size: auto;
                      margin: 0mm;
                    }
                }
            `}</style>
            <div ref={componentRef} className="p-8 print-area bg-card rounded-lg shadow-lg border">
                <header className="flex justify-between items-center pb-8 border-b">
                    <div>
                        <Image src="/logo mlm@4x.png" alt="kanakkmash logo" width={200} height={62} className="object-contain" unoptimized/>
                        <p className="text-muted-foreground text-sm mt-2">An ISO 9001: 2015 Certified Institution</p>
                    </div>
                    <div className="text-right">
                        <h1 className="text-4xl font-bold font-headline text-primary">SALARY INVOICE</h1>
                        <p className="text-muted-foreground break-all"># {invoice.id}</p>
                    </div>
                </header>

                <section className="grid md:grid-cols-2 gap-8 my-8">
                    <div>
                        <h2 className="font-bold text-lg mb-2">To:</h2>
                        <p className="font-semibold text-xl">{invoice.teacherName}</p>
                        <p>{invoice.teacherEmail}</p>
                    </div>
                    <div className="text-right">
                        <p><span className="font-bold">Payment Date:</span> {invoice.paymentDate ? format(invoice.paymentDate.toDate(), 'PPP') : 'N/A'}</p>
                        <p><span className="font-bold">Payment Period:</span> {invoice.startDate ? `${format(invoice.startDate.toDate(), 'MMM d, yyyy')} - ${format(invoice.endDate.toDate(), 'MMM d, yyyy')}` : 'N/A'}</p>
                    </div>
                </section>

                <section className="my-8">
                    <table className="w-full">
                        <thead className="bg-muted">
                            <tr>
                                <th className="p-3 text-left font-semibold">Description</th>
                                <th className="p-3 text-center font-semibold">Rate</th>
                                <th className="p-3 text-center font-semibold">Hours</th>
                                <th className="p-3 text-right font-semibold">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Check for modern structure with breakdown */}
                            { (invoice.totalHoursGroup || 0) > 0 && (
                                <tr className="border-b">
                                    <td className="p-3">
                                        <p className="font-bold">Group Sessions</p>
                                        <p className="text-sm text-muted-foreground">Teaching Services (Group Mode)</p>
                                    </td>
                                    <td className="p-3 text-center font-mono">₹{(invoice.hourlyRateGroup || invoice.hourlyRate || 0).toFixed(2)}/hr</td>
                                    <td className="p-3 text-center font-mono">{(invoice.totalHoursGroup || 0).toFixed(2)}</td>
                                    <td className="p-3 text-right font-mono">₹{((invoice.totalHoursGroup || 0) * (invoice.hourlyRateGroup || invoice.hourlyRate || 0)).toFixed(2)}</td>
                                </tr>
                            )}

                            { (invoice.totalHoursOneToOne || 0) > 0 && (
                                <tr className="border-b">
                                    <td className="p-3">
                                        <p className="font-bold">One-to-One Sessions</p>
                                        <p className="text-sm text-muted-foreground">Teaching Services (Personal Mode)</p>
                                    </td>
                                    <td className="p-3 text-center font-mono">₹{(invoice.hourlyRateOneToOne || invoice.hourlyRate || 0).toFixed(2)}/hr</td>
                                    <td className="p-3 text-center font-mono">{(invoice.totalHoursOneToOne || 0).toFixed(2)}</td>
                                    <td className="p-3 text-right font-mono">₹{((invoice.totalHoursOneToOne || 0) * (invoice.hourlyRateOneToOne || invoice.hourlyRate || 0)).toFixed(2)}</td>
                                </tr>
                            )}

                            {/* Fallback for legacy invoices without mode breakdown */}
                            { !(invoice.totalHoursGroup || invoice.totalHoursOneToOne) && (
                                <tr className="border-b">
                                    <td className="p-3">
                                        <p className="font-bold">Teaching Services Rendered</p>
                                        <p className="text-sm text-muted-foreground">Standard Teaching Session</p>
                                    </td>
                                    <td className="p-3 text-center font-mono">₹{(invoice.hourlyRate || 0).toFixed(2)}/hr</td>
                                    <td className="p-3 text-center font-mono">{(invoice.totalHours || 0).toFixed(2)}</td>
                                    <td className="p-3 text-right font-mono">₹{(invoice.amount || 0).toFixed(2)}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </section>

                <section className="flex justify-end my-8">
                    <div className="w-full max-w-xs space-y-2">
                        <div className="flex justify-between items-center font-bold text-2xl bg-primary text-primary-foreground p-4 rounded-lg">
                            <span className="text-base uppercase tracking-wider">Total Paid</span>
                            <span className="font-mono">₹{invoice.amount.toFixed(2)}</span>
                        </div>
                    </div>
                </section>

                <footer className="text-center text-muted-foreground text-xs pt-8 border-t">
                    <p>Thank you for your service!</p>
                    <p>If you have any questions about this invoice, please contact us at support@kanakkmash.com</p>
                </footer>
            </div>
            
            <div className="flex justify-center gap-4 mt-8 print-hide">
                <Button onClick={handlePrint}>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                </Button>
            </div>
        </div>
    );
}

export default function SalaryInvoicePage() {
    return (
        <div className="p-4 sm:p-8">
            <SalaryInvoicePageContents />
        </div>
    );
}
