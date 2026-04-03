'use client';

import { Reveal } from '@/components/shared/reveal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, Search, Filter, MoveLeft, Eye, Download, History, Package, Clock, Users, CheckCircle2, MoreVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';

export default function OrderTrackingPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  const mockOrders = [
    { id: "ORD-9421", student: "Arjun Sharma", course: "Advanced Calculus Framework", price: "2,250", date: "Oct 12, 2024", status: "Completed", email: "arjun@sharma.com" },
    { id: "ORD-9422", student: "Priya Nair", course: "Geometry Fundamentals", price: "2,250", date: "Oct 12, 2024", status: "Pending", email: "priya@nair.com" },
    { id: "ORD-9423", student: "Rahul Verma", course: "Statistics Introduction", price: "2,250", date: "Oct 11, 2024", status: "Completed", email: "rahul@v.com" },
    { id: "ORD-9424", student: "Sneha Reddy", course: "Advanced Calculus Framework", price: "2,250", date: "Oct 10, 2024", status: "Refunded", email: "sneha@r.com" },
  ];

  return (
    <div className="p-6 space-y-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest mb-2">
             <button onClick={() => router.push('/admin/shop')} className="hover:underline flex items-center gap-1 group">
                <MoveLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />
                Shop
             </button>
             <span>/</span>
             <span className="text-slate-400 uppercase">ORDERS</span>
          </div>
          <h1 className="text-3xl font-black font-headline tracking-tighter uppercase leading-none">Order Tracking</h1>
          <p className="text-slate-500 font-medium">Monitor every student enrollment and transaction within your academy.</p>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" className="rounded-2xl h-14 px-8 border-slate-100 flex gap-2 font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-50">
              <Download className="h-4 w-4" />
              Download Report
           </Button>
        </div>
      </div>

      {/* Modern Filter Section */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by student name or Order ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-16 rounded-3xl bg-white border border-slate-100 pl-16 pr-6 focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-600 outline-none placeholder:text-slate-300"
          />
        </div>
        <Button variant="outline" className="h-16 px-8 rounded-3xl border-slate-100 bg-white flex gap-2 text-slate-500 font-black uppercase text-[10px] tracking-widest">
           <Filter className="h-4 w-4" />
           Filter Status
        </Button>
      </div>

      {/* Orders Table Container */}
      <Reveal>
         <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-black/5 overflow-hidden">
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="border-b border-slate-50 bg-slate-50/50">
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Order ID</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Student Entity</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Course Resource</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Investment</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {mockOrders.map((order, i) => (
                        <tr key={order.id} className="group hover:bg-slate-50/50 transition-all font-medium text-slate-600 text-xs">
                           <td className="px-8 py-6">
                              <span className="font-black text-slate-900 leading-none">{order.id}</span>
                              <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-tight">{order.date}</p>
                           </td>
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-3">
                                 <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black text-[10px]">
                                    {order.student.charAt(0)}
                                 </div>
                                 <div className="space-y-0.5">
                                    <p className="font-black text-slate-900 leading-none">{order.student}</p>
                                    <p className="text-[9px] text-slate-400">{order.email}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-8 py-6 max-w-xs truncate uppercase tracking-tight font-black text-slate-800">
                              {order.course}
                           </td>
                           <td className="px-8 py-6">
                              <div className="flex items-center font-black text-slate-900 leading-none">
                                 <IndianRupee className="h-3 w-3" strokeWidth={3} />
                                 {order.price}
                              </div>
                           </td>
                           <td className="px-8 py-6">
                              <Badge className={`
                                 ${order.status === 'Completed' ? 'bg-green-50 text-green-600' : ''}
                                 ${order.status === 'Pending' ? 'bg-amber-50 text-amber-600' : ''}
                                 ${order.status === 'Refunded' ? 'bg-red-50 text-red-600' : ''}
                                 border-none text-[8px] font-black uppercase tracking-widest px-3 py-1
                              `}>
                                 {order.status}
                              </Badge>
                           </td>
                           <td className="px-8 py-6">
                              <div className="flex items-center justify-center gap-2">
                                 <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-white hover:shadow-xl transition-all">
                                    <Eye className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                                 </Button>
                                 <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-white hover:shadow-xl transition-all">
                                    <MoreVertical className="h-4 w-4 text-slate-300" />
                                 </Button>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      </Reveal>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
         <Reveal delay={0.2}>
             <div className="bg-slate-50 border border-slate-100 p-8 rounded-[2.5rem] flex items-center gap-6 group hover:translate-y-1 transition-all">
                 <div className="h-14 w-14 rounded-2xl bg-white shadow-xl shadow-black/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                     <CheckCircle2 className="h-6 w-6" strokeWidth={3} />
                 </div>
                 <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Success Rate</p>
                     <p className="text-2xl font-black text-slate-800 leading-none mt-1">94.2%</p>
                 </div>
             </div>
         </Reveal>
         <Reveal delay={0.3}>
             <div className="bg-slate-50 border border-slate-100 p-8 rounded-[2.5rem] flex items-center gap-6 group hover:translate-y-1 transition-all">
                 <div className="h-14 w-14 rounded-2xl bg-white shadow-xl shadow-black/5 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                     <Clock className="h-6 w-6" strokeWidth={3} />
                 </div>
                 <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Avg. Processing</p>
                     <p className="text-2xl font-black text-slate-800 leading-none mt-1">4.2m</p>
                 </div>
             </div>
         </Reveal>
         <Reveal delay={0.4}>
             <div className="bg-slate-50 border border-slate-100 p-8 rounded-[2.5rem] flex items-center gap-6 group hover:translate-y-1 transition-all">
                 <div className="h-14 w-14 rounded-2xl bg-white shadow-xl shadow-black/5 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                     <History className="h-6 w-6" strokeWidth={3} />
                 </div>
                 <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recent Growth</p>
                     <p className="text-2xl font-black text-slate-800 leading-none mt-1">+12.4%</p>
                 </div>
             </div>
         </Reveal>
      </div>
    </div>
  );
}
