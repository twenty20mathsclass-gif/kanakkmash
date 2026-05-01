'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirebase } from '@/firebase';
import {
  collection, onSnapshot, query, orderBy, getDocs,
  addDoc, serverTimestamp, deleteDoc, doc
} from 'firebase/firestore';
import { Reveal } from '@/components/shared/reveal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, TrendingDown, IndianRupee, ShoppingBag,
  GraduationCap, Users, Receipt, Banknote, Plus, Trash2,
  Loader2, ArrowUpRight, ArrowDownRight, BarChart3, X,
  FileText, CalendarDays, Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Expense = {
  id: string;
  label: string;
  amount: number;
  category: string;
  createdAt: any;
};

type InvoiceRow = {
  id: string;
  label: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  subCategory?: string; // courseModel | level | competitiveExam | expense-category
  date: any;
  status?: string;
};

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function fmtDate(ts: any) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const EXPENSE_CATEGORIES = ['Advertisement', 'Software & Tools', 'Infrastructure', 'Marketing', 'Utilities', 'Other'];

function AddExpenseModal({ onClose, onAdd }: { onClose: () => void; onAdd: (label: string, amount: number, category: string) => void }) {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label || !amount || isNaN(Number(amount))) return;
    onAdd(label, Number(amount), category);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black uppercase tracking-tight">Add Expense</h2>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Description</label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Google Ads - May" className="rounded-xl" required />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Amount (₹)</label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="rounded-xl" required />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 bg-white focus:ring-2 focus:ring-primary/20 outline-none"
            >
              {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <Button type="submit" className="w-full rounded-full h-12 font-black">
          <Plus className="h-4 w-4 mr-2" /> Add Expense
        </Button>
      </form>
    </div>
  );
}

export default function AccountantDashboardPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSubCategory, setFilterSubCategory] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Raw data
  const [feeInvoices, setFeeInvoices] = useState<any[]>([]);
  const [shopOrders, setShopOrders] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<any[]>([]);
  const [promoterRewards, setPromoterRewards] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!firestore) { setLoading(false); return; }
    const unsubs: (() => void)[] = [];

    // 1. Student fee invoices
    unsubs.push(onSnapshot(query(collection(firestore, 'invoices'), orderBy('createdAt', 'desc')), snap => {
      setFeeInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }));

    // 2. Shop orders
    unsubs.push(onSnapshot(query(collection(firestore, 'shop_orders'), orderBy('createdAt', 'desc')), snap => {
      setShopOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }));

    // 3. Expenses
    unsubs.push(onSnapshot(query(collection(firestore, 'expenses'), orderBy('createdAt', 'desc')), snap => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
    }));

    // 4. Fetch all users, teachers salaries, promoter rewards
    const fetchAll = async () => {
      const allUsersSnap = await getDocs(collection(firestore, 'users'));
      const map: Record<string, any> = {};
      allUsersSnap.docs.forEach(d => { map[d.id] = { id: d.id, ...d.data() }; });
      setUsersMap(map);

      const allTeachers = Object.values(map).filter((u: any) => u.role === 'teacher');
      setTeachers(allTeachers);

      const allSalaries: any[] = [];
      const allRewards: any[] = [];

      await Promise.all(allTeachers.map(async (t: any) => {
        const salSnap = await getDocs(collection(firestore, 'users', t.id, 'salaryPayments'));
        salSnap.docs.forEach(d => allSalaries.push({ id: d.id, teacherName: t.name, teacherId: t.id, ...d.data() }));
      }));

      const promoters = Object.values(map).filter((u: any) => u.role === 'promoter');
      await Promise.all(promoters.map(async (p: any) => {
        const rwSnap = await getDocs(collection(firestore, 'users', p.id, 'rewards'));
        rwSnap.docs.forEach(d => allRewards.push({ id: d.id, promoterName: p.name, promoterId: p.id, ...d.data() }));
      }));

      setSalaryPayments(allSalaries);
      setPromoterRewards(allRewards);
      setLoading(false);
    };

    fetchAll();
    return () => unsubs.forEach(u => u());
  }, [firestore]);

  // Computed financials
  const metrics = useMemo(() => {
    const courseRevenue = feeInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0);
    const shopRevenue = shopOrders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.total || 0), 0);
    const totalRevenue = courseRevenue + shopRevenue;

    const totalSalaries = salaryPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalCommissions = promoterRewards.reduce((s, r) => s + (r.rewardAmount || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const totalDeductions = totalSalaries + totalCommissions + totalExpenses;
    const netProfit = totalRevenue - totalDeductions;

    return { courseRevenue, shopRevenue, totalRevenue, totalSalaries, totalCommissions, totalExpenses, totalDeductions, netProfit };
  }, [feeInvoices, shopOrders, salaryPayments, promoterRewards, expenses]);

  // Derive unique sub-category values for dropdowns
  const subCategoryOptions = useMemo(() => {
    const courseModels = new Set<string>();
    const levels = new Set<string>();
    const exams = new Set<string>();
    feeInvoices.forEach(i => {
      const u = usersMap[i.studentId];
      if (!u) return;
      if (u.courseModel) courseModels.add(u.courseModel);
      if (u.class) levels.add(u.class);
      if (u.level) levels.add(u.level);
      if (u.competitiveExam) exams.add(u.competitiveExam);
    });
    return { courseModels: [...courseModels], levels: [...levels], exams: [...exams] };
  }, [feeInvoices, usersMap]);

  // All invoices unified for the ledger view
  const allEntries: InvoiceRow[] = useMemo(() => {
    const entries: InvoiceRow[] = [
      ...feeInvoices.map(i => {
        const u = usersMap[i.studentId] || {};
        const subCat = u.competitiveExam || u.courseModel || u.class || u.level || '—';
        return {
          id: i.id,
          label: `Fee — ${u.name || 'Student'}${u.courseModel ? ` (${u.courseModel})` : ''}`,
          amount: i.amount || 0,
          type: 'income' as const,
          category: 'Course Fee',
          subCategory: subCat,
          date: i.createdAt,
          status: i.status,
        };
      }),
      ...shopOrders.map(o => ({
        id: o.id,
        label: `Shop Order — ${o.name || 'Customer'}`,
        amount: o.total || 0,
        type: 'income' as const,
        category: 'Shop Sale',
        subCategory: o.items?.[0]?.product?.title || 'Product',
        date: o.createdAt,
        status: o.status,
      })),
      ...salaryPayments.map(p => ({
        id: p.id,
        label: `Salary — ${p.teacherName || 'Teacher'}`,
        amount: p.amount || 0,
        type: 'expense' as const,
        category: 'Teacher Salary',
        subCategory: p.teacherName || '—',
        date: p.paymentDate || p.createdAt,
        status: 'paid',
      })),
      ...promoterRewards.map(r => ({
        id: r.id,
        label: `Commission — ${r.promoterName || 'Promoter'}`,
        amount: r.rewardAmount || 0,
        type: 'expense' as const,
        category: 'Promoter Commission',
        subCategory: r.promoterName || '—',
        date: r.createdAt,
        status: r.paidOut ? 'paid' : 'pending',
      })),
      ...expenses.map(e => ({
        id: e.id,
        label: e.label,
        amount: e.amount || 0,
        type: 'expense' as const,
        category: e.category,
        subCategory: e.category,
        date: e.createdAt,
        status: 'paid',
      })),
    ];
    return entries.sort((a, b) => {
      const da = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
      const db = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
      return db.getTime() - da.getTime();
    });
  }, [feeInvoices, shopOrders, salaryPayments, promoterRewards, expenses, usersMap]);

  const availableYears = useMemo(() => {
    const yrs = new Set<string>();
    allEntries.forEach(e => {
      const d = e.date?.toDate ? e.date.toDate() : new Date(e.date || 0);
      if (d) yrs.add(String(d.getFullYear()));
    });
    return [...yrs].sort((a, b) => Number(b) - Number(a));
  }, [allEntries]);

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const CATEGORY_OPTIONS = ['all','Course Fee','Shop Sale','Teacher Salary','Promoter Commission',...EXPENSE_CATEGORIES];

  const filteredEntries = useMemo(() => {
    return allEntries.filter(e => {
      const d = e.date?.toDate ? e.date.toDate() : new Date(e.date || 0);

      // Text search
      if (search) {
        const s = search.toLowerCase();
        if (!e.label.toLowerCase().includes(s) && !e.category.toLowerCase().includes(s) && !(e.subCategory || '').toLowerCase().includes(s)) return false;
      }
      // Category
      if (filterCategory !== 'all' && e.category !== filterCategory) return false;
      // Sub-category (courseModel / level / exam / expense category)
      if (filterSubCategory !== 'all' && e.subCategory !== filterSubCategory) return false;
      // Year
      if (filterYear !== 'all' && String(d.getFullYear()) !== filterYear) return false;
      // Month
      if (filterMonth !== 'all' && d.getMonth() !== Number(filterMonth)) return false;
      // Date range
      if (filterDateFrom) {
        const from = new Date(filterDateFrom); from.setHours(0,0,0,0);
        if (d < from) return false;
      }
      if (filterDateTo) {
        const to = new Date(filterDateTo); to.setHours(23,59,59,999);
        if (d > to) return false;
      }
      return true;
    });
  }, [allEntries, search, filterCategory, filterSubCategory, filterYear, filterMonth, filterDateFrom, filterDateTo]);

  const filteredTotal = useMemo(() => filteredEntries.reduce((s, e) => e.type === 'income' ? s + e.amount : s - e.amount, 0), [filteredEntries]);

  const activeFilterCount = [filterCategory !== 'all', filterSubCategory !== 'all', filterYear !== 'all', filterMonth !== 'all', filterDateFrom, filterDateTo].filter(Boolean).length;

  const handleAddExpense = async (label: string, amount: number, category: string) => {
    if (!firestore) return;
    try {
      await addDoc(collection(firestore, 'expenses'), { label, amount, category, createdAt: serverTimestamp() });
      toast({ title: 'Expense Added', description: `${label} recorded for ₹${amount.toLocaleString('en-IN')}` });
    } catch {
      toast({ title: 'Error', description: 'Failed to add expense.', variant: 'destructive' });
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'expenses', id));
      toast({ title: 'Expense Removed' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete expense.', variant: 'destructive' });
    }
  };

  const STAT_CARDS = [
    { label: 'Total Revenue', value: fmt(metrics.totalRevenue), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', sub: `Course Fee: ${fmt(metrics.courseRevenue)} + Shop: ${fmt(metrics.shopRevenue)}` },
    { label: 'Teacher Salaries', value: fmt(metrics.totalSalaries), icon: Banknote, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', sub: `${salaryPayments.length} payments recorded` },
    { label: 'Promoter Commission', value: fmt(metrics.totalCommissions), icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', sub: `${promoterRewards.length} rewards issued` },
    { label: 'Shop Revenue', value: fmt(metrics.shopRevenue), icon: ShoppingBag, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', sub: `${shopOrders.filter(o => o.status === 'completed').length} completed orders` },
    { label: 'Total Expenses', value: fmt(metrics.totalExpenses), icon: Receipt, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', sub: `${expenses.length} expense entries` },
    { label: 'Net Profit', value: fmt(metrics.netProfit), icon: metrics.netProfit >= 0 ? ArrowUpRight : ArrowDownRight, color: metrics.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600', bg: metrics.netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50', border: metrics.netProfit >= 0 ? 'border-emerald-100' : 'border-red-100', sub: 'Revenue − All Deductions' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary/30" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Financials...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest mb-2">
            <BarChart3 className="h-3 w-3" /> Accountant Dashboard
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-headline tracking-tighter uppercase">Financial Overview</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Complete financial picture of Kanakkmash Academy — revenues, deductions & net profit.</p>
        </div>
        <Button
          onClick={() => setShowExpenseModal(true)}
          className="rounded-2xl h-12 px-6 bg-slate-900 text-white font-black uppercase tracking-wider text-xs gap-2 w-fit"
        >
          <Plus className="h-4 w-4" /> Add Expense
        </Button>
      </div>

      {/* Revenue vs Expense Summary */}
      <Reveal>
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 sm:p-10 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-primary/10 blur-[100px] pointer-events-none" />
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-10 items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Total Revenue</p>
              <p className="text-3xl sm:text-4xl font-black font-headline">{fmt(metrics.totalRevenue)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Total Deductions</p>
              <p className="text-3xl sm:text-4xl font-black text-red-400">{fmt(metrics.totalDeductions)}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Net Profit</p>
              <p className={`text-3xl sm:text-4xl font-black ${metrics.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {metrics.netProfit >= 0 ? '+' : ''}{fmt(metrics.netProfit)}
              </p>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {STAT_CARDS.map((s, i) => (
          <Reveal key={i} delay={i * 0.07}>
            <div className={`bg-white rounded-3xl border ${s.border} p-6 flex items-start justify-between gap-4 shadow-sm hover:-translate-y-0.5 transition-all`}>
              <div className="space-y-1 flex-grow">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
                <p className="text-2xl font-black text-slate-900">{s.value}</p>
                <p className="text-[10px] text-slate-400 font-medium">{s.sub}</p>
              </div>
              <div className={`h-12 w-12 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center shrink-0`}>
                <s.icon className="h-6 w-6" />
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Expenses Management */}
      <Reveal>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between gap-4">
            <h2 className="font-black text-lg text-slate-900 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-red-500" /> Recorded Expenses
            </h2>
            <Button size="sm" variant="outline" onClick={() => setShowExpenseModal(true)} className="rounded-full gap-2 text-xs font-black border-slate-200">
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
          {expenses.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm font-medium">No expenses recorded yet.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {expenses.map(e => (
                <div key={e.id} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-9 w-9 rounded-xl bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                      <TrendingDown className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{e.label}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{e.category} · {fmtDate(e.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-slate-800 text-sm">{fmt(e.amount)}</span>
                    <button onClick={() => handleDeleteExpense(e.id)} className="h-7 w-7 rounded-full hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Reveal>

      {/* Full Ledger / All Invoices */}
      <Reveal>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Ledger Header */}
          <div className="p-5 border-b border-slate-50">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <h2 className="font-black text-lg text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Complete Ledger
                <Badge className="bg-slate-100 text-slate-500 border-none font-black text-[9px]">{filteredEntries.length}/{allEntries.length}</Badge>
              </h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-9 h-9 rounded-xl border-slate-200 text-sm w-44" />
                </div>
                <Button variant="outline" size="sm"
                  onClick={() => setShowFilters(v => !v)}
                  className={`rounded-xl h-9 px-4 font-black text-xs gap-2 border-slate-200 ${activeFilterCount > 0 ? 'border-primary text-primary bg-primary/5' : ''}`}
                >
                  <Search className="h-3.5 w-3.5" /> Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                </Button>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => { setFilterCategory('all'); setFilterSubCategory('all'); setFilterYear('all'); setFilterMonth('all'); setFilterDateFrom(''); setFilterDateTo(''); }} className="rounded-xl h-9 px-3 text-xs font-black text-slate-400 hover:text-red-500">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Category */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Category</p>
                  <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setFilterSubCategory('all'); }}
                    className="w-full h-9 rounded-xl border border-slate-200 px-2.5 text-xs font-bold text-slate-700 bg-white focus:ring-2 focus:ring-primary/20 outline-none">
                    {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
                  </select>
                </div>
                {/* Sub-category (only for Course Fee) */}
                {filterCategory === 'Course Fee' && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Course / Level / Exam</p>
                    <select value={filterSubCategory} onChange={e => setFilterSubCategory(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-200 px-2.5 text-xs font-bold text-slate-700 bg-white focus:ring-2 focus:ring-primary/20 outline-none">
                      <option value="all">All</option>
                      {subCategoryOptions.courseModels.length > 0 && <optgroup label="Course Model">{subCategoryOptions.courseModels.map(m => <option key={m}>{m}</option>)}</optgroup>}
                      {subCategoryOptions.levels.length > 0 && <optgroup label="Level / Class">{subCategoryOptions.levels.map(l => <option key={l}>{l}</option>)}</optgroup>}
                      {subCategoryOptions.exams.length > 0 && <optgroup label="Competitive Exam">{subCategoryOptions.exams.map(ex => <option key={ex}>{ex}</option>)}</optgroup>}
                    </select>
                  </div>
                )}
                {/* Year */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Year</p>
                  <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 px-2.5 text-xs font-bold text-slate-700 bg-white focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="all">All Years</option>
                    {availableYears.map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
                {/* Month */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Month</p>
                  <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 px-2.5 text-xs font-bold text-slate-700 bg-white focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="all">All Months</option>
                    {MONTHS.map((m, i) => <option key={m} value={String(i)}>{m}</option>)}
                  </select>
                </div>
                {/* Date From */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">From Date</p>
                  <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 px-2.5 text-xs font-bold text-slate-700 bg-white focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                {/* Date To */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">To Date</p>
                  <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 px-2.5 text-xs font-bold text-slate-700 bg-white focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
              </div>
            )}

            {/* Filtered total bar */}
            {(activeFilterCount > 0 || search) && (
              <div className="mt-3 flex items-center justify-between bg-slate-50 rounded-2xl px-4 py-2.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{filteredEntries.length} matching entries</p>
                <p className={`font-black text-sm ${filteredTotal >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  Net: {filteredTotal >= 0 ? '+' : ''}{fmt(Math.abs(filteredTotal))}
                </p>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Description</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Category</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredEntries.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-400 text-sm font-medium">No entries found.</td></tr>
                ) : filteredEntries.map(entry => (
                  <tr key={`${entry.type}-${entry.id}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs text-slate-500 font-bold whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-300" />
                        {fmtDate(entry.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-[220px]">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${entry.type === 'income' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                          {entry.type === 'income' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        </div>
                        <p className="font-bold text-slate-800 text-xs truncate">{entry.label}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <Badge className="bg-slate-100 text-slate-500 border-none font-black text-[8px] uppercase tracking-widest">
                          {entry.category}
                        </Badge>
                        {entry.subCategory && entry.subCategory !== entry.category && (
                          <p className="text-[9px] text-slate-400 font-bold truncate max-w-[120px]">{entry.subCategory}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={`border-none font-black text-[8px] uppercase tracking-widest ${
                        entry.status === 'paid' || entry.status === 'completed' ? 'bg-green-50 text-green-600' :
                        entry.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {entry.status || '—'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-black text-sm ${entry.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                        {entry.type === 'income' ? '+' : '−'}{fmt(entry.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>

      {showExpenseModal && (
        <AddExpenseModal
          onClose={() => setShowExpenseModal(false)}
          onAdd={handleAddExpense}
        />
      )}
    </div>
  );
}
