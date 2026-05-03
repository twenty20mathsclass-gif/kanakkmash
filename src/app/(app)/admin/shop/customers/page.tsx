'use client';

import { Reveal } from '@/components/shared/reveal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search, MoveLeft, Users, MapPin, IndianRupee, Loader2, Download, Package, Eye, X, History, Clock
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { firestore as db } from '@/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

type Customer = {
  phone: string;
  name: string;
  address: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: any;
  orders: any[];
};

function CustomerHistoryModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-5 right-5 h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
          <X className="h-4 w-4 text-slate-500" />
        </button>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-lg shrink-0">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 leading-none">{customer.name}</h2>
            <p className="text-sm font-bold text-slate-500 mt-1 flex items-center gap-2">
              {customer.phone}
            </p>
          </div>
        </div>

        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
          <History className="h-3.5 w-3.5" /> Order History ({customer.orders.length})
        </h3>

        <ScrollArea className="h-[350px] pr-4">
          <div className="space-y-4">
            {customer.orders.map((order) => (
              <div key={order.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3 pb-3 border-b border-slate-200/50">
                  <div>
                    <Badge variant={order.status === 'completed' ? 'default' : 'secondary'} className="uppercase text-[8px] font-black tracking-widest mb-1.5">
                      {order.status || 'Pending'}
                    </Badge>
                    <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {order.createdAt?.toDate ? new Date(order.createdAt.toDate()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown'}
                    </p>
                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">ID: {order.id}</p>
                  </div>
                  <div className="flex items-center font-black text-slate-900 text-base bg-white px-3 py-1 rounded-xl shadow-sm border border-slate-100 self-start sm:self-auto">
                    <IndianRupee className="h-3 w-3 text-primary" strokeWidth={4} />
                    {order.total?.toLocaleString('en-IN')}
                  </div>
                </div>
                
                <div className="space-y-2 pl-1">
                  {order.items?.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-5 w-5 rounded-full bg-slate-200/50 flex items-center justify-center shrink-0">
                        <span className="text-[9px] font-black text-slate-600">{item.quantity}x</span>
                      </div>
                      <p className="text-xs font-bold text-slate-700 truncate">
                        {item.product?.title || 'Unknown Product'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    if (!db) { setLoading(false); return; }
    const q = query(collection(db, 'shop_orders'), orderBy('createdAt', 'desc'));
    
    const unsub = onSnapshot(q, (snap) => {
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      const customerMap = new Map<string, Customer>();
      
      orders.forEach(order => {
        if (!order.phone) return;
        
        const orderAmount = order.status === 'completed' ? (order.total || 0) : 0;
        
        if (customerMap.has(order.phone)) {
          const existing = customerMap.get(order.phone)!;
          customerMap.set(order.phone, {
            ...existing,
            totalOrders: existing.totalOrders + 1,
            totalSpent: existing.totalSpent + orderAmount,
            orders: [...existing.orders, order]
          });
        } else {
          customerMap.set(order.phone, {
            phone: order.phone,
            name: order.name || 'Unknown',
            address: order.address || 'No Address',
            totalOrders: 1,
            totalSpent: orderAmount,
            lastOrderDate: order.createdAt,
            orders: [order]
          });
        }
      });
      
      setCustomers(Array.from(customerMap.values()));
      setLoading(false);
    }, (err) => {
      console.error('Error fetching customers:', err);
      setLoading(false);
    });
    
    return () => unsub();
  }, []);

  const handleDownload = () => {
    const rows = [
      ['Name', 'Phone', 'Address', 'Total Orders', 'Total Spent', 'Last Order Date'],
      ...filteredCustomers.map(c => [
        c.name,
        c.phone,
        c.address,
        c.totalOrders,
        c.totalSpent,
        c.lastOrderDate?.toDate ? new Date(c.lastOrderDate.toDate()).toLocaleDateString() : 'Unknown'
      ])
    ];
    
    const csv = rows.map(r => r.map(String).map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = 'customers_list.csv'; 
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm)
    );
  }, [customers, searchTerm]);

  return (
    <div className="p-4 sm:p-6 space-y-8 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest mb-2">
            <button onClick={() => router.push('/admin/shop')} className="hover:underline flex items-center gap-1 group">
              <MoveLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />Shop
            </button>
            <span>/</span>
            <span className="text-slate-400 uppercase">Customers</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-headline tracking-tighter uppercase leading-none">Customer Records</h1>
          <p className="text-slate-500 font-medium text-sm">View details and order history of all users who have purchased from your shop.</p>
        </div>
        <Button
          variant="outline"
          onClick={handleDownload}
          className="rounded-2xl h-12 sm:h-14 px-6 sm:px-8 border-slate-100 flex gap-2 font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-50 w-fit"
        >
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search customers by name or phone number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-14 rounded-2xl bg-white border border-slate-100 pl-14 pr-6 focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-700 text-sm outline-none placeholder:text-slate-300 shadow-sm"
        />
      </div>

      {/* Customers List */}
      <Reveal>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary/20" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Loading Customers...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Users className="h-12 w-12 text-slate-200" />
              <p className="text-slate-400 font-bold text-sm">No customers found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
              {filteredCustomers.map((customer) => (
                <div key={customer.phone} className="bg-slate-50 rounded-3xl p-6 border border-slate-100 hover:border-primary/20 transition-all group flex flex-col h-full">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-lg shrink-0">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-lg leading-tight">{customer.name}</h3>
                      <p className="text-xs font-bold text-slate-500 mt-0.5">{customer.phone}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 flex-grow">
                    <div className="flex items-start gap-3 bg-white p-3 rounded-2xl border border-slate-100/50">
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-xs font-bold text-slate-600 line-clamp-2" title={customer.address}>{customer.address}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-2xl border border-slate-100/50 flex flex-col justify-center items-center text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Spent</p>
                        <div className="flex items-center font-black text-slate-900 text-sm">
                          <IndianRupee className="h-3 w-3" strokeWidth={3} />
                          {customer.totalSpent.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-2xl border border-slate-100/50 flex flex-col justify-center items-center text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Orders</p>
                        <div className="flex items-center gap-1 font-black text-slate-900 text-sm">
                          <Package className="h-3.5 w-3.5 text-primary" strokeWidth={3} />
                          {customer.totalOrders}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-5 border-t border-slate-200">
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedCustomer(customer)}
                      className="w-full rounded-xl bg-white hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all font-bold text-xs gap-2"
                    >
                      <Eye className="h-4 w-4" /> View Order History
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Reveal>

      {/* History Modal */}
      {selectedCustomer && (
        <CustomerHistoryModal 
          customer={selectedCustomer} 
          onClose={() => setSelectedCustomer(null)} 
        />
      )}
    </div>
  );
}
