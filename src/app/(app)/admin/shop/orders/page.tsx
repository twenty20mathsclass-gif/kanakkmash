'use client';

import { Reveal } from '@/components/shared/reveal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  IndianRupee, Search, Filter, MoveLeft, Eye, Download,
  History, Clock, CheckCircle2, MoreVertical, Loader2,
  TrendingUp, Package, Phone, MapPin, X, ChevronDown
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { firestore as db } from '@/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

type Order = {
  id: string;
  name: string;
  phone: string;
  address: string;
  items: { product: { title: string; price: number }; quantity: number }[];
  total: number;
  status: string;
  paymentMethod: string;
  razorpayPaymentId?: string;
  createdAt: any;
};

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-50 text-green-700 border-green-100',
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  refunded: 'bg-red-50 text-red-700 border-red-100',
  failed: 'bg-slate-100 text-slate-500 border-slate-200',
};

function formatDate(ts: any) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function OrderDetailModal({ order, onClose, onStatusChange }: { order: Order; onClose: () => void; onStatusChange: (id: string, status: string) => void }) {
  const statuses = ['completed', 'pending', 'refunded', 'failed'];
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-5 right-5 h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
          <X className="h-4 w-4 text-slate-500" />
        </button>
        <h2 className="text-xl font-black uppercase tracking-tight mb-1 text-slate-900">{order.name}</h2>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Order ID: {order.id}</p>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-sm">
            <Phone className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="font-bold text-slate-700">{order.phone}</span>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <span className="font-bold text-slate-700">{order.address}</span>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 mb-6 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Items Ordered</p>
          {order.items?.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-[9px]">{item.quantity}x</div>
                <span className="text-xs font-bold text-slate-700 truncate max-w-[220px]">{item.product?.title}</span>
              </div>
              <div className="flex items-center text-xs font-black text-slate-900 shrink-0">
                <IndianRupee className="h-3 w-3" strokeWidth={3} />{(item.product?.price * item.quantity).toLocaleString('en-IN')}
              </div>
            </div>
          ))}
          <div className="flex justify-between items-center border-t border-slate-200 pt-3 mt-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total</span>
            <div className="flex items-center font-black text-base text-primary">
              <IndianRupee className="h-3.5 w-3.5" strokeWidth={3} />{order.total?.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {order.razorpayPaymentId && (
          <p className="text-[10px] font-bold text-slate-400 mb-4">
            Payment ID: <span className="text-slate-600">{order.razorpayPaymentId}</span>
          </p>
        )}

        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Update Status</p>
          <div className="flex flex-wrap gap-2">
            {statuses.map(s => (
              <button
                key={s}
                onClick={() => onStatusChange(order.id, s)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${order.status === s ? STATUS_COLORS[s] + ' ring-2 ring-offset-1 ring-current' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderTrackingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!db) { setLoading(false); return; }
    const q = query(collection(db, 'shop_orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      setOrders(data);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching orders:', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'shop_orders', orderId), { status: newStatus });
      setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      toast({ title: 'Status Updated', description: `Order marked as ${newStatus}.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' });
    }
  };

  const handleDownload = () => {
    const rows = [
      ['Order ID', 'Name', 'Phone', 'Address', 'Items', 'Total', 'Status', 'Payment ID', 'Date'],
      ...filteredOrders.map(o => [
        o.id, o.name, o.phone, o.address,
        o.items?.map(i => `${i.quantity}x ${i.product?.title}`).join('; ') || '',
        o.total, o.status, o.razorpayPaymentId || '', formatDate(o.createdAt)
      ])
    ];
    const csv = rows.map(r => r.map(String).map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'orders.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchSearch = o.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.phone?.includes(searchTerm);
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  // Live computed metrics
  const metrics = useMemo(() => {
    if (!orders.length) return { successRate: 0, totalRevenue: 0, totalOrders: 0 };
    const completed = orders.filter(o => o.status === 'completed').length;
    const successRate = Math.round((completed / orders.length) * 100);
    const totalRevenue = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (o.total || 0), 0);
    return { successRate, totalRevenue, totalOrders: orders.length };
  }, [orders]);

  return (
    <div className="p-4 sm:p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest mb-2">
            <button onClick={() => router.push('/admin/shop')} className="hover:underline flex items-center gap-1 group">
              <MoveLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />Shop
            </button>
            <span>/</span>
            <span className="text-slate-400 uppercase">Orders</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-headline tracking-tighter uppercase leading-none">Order Tracking</h1>
          <p className="text-slate-500 font-medium text-sm">Monitor every student enrollment and transaction within your academy.</p>
        </div>
        <Button
          variant="outline"
          onClick={handleDownload}
          className="rounded-2xl h-12 sm:h-14 px-6 sm:px-8 border-slate-100 flex gap-2 font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-50 w-fit"
        >
          <Download className="h-4 w-4" /> Download Report
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, phone or Order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-14 rounded-2xl bg-white border border-slate-100 pl-14 pr-6 focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-700 text-sm outline-none placeholder:text-slate-300 shadow-sm"
          />
        </div>
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setShowFilterMenu(v => !v)}
            className="h-14 px-6 rounded-2xl border-slate-100 bg-white flex gap-2 text-slate-500 font-black uppercase text-[10px] tracking-widest shadow-sm w-full sm:w-auto"
          >
            <Filter className="h-4 w-4" />
            {statusFilter === 'all' ? 'Filter Status' : statusFilter}
            <ChevronDown className="h-3.5 w-3.5 ml-1" />
          </Button>
          {showFilterMenu && (
            <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl z-20 overflow-hidden min-w-[160px]">
              {['all', 'completed', 'pending', 'refunded', 'failed'].map(s => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setShowFilterMenu(false); }}
                  className={`w-full text-left px-5 py-3 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-colors ${statusFilter === s ? 'text-primary bg-primary/5' : 'text-slate-500'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <Reveal>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary/20" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Fetching Orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Package className="h-12 w-12 text-slate-200" />
              <p className="text-slate-400 font-bold text-sm">No orders found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-50 bg-slate-50/70">
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Order ID</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Student</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap hidden md:table-cell">Course Resource</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Investment</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Status</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="group hover:bg-slate-50/50 transition-all">
                      <td className="px-6 py-5">
                        <span className="font-black text-slate-900 text-xs leading-none">{order.id.slice(0, 10).toUpperCase()}</span>
                        <p className="text-[9px] text-slate-400 mt-1 font-bold">{formatDate(order.createdAt)}</p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-[11px] shrink-0">
                            {order.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-xs leading-none whitespace-nowrap">{order.name}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5 font-bold">{order.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 hidden md:table-cell max-w-[200px]">
                        <p className="text-xs font-black text-slate-700 uppercase tracking-tight truncate">
                          {order.items?.[0]?.product?.title || '—'}
                          {order.items?.length > 1 && <span className="text-slate-400 font-medium"> +{order.items.length - 1} more</span>}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center font-black text-slate-900 text-xs">
                          <IndianRupee className="h-3 w-3" strokeWidth={3} />
                          {order.total?.toLocaleString('en-IN')}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <Badge className={`${STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-500'} border text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full`}>
                          {order.status || 'unknown'}
                        </Badge>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl hover:bg-white hover:shadow-md transition-all"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Reveal>

      {/* Live Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <Reveal delay={0.1}>
          <div className="bg-white border border-slate-100 p-6 rounded-3xl flex items-center gap-5 shadow-sm hover:-translate-y-0.5 transition-all">
            <div className="h-12 w-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-500 shrink-0">
              <CheckCircle2 className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Success Rate</p>
              <p className="text-2xl font-black text-slate-900 leading-none mt-1">{loading ? '...' : `${metrics.successRate}%`}</p>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="bg-white border border-slate-100 p-6 rounded-3xl flex items-center gap-5 shadow-sm hover:-translate-y-0.5 transition-all">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <IndianRupee className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Revenue</p>
              <p className="text-2xl font-black text-slate-900 leading-none mt-1">
                {loading ? '...' : `₹${metrics.totalRevenue.toLocaleString('en-IN')}`}
              </p>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.3}>
          <div className="bg-white border border-slate-100 p-6 rounded-3xl flex items-center gap-5 shadow-sm hover:-translate-y-0.5 transition-all">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
              <TrendingUp className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Orders</p>
              <p className="text-2xl font-black text-slate-900 leading-none mt-1">{loading ? '...' : metrics.totalOrders}</p>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
