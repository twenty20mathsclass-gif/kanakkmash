'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Reveal } from '@/components/shared/reveal';
import { Loader2, Inbox, History, BookText, Upload, ClipboardCheck, Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { useFirebase, useUser } from '@/firebase';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, collectionGroup, orderBy } from 'firebase/firestore';
import type { Schedule } from '@/lib/definitions';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { AttendanceDetails } from '@/components/teacher/attendance-details';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';

export default function HomeworkManagementPage() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const [homeworks, setHomeworks] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [subLoading, setSubLoading] = useState(true);
    const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    useEffect(() => {
        if (!firestore || !user) return;
        
        const q = query(
            collection(firestore, 'schedules'), 
            where('teacherId', '==', user.id),
            where('type', '==', 'homework')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule))
                .sort((a, b) => {
                    const timeA = (a.date || a.startDate || a.createdAt)?.toMillis() || 0;
                    const timeB = (b.date || b.startDate || b.createdAt)?.toMillis() || 0;
                    return timeB - timeA;
                });
            setHomeworks(list);
            setLoading(false);
        }, (error) => {
            console.error("Homeworks fetch error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, user]);

    useEffect(() => {
        if (!firestore || !user) return;
        
        // Fetch submissions via collection group for the aggregate tab
        const subQuery = query(
            collectionGroup(firestore, 'submissions'),
            where('teacherId', '==', user.id),
            orderBy('submittedAt', 'desc')
        );

        const unsubscribe = onSnapshot(subQuery, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSubmissions(list);
            setSubLoading(false);
        }, (error) => {
            console.error("Submissions fetch error:", error);
            setSubLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, user]);

    // Filtering logic
    const filteredHomeworks = homeworks.filter(hw => {
        const matchesSearch = hw.title?.toLowerCase().includes(searchTerm.toLowerCase());
        const cat = hw.homeworkType || hw.syllabus || 'N/A';
        const matchesCategory = categoryFilter === 'all' || cat.toLowerCase() === categoryFilter.toLowerCase();
        
        const hwDate = (hw.date || hw.startDate || hw.createdAt)?.toDate();
        const matchesDate = !dateFilter || (hwDate && isSameDay(hwDate, dateFilter));

        return matchesSearch && matchesCategory && matchesDate;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredHomeworks.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedHomeworks = filteredHomeworks.slice(startIndex, startIndex + itemsPerPage);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, categoryFilter, dateFilter]);

    return (
        <div className="space-y-8 pb-12">
            <Reveal>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black font-headline tracking-tight text-slate-900">Homework Management</h1>
                        <p className="text-muted-foreground font-medium">Monitor schedules, review student completions, and manage your academic reach.</p>
                    </div>
                </div>
            </Reveal>

            <Tabs defaultValue="overview" className="space-y-8">
                <Reveal>
                    <TabsList className="bg-slate-100/50 border border-slate-200/50 p-1 rounded-2xl h-14 inline-flex">
                        <TabsTrigger value="overview" className="gap-2 rounded-xl px-8 h-12 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all font-bold">
                            <History className="h-4 w-4" />
                            Live Management
                        </TabsTrigger>
                        <TabsTrigger value="submissions" className="gap-2 rounded-xl px-8 h-12 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all font-bold">
                            <Inbox className="h-4 w-4" />
                            Global Status
                        </TabsTrigger>
                    </TabsList>
                </Reveal>

                <TabsContent value="overview">
                    <Reveal>
                        {loading ? (
                            <div className="flex justify-center p-32">
                                <div className="relative">
                                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                    <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                                <div className="lg:col-span-5 space-y-6">
                                    <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-sm overflow-hidden p-6">
                                        <div className="flex items-center justify-between mb-8 px-2">
                                            <div>
                                                <h3 className="font-black text-xl font-headline leading-tight">Assigned H/W</h3>
                                                <p className="text-xs text-muted-foreground font-medium">Manage your active classroom tasks.</p>
                                            </div>
                                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                                <BookText className="h-5 w-5 text-primary" />
                                            </div>
                                        </div>

                                        {/* Filter Section */}
                                        <div className="space-y-4 mb-8">
                                            <div className="relative">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <Input 
                                                    placeholder="Search homework..." 
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="pl-12 h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold text-sm"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                                    <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-bold text-xs uppercase tracking-wider">
                                                        <div className="flex items-center gap-2">
                                                            <Filter className="h-3 w-3 text-primary" />
                                                            <SelectValue placeholder="Category" />
                                                        </div>
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                                                        <SelectItem value="all" className="font-bold">All Formats</SelectItem>
                                                        <SelectItem value="mcq" className="font-bold">MCQ Only</SelectItem>
                                                        <SelectItem value="descriptive" className="font-bold">Descriptive Only</SelectItem>
                                                    </SelectContent>
                                                </Select>

                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" className={cn(
                                                            "h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-bold text-xs uppercase tracking-wider justify-between px-4",
                                                            dateFilter && "text-primary border-primary/20 bg-primary/5"
                                                        )}>
                                                            <div className="flex items-center gap-2">
                                                                <CalendarIcon className="h-3 w-3" />
                                                                {dateFilter ? format(dateFilter, 'MMM dd, yyyy') : 'Pick Date'}
                                                            </div>
                                                            {dateFilter && <X className="h-3 w-3 hover:text-rose-500 transition-colors" onClick={(e) => { e.stopPropagation(); setDateFilter(undefined); }} />}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0 rounded-3xl overflow-hidden border-none shadow-2xl" align="end">
                                                        <Calendar
                                                            mode="single"
                                                            selected={dateFilter}
                                                            onSelect={setDateFilter}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>

                                        <div className="space-y-2 min-h-[400px]">
                                            {paginatedHomeworks.length > 0 ? paginatedHomeworks.map(hw => {
                                                const displayDate = (hw.date || hw.startDate || hw.createdAt)?.toDate();
                                                const isActive = selectedSchedule?.id === hw.id;
                                                const category = hw.homeworkType || hw.syllabus || 'N/A';
                                                return (
                                                    <button 
                                                        key={hw.id}
                                                        onClick={() => setSelectedSchedule(hw)}
                                                        className={cn(
                                                            "w-full text-left p-5 rounded-3xl border-2 transition-all duration-300 group",
                                                            isActive 
                                                                ? "bg-primary/[0.03] border-primary shadow-md translate-x-1" 
                                                                : "border-transparent hover:bg-slate-50 hover:border-slate-100"
                                                        )}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <p className={cn("font-bold text-sm transition-colors uppercase tracking-tight", isActive ? "text-primary" : "text-slate-800")}>{hw.title}</p>
                                                            <div className={cn(
                                                                "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border shrink-0",
                                                                category.toLowerCase() === 'mcq' ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-blue-50 border-blue-100 text-blue-600"
                                                            )}>
                                                                {category}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Scheduled for</p>
                                                            <div className="h-1 w-1 rounded-full bg-slate-200" />
                                                            <p className="text-[10px] font-bold text-slate-500">{displayDate ? format(displayDate, 'MMM dd, yyyy') : 'No Date'}</p>
                                                        </div>
                                                    </button>
                                                );
                                            }) : (
                                                <div className="py-20 text-center">
                                                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <Filter className="h-8 w-8 text-slate-200" />
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-400">No results match your filters.</p>
                                                    <Button variant="link" className="text-xs font-bold text-primary mt-2" onClick={() => { setSearchTerm(''); setCategoryFilter('all'); setDateFilter(undefined); }}>Clear All Filters</Button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Pagination Controls */}
                                        {totalPages > 1 && (
                                            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-50 px-2">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Page {currentPage} of {totalPages}</p>
                                                <div className="flex gap-2">
                                                    <Button 
                                                        disabled={currentPage === 1} 
                                                        onClick={() => setCurrentPage(prev => prev - 1)}
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="h-8 w-8 rounded-lg p-0"
                                                    >
                                                        <ChevronLeft className="h-4 w-4" />
                                                    </Button>
                                                    <Button 
                                                        disabled={currentPage === totalPages} 
                                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="h-8 w-8 rounded-lg p-0"
                                                    >
                                                        <ChevronRight className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-8 rounded-[2.5rem] border border-primary/5 bg-primary/[0.03] flex items-center gap-6">
                                        <div className="p-4 rounded-2xl bg-white shadow-sm border border-black/5 flex-1">
                                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.1em]">Filtered Tasks</p>
                                            <p className="text-3xl font-black mt-1">{filteredHomeworks.length}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white shadow-sm border border-black/5 flex-1 text-center group cursor-pointer hover:border-primary/20 transition-all" onClick={() => { setSearchTerm(''); setCategoryFilter('all'); setDateFilter(undefined); }}>
                                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.1em]">Reset Filters</p>
                                            <div className="flex justify-center mt-2 group-hover:scale-110 transition-transform">
                                                <X className="h-6 w-6 text-slate-300" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:col-span-7 sticky top-8">
                                    {selectedSchedule ? (
                                        <AttendanceDetails schedule={selectedSchedule} />
                                    ) : (
                                        <div className="h-[600px] rounded-[3rem] border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center p-12 text-center">
                                            <div className="h-24 w-24 rounded-[2.5rem] bg-white shadow-xl flex items-center justify-center mb-8 animate-bounce duration-[3s]">
                                                <Inbox className="h-10 w-10 text-primary/40" />
                                            </div>
                                            <h4 className="text-2xl font-black text-slate-800 mb-2">Review Deep Insights</h4>
                                            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">Select an assignment to unlock detailed student analytics, submission tracking, and performance metrics.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </Reveal>
                </TabsContent>

                <TabsContent value="submissions">
                    <Reveal>
                        {subLoading ? (
                            <div className="flex justify-center p-20">
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            </div>
                        ) : submissions.length > 0 ? (
                            <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-sm overflow-hidden p-6 md:p-8">
                                <div className="mb-8 px-2">
                                    <h3 className="text-3xl font-black font-headline tracking-tight">Recent Activity</h3>
                                    <p className="text-muted-foreground text-sm font-medium">A unified stream of all student completions across your courses.</p>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-muted">
                                                <th className="pb-5 pt-4 px-3 text-[10px] uppercase font-black text-muted-foreground tracking-[0.1em]">Student</th>
                                                <th className="pb-5 pt-4 px-3 text-[10px] uppercase font-black text-muted-foreground tracking-[0.1em]">Homework</th>
                                                <th className="pb-5 pt-4 px-3 text-[10px] uppercase font-black text-muted-foreground tracking-[0.1em]">Status</th>
                                                <th className="pb-5 pt-4 px-3 text-[10px] uppercase font-black text-muted-foreground tracking-[0.1em]">Date/Time</th>
                                                <th className="pb-5 pt-4 px-3 text-[10px] uppercase font-black text-muted-foreground tracking-[0.1em]">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-muted/30">
                                            {submissions.map((sub, idx) => {
                                                const dateToFormat = sub.submittedAt?.toDate ? sub.submittedAt.toDate() : sub.submittedAt;
                                                return (
                                                    <tr key={idx} className="group hover:bg-primary/[0.01] transition-all">
                                                        <td className="py-5 px-3">
                                                            <div className="flex items-center gap-4">
                                                                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center font-bold text-slate-400 overflow-hidden border border-slate-100 group-hover:border-primary/20 transition-all shadow-sm">
                                                                    {sub.studentAvatarUrl ? <img src={sub.studentAvatarUrl} className="h-full w-full object-cover"/> : sub.studentName?.charAt(0) || 'S'}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-sm text-slate-800 leading-none mb-1">{sub.studentName}</p>
                                                                    <p className="text-[10px] text-muted-foreground font-black tracking-widest">ID: ...{sub.studentId?.slice(-6)}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-5 px-3 uppercase tracking-tighter">
                                                            <p className="font-bold text-sm text-slate-700">{sub.homeworkTitle}</p>
                                                            <p className="text-[10px] text-primary font-black tracking-[0.15em] opacity-60">{sub.homeworkType || 'MCQ'}</p>
                                                        </td>
                                                        <td className="py-5 px-3">
                                                            <div className="inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                                                                {sub.status || 'Submitted'}
                                                            </div>
                                                        </td>
                                                        <td className="py-5 px-3">
                                                            <p className="text-xs font-bold text-slate-500 font-headline">
                                                                {dateToFormat ? format(dateToFormat, 'MMM dd, hh:mm a') : 'N/A'}
                                                            </p>
                                                        </td>
                                                        <td className="py-5 px-3">
                                                            {sub.answerFileUrl ? (
                                                                <a 
                                                                    href={sub.answerFileUrl} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="h-10 w-10 rounded-1.5xl bg-primary shadow-lg shadow-primary/20 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                                                                >
                                                                    <Upload className="h-4 w-4 rotate-180" />
                                                                </a>
                                                            ) : (
                                                                <div className="h-10 w-10 rounded-1.5xl bg-slate-50 text-slate-300 flex items-center justify-center border border-slate-100">
                                                                    <ClipboardCheck className="h-5 w-5" />
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="p-32 text-center border-2 border-dashed border-slate-200 rounded-[4rem] bg-slate-50/50">
                                <div className="h-24 w-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mx-auto mb-8 animate-pulse">
                                    <Inbox className="h-12 w-12 text-primary/20" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 mb-2">No Submissions Recorded</h3>
                                <p className="text-muted-foreground font-medium max-w-sm mx-auto leading-relaxed">Wait for students to complete their tasks. Once submitted, results will appear in this unified status stream.</p>
                            </div>
                        )}
                    </Reveal>
                </TabsContent>
            </Tabs>
        </div>
    );
}
