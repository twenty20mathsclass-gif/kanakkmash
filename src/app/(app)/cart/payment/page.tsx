'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useCart } from '@/context/cart-context';
import { Reveal } from '@/components/shared/reveal';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, ShieldCheck, CreditCard, Receipt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CartPaymentPage() {
    const router = useRouter();
    const { firestore } = useFirebase();
    const { clearCart } = useCart();
    const { toast } = useToast();

    const [checkoutData, setCheckoutData] = useState<any>(null);
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const data = localStorage.getItem('pending_checkout');
        if (data) {
            setCheckoutData(JSON.parse(data));
        } else {
            router.push('/cart');
        }
    }, [router]);

    const handleConfirmPayment = async () => {
        if (!firestore || !checkoutData) return;
        setProcessing(true);

        try {
            // 1. Save order to Firestore
            const orderData = {
                name: checkoutData.name,
                phone: checkoutData.phone,
                address: checkoutData.address,
                items: checkoutData.items,
                total: checkoutData.total,
                status: 'completed',
                paymentMethod: 'mock_gateway',
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(firestore, 'shop_orders'), orderData);

            // 2. Clear Cart & Storage
            clearCart();
            localStorage.removeItem('pending_checkout');

            // 3. Show Success State
            setSuccess(true);
            toast({
                title: 'Order Confirmed!',
                description: 'Your purchase was successful.',
            });

        } catch (error) {
            console.error("Error processing payment:", error);
            toast({
                title: 'Payment Failed',
                description: 'There was an issue processing your order.',
                variant: 'destructive',
            });
            setProcessing(false);
        }
    };

    if (!checkoutData) return null;

    if (success) {
        return (
            <div className="container max-w-3xl mx-auto px-4 py-32 text-center flex flex-col items-center">
                <Reveal>
                    <div className="h-32 w-32 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-green-100 shadow-2xl shadow-green-500/20">
                        <CheckCircle2 className="h-16 w-16 text-green-500" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black font-headline uppercase mb-4 text-slate-900">Payment Successful</h1>
                    <p className="text-slate-500 font-medium text-lg mb-12 max-w-lg mx-auto">
                        Thank you for your purchase! Your order has been placed successfully and your courses will be unlocked shortly.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <Button 
                            onClick={() => router.push('/dashboard')} 
                            className="h-14 px-8 rounded-full font-bold text-base bg-slate-900 text-white hover:bg-slate-800"
                        >
                            Go to Dashboard
                        </Button>
                        <Button 
                            variant="outline"
                            onClick={() => router.push('/cart')} 
                            className="h-14 px-8 rounded-full font-bold text-base"
                        >
                            View Order History
                        </Button>
                    </div>
                </Reveal>
            </div>
        );
    }

    return (
        <div className="container max-w-3xl mx-auto px-4 py-24 pb-32">
            <Reveal>
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-black font-headline tracking-tighter uppercase mb-4">SECURE CHECKOUT</h1>
                    <p className="text-slate-500 font-medium text-lg flex items-center justify-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-green-500" />
                        256-bit SSL encrypted secure transaction
                    </p>
                </div>
            </Reveal>

            <Reveal delay={0.1}>
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100 p-8">
                    <div className="flex items-center gap-4 mb-8 pb-8 border-b border-slate-100">
                        <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0">
                            <Receipt className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Total Amount Payable</p>
                            <h2 className="text-4xl font-black font-headline text-slate-900">₹ {checkoutData.total.toLocaleString('en-IN')}</h2>
                        </div>
                    </div>

                    <div className="space-y-6 mb-10">
                        <div className="bg-slate-50 rounded-2xl p-6">
                            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-slate-400" />
                                Payment Method
                            </h3>
                            <div className="border-2 border-primary bg-primary/5 rounded-xl p-4 flex items-center justify-between cursor-pointer">
                                <div className="font-bold text-primary">Mock Payment Gateway</div>
                                <div className="h-4 w-4 rounded-full border-4 border-primary bg-white"></div>
                            </div>
                            <p className="text-xs text-slate-500 mt-4 font-medium leading-relaxed">
                                This is a simulated payment page. Clicking confirm will bypass actual payment processing and instantly create your order in the database for demonstration purposes.
                            </p>
                        </div>
                    </div>

                    <Button 
                        onClick={handleConfirmPayment}
                        disabled={processing}
                        className="w-full h-16 rounded-full bg-primary text-white font-black text-lg shadow-2xl shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] transition-all"
                    >
                        {processing ? (
                            <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> PROCESSING TRANSACTION...</>
                        ) : (
                            `PAY ₹${checkoutData.total.toLocaleString('en-IN')} NOW`
                        )}
                    </Button>
                </div>
            </Reveal>
        </div>
    );
}
