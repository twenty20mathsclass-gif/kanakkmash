'use client';

import { Reveal } from '@/components/shared/reveal';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Plus, BookPlus, IndianRupee, History, Package, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';

export default function AdminShopDashboard() {
  const stats = [
    { label: "Total Revenue", value: "₹ 1,42,250", icon: TrendingUp, color: "text-green-500", bg: "bg-green-50" },
    { label: "Active Orders", value: "48", icon: Package, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Total Products", value: "12", icon: ShoppingBag, color: "text-primary", bg: "bg-primary/5" },
    { label: "New Students", value: "124", icon: Users, color: "text-purple-500", bg: "bg-purple-50" },
  ];

  return (
    <div className="p-6 space-y-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black font-headline tracking-tight uppercase">Shop Management</h1>
          <p className="text-slate-500 font-medium">Control your curriculum products and track student transactions.</p>
        </div>
        <div className="flex items-center gap-3">
           <Button asChild className="rounded-2xl h-14 px-8 bg-slate-900 text-white font-black uppercase tracking-wider text-xs gap-3">
              <Link href="/admin/shop/products/add">
                 <Plus className="h-4 w-4" />
                 New Product
              </Link>
           </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
         {stats.map((stat, i) => (
           <Reveal key={i} delay={i * 0.1}>
             <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-black/5 flex items-center justify-between group transition-all hover:-translate-y-1">
                <div className="space-y-1">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{stat.label}</p>
                   <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
                   <stat.icon className="h-6 w-6" />
                </div>
             </div>
           </Reveal>
         ))}
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <Reveal delay={0.4}>
            <Link href="/admin/shop/products" className="group relative bg-white border border-slate-100 p-10 rounded-[3rem] shadow-2xl shadow-black/5 block transition-all hover:border-primary/20">
               <div className="absolute top-10 right-10 opacity-10 group-hover:opacity-20 transition-opacity">
                  <ShoppingBag className="h-24 w-24 text-primary" />
               </div>
               <div className="space-y-6">
                  <div className="h-16 w-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary transition-transform group-hover:rotate-12">
                     <BookPlus className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                     <h3 className="text-2xl font-black font-headline uppercase">Product Management</h3>
                     <p className="text-slate-500 font-medium leading-relaxed max-w-sm">List, edit, and create your world-class curriculum modules and educational products.</p>
                  </div>
                  <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest pt-4">
                     Manage Collection
                     <MoveLeft className="h-4 w-4 rotate-180" />
                  </div>
               </div>
            </Link>
         </Reveal>

         <Reveal delay={0.5}>
            <Link href="/admin/shop/orders" className="group relative bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-2xl shadow-slate-900/10 block transition-all hover:bg-slate-800">
               <div className="absolute top-10 right-10 opacity-10 group-hover:opacity-20 transition-opacity">
                  <History className="h-24 w-24 text-white" />
               </div>
               <div className="space-y-6">
                  <div className="h-16 w-16 rounded-[1.5rem] bg-white/10 flex items-center justify-center text-white transition-transform group-hover:rotate-12">
                     <IndianRupee className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                     <h3 className="text-2xl font-black font-headline uppercase text-white">Order Tracking</h3>
                     <p className="text-slate-400 font-medium leading-relaxed max-w-sm">Monitor student enrollments, check transaction statuses, and track revenue metrics in real-time.</p>
                  </div>
                  <div className="flex items-center gap-2 text-white font-black uppercase text-[10px] tracking-widest pt-4">
                     View All Orders
                     <MoveLeft className="h-4 w-4 rotate-180" />
                  </div>
               </div>
            </Link>
         </Reveal>
      </div>
    </div>
  );
}

function MoveLeft({ className, ...props }: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
    </svg>
  );
}
