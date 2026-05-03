'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useCart } from '@/context/cart-context';
import { Reveal } from '@/components/shared/reveal';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, ShieldCheck, CreditCard, Receipt, IndianRupee, ArrowLeft, Package, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

// Extend window for Razorpay
declare global {
    interface Window {
        Razorpay: any;
    }
}

function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
        if (typeof window !== 'undefined' && window.Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

export default function CartPaymentPage() {
    const router = useRouter();
    const { firestore } = useFirebase();
    const { clearCart } = useCart();
    const { toast } = useToast();

    const [checkoutData, setCheckoutData] = useState<any>(null);
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [scriptReady, setScriptReady] = useState(false);

    useEffect(() => {
        const data = localStorage.getItem('pending_checkout');
        if (data) {
            setCheckoutData(JSON.parse(data));
        } else {
            router.push('/cart');
        }

        // Preload Razorpay script
        loadRazorpayScript().then(setScriptReady);
    }, [router]);

    const handleSaveOrder = async (paymentId: string, razorpayOrderId: string) => {
        if (!firestore || !checkoutData) return;

        const orderData = {
            name: checkoutData.name,
            phone: checkoutData.phone,
            address: checkoutData.address,
            items: checkoutData.items,
            total: checkoutData.total,
            status: 'completed',
            paymentMethod: 'razorpay',
            razorpayPaymentId: paymentId,
            razorpayOrderId: razorpayOrderId,
            createdAt: serverTimestamp(),
        };

        await addDoc(collection(firestore, 'shop_orders'), orderData);
        clearCart();
        localStorage.removeItem('pending_checkout');
        setSuccess(true);
        toast({
            title: 'Payment Successful! 🎉',
            description: 'Your order has been confirmed.',
        });
    };

    const handlePayNow = async () => {
        if (!checkoutData) return;

        if (!scriptReady) {
            const loaded = await loadRazorpayScript();
            if (!loaded) {
                toast({
                    title: 'Payment Gateway Error',
                    description: 'Could not load Razorpay. Please check your internet connection.',
                    variant: 'destructive',
                });
                return;
            }
        }

        setProcessing(true);

        try {
            // 1. Create Razorpay order on backend
            const response = await fetch('/api/razorpay/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: checkoutData.total,
                    currency: 'INR',
                    receipt: `order_${checkoutData.phone}_${Date.now()}`,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create payment order');
            }

            const { orderId, amount } = await response.json();

            // 2. Open Razorpay Checkout
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount,
                currency: 'INR',
                name: 'Kanakkmash Academy',
                description: `Order for ${checkoutData.name}`,
                order_id: orderId,
                prefill: {
                    name: checkoutData.name,
                    contact: checkoutData.phone,
                },
                theme: {
                    color: '#F97316',
                },
                handler: async (response: any) => {
                    // 3. Verify payment signature server-side
                    try {
                        const verifyRes = await fetch('/api/razorpay/verify-payment', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                            }),
                        });

                        const data = await verifyRes.json();

                        if (verifyRes.ok && data.verified) {
                            // 4. Save order to Firestore on success
                            await handleSaveOrder(response.razorpay_payment_id, response.razorpay_order_id);
                        } else {
                            throw new Error(data.error || 'Payment signature verification failed');
                        }
                    } catch (err: any) {
                        console.error('Verification Error:', err);
                        toast({
                            title: 'Verification Failed',
                            description: err.message || 'Payment was received but could not be verified. Please contact support.',
                            variant: 'destructive',
                        });
                    }
                    setProcessing(false);
                },
                modal: {
                    ondismiss: () => {
                        setProcessing(false);
                        toast({
                            title: 'Payment Cancelled',
                            description: 'You closed the payment window. Your cart is still saved.',
                        });
                    },
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', (response: any) => {
                setProcessing(false);
                toast({
                    title: 'Payment Failed',
                    description: response.error?.description || 'Transaction could not be completed.',
                    variant: 'destructive',
                });
            });
            rzp.open();

        } catch (error: any) {
            console.error('Payment error:', error);
            setProcessing(false);
            toast({
                title: 'Payment Error',
                description: error.message || 'Something went wrong. Please try again.',
                variant: 'destructive',
            });
        }
    };

    if (!checkoutData) return null;

    // --- Success State ---
    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4 py-24">
                <Reveal>
                    <div className="text-center max-w-lg mx-auto">
                        <div className="relative h-36 w-36 mx-auto mb-10">
                            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-30" />
                            <div className="relative h-36 w-36 bg-green-50 rounded-full flex items-center justify-center border-4 border-green-100 shadow-2xl shadow-green-500/20">
                                <CheckCircle2 className="h-20 w-20 text-green-500" />
                            </div>
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black font-headline uppercase mb-4 text-slate-900">Payment Successful!</h1>
                        <p className="text-slate-500 font-medium text-lg mb-2">Thank you, <span className="font-black text-slate-800">{checkoutData.name}</span>!</p>
                        <p className="text-slate-400 font-medium mb-10 text-sm leading-relaxed max-w-sm mx-auto">
                            Your order has been placed successfully. Your courses will be unlocked shortly.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button
                                onClick={() => router.push('/shop')}
                                className="h-14 px-8 rounded-full font-bold text-base bg-slate-900 text-white hover:bg-slate-800 shadow-xl"
                            >
                                Continue Shopping
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => router.push('/cart')}
                                className="h-14 px-8 rounded-full font-bold text-base border-slate-200 hover:bg-slate-50"
                            >
                                View Order History
                            </Button>
                        </div>
                    </div>
                </Reveal>
            </div>
        );
    }

    // --- Payment Page ---
    return (
        <div className="min-h-screen bg-[#FAFAFA] py-24 px-4 pb-32">
            <div className="container max-w-2xl mx-auto">

                {/* Back */}
                <Reveal>
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full font-bold px-4 h-10 transition-colors mb-8 -ml-4"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Cart
                    </Button>
                </Reveal>

                {/* Page Title */}
                <Reveal>
                    <div className="text-center mb-10">
                        <h1 className="text-3xl sm:text-5xl font-black font-headline tracking-tighter uppercase mb-3 break-words">Secure Checkout</h1>
                        <p className="text-slate-500 font-medium flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm">
                            <ShieldCheck className="h-4 w-4 text-green-500 shrink-0" />
                            <span>256-bit SSL encrypted &bull; Powered by Razorpay</span>
                        </p>
                    </div>
                </Reveal>

                <div className="space-y-5">
                    {/* Order Summary */}
                    <Reveal delay={0.1}>
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
                            <h2 className="text-base font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2">
                                <Package className="h-4 w-4" /> Order Summary
                            </h2>
                            <div className="space-y-3">
                                {checkoutData.items?.map((item: any, i: number) => {
                                    const img = item.product.images?.[0] || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=400';
                                    return (
                                        <div key={i} className="flex items-center gap-4">
                                            <div className="relative h-14 w-14 rounded-xl overflow-hidden shrink-0 bg-slate-50 border border-slate-100">
                                                <Image src={img} alt={item.product.title} fill className="object-cover" />
                                            </div>
                                            <div className="flex-grow">
                                                <p className="font-bold text-slate-800 text-sm leading-snug line-clamp-1">{item.product.title}</p>
                                                <p className="text-xs text-slate-400 font-medium">Qty: {item.quantity}</p>
                                            </div>
                                            <div className="flex items-center font-black text-slate-900 shrink-0 text-sm">
                                                <IndianRupee className="h-3 w-3" strokeWidth={3} />
                                                {(item.product.price * item.quantity).toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-5 pt-5 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-sm font-black uppercase tracking-widest text-slate-400">Total Payable</span>
                                <div className="flex items-center font-black text-3xl text-slate-900">
                                    <IndianRupee className="h-5 w-5 text-primary" strokeWidth={4} />
                                    {checkoutData.total?.toLocaleString('en-IN')}
                                </div>
                            </div>
                        </div>
                    </Reveal>

                    {/* Delivery Info */}
                    <Reveal delay={0.15}>
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
                            <h2 className="text-base font-black uppercase tracking-widest text-slate-400 mb-4">Delivery Details</h2>
                            <div className="space-y-2 text-sm">
                                <div className="flex gap-3">
                                    <span className="font-black text-slate-400 w-20 shrink-0">Name</span>
                                    <span className="font-bold text-slate-800">{checkoutData.name}</span>
                                </div>
                                <div className="flex gap-3">
                                    <span className="font-black text-slate-400 w-20 shrink-0">Phone</span>
                                    <span className="font-bold text-slate-800">{checkoutData.phone}</span>
                                </div>
                                <div className="flex gap-3">
                                    <span className="font-black text-slate-400 w-20 shrink-0">Address</span>
                                    <span className="font-bold text-slate-800">{checkoutData.address}</span>
                                </div>
                            </div>
                        </div>
                    </Reveal>

                    {/* Payment Method */}
                    <Reveal delay={0.2}>
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
                            <h2 className="text-base font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                <CreditCard className="h-4 w-4" /> Payment Method
                            </h2>
                            <div className="flex items-center gap-4 p-4 border-2 border-primary/40 bg-primary/5 rounded-2xl">
                                <div className="h-10 w-10 bg-[#072654] rounded-xl flex items-center justify-center shrink-0">
                                    {/* Razorpay logo placeholder */}
                                    <span className="text-white font-black text-xs">RP</span>
                                </div>
                                <div>
                                    <p className="font-black text-slate-900 text-sm">Razorpay</p>
                                    <p className="text-xs text-slate-500 font-medium">UPI, Cards, Netbanking, Wallets & more</p>
                                </div>
                                <div className="ml-auto h-5 w-5 rounded-full border-4 border-primary bg-white shrink-0" />
                            </div>
                            <div className="flex items-start gap-2 mt-3 text-slate-400 text-xs font-medium">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <span>Your payment info is securely processed by Razorpay. We never store your card details.</span>
                            </div>
                        </div>
                    </Reveal>

                    {/* CTA Button */}
                    <Reveal delay={0.25}>
                        <Button
                            onClick={handlePayNow}
                            disabled={processing}
                            className="w-full h-16 rounded-full bg-primary text-white font-black text-lg shadow-2xl shadow-primary/25 hover:bg-primary/90 hover:scale-[1.01] transition-all active:scale-[0.99] group"
                        >
                            {processing ? (
                                <><Loader2 className="mr-3 h-5 w-5 animate-spin" /> Processing Payment...</>
                            ) : (
                                <>Pay ₹{checkoutData.total?.toLocaleString('en-IN')} Securely</>
                            )}
                        </Button>

                        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-4 text-slate-400 text-center">
                            <ShieldCheck className="h-4 w-4 text-green-500 shrink-0" />
                            <p className="text-[10px] sm:text-xs font-medium">Safe & Secure &bull; 100% Encrypted &bull; Powered by Razorpay</p>
                        </div>
                    </Reveal>
                </div>
            </div>
        </div>
    );
}
