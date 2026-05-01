'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/cart-context';
import { useFirebase } from '@/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { IndianRupee, Minus, Plus, ShoppingCart, Trash2, ArrowRight, History, Package, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Reveal } from '@/components/shared/reveal';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function CartPage() {
    const { items, removeFromCart, updateQuantity, cartTotal } = useCart();
    const { firestore } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();

    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    
    const [orders, setOrders] = useState<any[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    const handleFetchOrders = async () => {
        if (!phone || phone.length < 10) {
            toast({
                title: "Invalid Phone Number",
                description: "Please enter a valid phone number to check orders.",
                variant: "destructive"
            });
            return;
        }

        if (!firestore) return;
        setLoadingOrders(true);
        
        try {
            const q = query(
                collection(firestore, 'shop_orders'),
                where('phone', '==', phone),
                orderBy('createdAt', 'desc')
            );
            
            const snapshot = await getDocs(q);
            const pastOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOrders(pastOrders);
            
            if (pastOrders.length > 0) {
                setName(pastOrders[0].name || '');
                setAddress(pastOrders[0].address || '');
                toast({
                    title: "History Found",
                    description: "We've fetched your past orders and autofilled your details."
                });
            } else {
                toast({
                    title: "No Orders Found",
                    description: "We couldn't find any previous orders for this number."
                });
            }
            
        } catch (error) {
            console.error("Error fetching orders:", error);
            toast({
                title: "Notice",
                description: "Could not fetch past orders right now."
            });
        } finally {
            setLoadingOrders(false);
        }
    };

    const handleCheckout = () => {
        if (items.length === 0) return;
        if (!name || !phone || !address) {
            toast({
                title: "Missing Information",
                description: "Please fill in your Name, Phone Number, and Address.",
                variant: "destructive"
            });
            return;
        }

        localStorage.setItem('pending_checkout', JSON.stringify({
            name,
            phone,
            address,
            items,
            total: cartTotal
        }));

        router.push('/cart/payment');
    };

    return (
        <div className="min-h-screen bg-[#FAFAFA] pb-32">
            <div className="container max-w-7xl mx-auto px-4 pt-24 sm:pt-32">
                <Reveal>
                    <div className="mb-10 sm:mb-16 text-center max-w-2xl mx-auto">
                        <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-[2rem] mb-6 shadow-sm border border-primary/20">
                            <ShoppingCart className="h-10 w-10 text-primary" strokeWidth={2.5} />
                        </div>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black font-headline tracking-tighter uppercase mb-6 text-slate-900">YOUR CART</h1>
                        <p className="text-slate-500 font-medium text-lg px-4 leading-relaxed">Review your items, securely checkout, or check your past order history using your phone number.</p>
                    </div>
                </Reveal>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-12 items-start">
                    {/* Left Column: Cart Items */}
                    <div className="xl:col-span-7 space-y-8 sticky top-32">
                        
                        <Reveal delay={0.1}>
                            <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-10 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-orange-400"></div>
                                <h2 className="text-2xl font-black font-headline mb-8 flex items-center gap-3 text-slate-900">
                                    Cart Items
                                    <Badge variant="secondary" className="rounded-full px-3 py-1 bg-slate-100 text-slate-600 font-bold ml-2">
                                        {items.length} Items
                                    </Badge>
                                </h2>
                                
                                {items.length === 0 ? (
                                    <div className="text-center py-16 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                                        <ShoppingCart className="h-16 w-16 text-slate-300 mx-auto mb-6" />
                                        <h3 className="text-2xl font-black font-headline text-slate-800">Your cart is empty</h3>
                                        <p className="text-slate-500 mt-3 font-medium">Looks like you haven't added anything yet.</p>
                                        <Button onClick={() => router.push('/products')} className="mt-8 rounded-full font-bold h-14 px-8 text-base shadow-lg shadow-primary/20">
                                            Browse Premium Courses
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        {items.map((item) => {
                                            const imageSrc = item.product.images?.[0] || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=800';
                                            return (
                                                <div key={item.product.id} className="group flex flex-col sm:flex-row gap-6 p-5 rounded-3xl bg-white border border-slate-100 shadow-sm hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 items-start sm:items-center">
                                                    <div className="relative h-32 w-full sm:w-32 rounded-2xl overflow-hidden shrink-0 bg-slate-50 border border-black/5">
                                                        <Image src={imageSrc} alt={item.product.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    </div>
                                                    
                                                    <div className="flex-grow w-full space-y-4 sm:space-y-0 sm:flex sm:justify-between sm:items-center">
                                                        <div className="space-y-2 sm:pr-4">
                                                            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none font-bold text-[9px] uppercase tracking-widest px-2 py-0.5 mb-2">Module</Badge>
                                                            <h4 className="font-black text-lg sm:text-xl text-slate-900 leading-tight">{item.product.title}</h4>
                                                            <div className="flex items-center text-primary font-black text-xl pt-1">
                                                                <IndianRupee className="h-4 w-4" strokeWidth={4} />
                                                                {item.product.price}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center justify-between sm:flex-col sm:items-end gap-4 shrink-0">
                                                            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-full px-2 py-1.5 shadow-sm">
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-8 w-8 rounded-full hover:bg-white shrink-0 shadow-sm border border-transparent hover:border-slate-200"
                                                                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                                                >
                                                                    <Minus className="h-4 w-4 text-slate-600" />
                                                                </Button>
                                                                <span className="text-base font-black w-6 text-center text-slate-900">{item.quantity}</span>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-8 w-8 rounded-full hover:bg-white shrink-0 shadow-sm border border-transparent hover:border-slate-200"
                                                                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                                                >
                                                                    <Plus className="h-4 w-4 text-slate-600" />
                                                                </Button>
                                                            </div>
                                                            
                                                            <Button 
                                                                variant="ghost" 
                                                                className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full px-4 text-xs font-bold gap-2 h-9"
                                                                onClick={() => removeFromCart(item.product.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                Remove
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </Reveal>

                    </div>

                    {/* Right Column: Order Form & History */}
                    <div className="xl:col-span-5 space-y-8">
                        <Reveal delay={0.2}>
                            <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-6 sm:p-10 relative overflow-hidden">
                                <h2 className="text-2xl font-black font-headline mb-8 text-slate-900 flex items-center gap-3">
                                    <Package className="h-6 w-6 text-primary" />
                                    Checkout Details
                                </h2>

                                <div className="space-y-6">
                                    <div className="space-y-2 bg-slate-50 p-5 rounded-3xl border border-slate-100">
                                        <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest pl-1">Phone Number</label>
                                        <div className="flex gap-3">
                                            <Input 
                                                placeholder="Enter mobile number" 
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="h-14 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-2xl focus-visible:ring-primary font-bold text-lg px-5 shadow-sm"
                                            />
                                            <Button 
                                                onClick={handleFetchOrders} 
                                                disabled={loadingOrders}
                                                className="h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white shadow-md font-bold px-6 shrink-0"
                                            >
                                                {loadingOrders ? '...' : <><Search className="h-4 w-4 mr-2 hidden sm:block" /> Check</>}
                                            </Button>
                                        </div>
                                        <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mt-3 pl-1">Enter phone to fetch past orders and autofill details.</p>
                                    </div>

                                    <div className="space-y-2 pl-1">
                                        <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Full Name</label>
                                        <Input 
                                            placeholder="Enter your name" 
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="h-14 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-2xl focus-visible:ring-primary focus-visible:bg-white font-bold px-5"
                                        />
                                    </div>

                                    <div className="space-y-2 pl-1">
                                        <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Full Address</label>
                                        <Textarea 
                                            placeholder="Enter your complete shipping address" 
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            className="min-h-[120px] bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-2xl focus-visible:ring-primary focus-visible:bg-white font-bold p-5 resize-none"
                                        />
                                    </div>

                                    <div className="pt-8 mt-8 border-t border-slate-100">
                                        <div className="flex justify-between items-end mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                            <span className="text-slate-500 font-black uppercase tracking-widest text-xs">Total Amount</span>
                                            <div className="flex items-center font-black font-headline text-4xl text-slate-900">
                                                <IndianRupee className="h-6 w-6 text-primary" strokeWidth={4} />
                                                {cartTotal}
                                            </div>
                                        </div>

                                        <Button 
                                            className="w-full h-16 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-xl shadow-primary/20 gap-2 group"
                                            onClick={handleCheckout}
                                            disabled={items.length === 0}
                                        >
                                            PROCEED TO PAYMENT
                                            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Reveal>

                        {/* Order History */}
                        <Reveal delay={0.3}>
                            <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-10 relative overflow-hidden">
                                <h2 className="text-xl font-black font-headline mb-6 flex items-center gap-3 text-slate-900">
                                    <History className="h-5 w-5 text-primary" />
                                    Previous Orders
                                </h2>

                                {orders.length === 0 ? (
                                    <div className="text-center py-10 bg-slate-50 rounded-3xl border border-slate-100">
                                        <Search className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-500 font-medium text-sm">Enter your phone number above to see past orders.</p>
                                    </div>
                                ) : (
                                    <ScrollArea className="h-[350px] pr-4">
                                        <div className="space-y-4">
                                            {orders.map((order) => (
                                                <div key={order.id} className="bg-slate-50 p-5 rounded-3xl border border-slate-100 hover:border-slate-200 transition-colors">
                                                    <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-200/50">
                                                        <div>
                                                            <Badge variant={order.status === 'completed' ? 'default' : 'secondary'} className="uppercase text-[9px] font-black tracking-widest mb-2 px-2 py-0.5 shadow-sm">
                                                                {order.status || 'Pending'}
                                                            </Badge>
                                                            <p className="text-xs text-slate-500 font-bold flex items-center gap-1.5">
                                                                <Clock className="h-3 w-3" />
                                                                {order.createdAt?.toDate ? new Date(order.createdAt.toDate()).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center font-black text-slate-900 text-lg bg-white px-3 py-1 rounded-xl shadow-sm border border-slate-100">
                                                            <IndianRupee className="h-3.5 w-3.5 text-primary" strokeWidth={4} />
                                                            {order.total}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2.5 pl-1">
                                                        {order.items?.map((item: any, i: number) => (
                                                            <div key={i} className="flex items-center gap-3">
                                                                <div className="h-6 w-6 rounded-full bg-slate-200/50 flex items-center justify-center shrink-0">
                                                                    <span className="text-[10px] font-black text-slate-600">{item.quantity}x</span>
                                                                </div>
                                                                <p className="text-sm font-bold text-slate-700 truncate">
                                                                    {item.product.title}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </div>
                        </Reveal>
                    </div>
                </div>
            </div>
        </div>
    );
}
