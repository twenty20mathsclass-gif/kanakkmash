'use client';

import { useState, useEffect } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp, where } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { 
  Loader2, Mail, Phone, User, GraduationCap, Calendar, 
  CheckCircle2, XCircle, LayoutGrid, Eye, Search, Info, ShieldCheck,
  Trophy, ClipboardCheck, ArrowUpRight, Filter
} from 'lucide-react';
import { Reveal } from '@/components/shared/reveal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AssessmentSubmission {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  class: string;
  isLoggedIn: boolean;
  userEmail: string | null;
  userId: string | null;
  invoiceId: string | null;
  assessmentType: 'paid' | 'free' | string;
  status: string;
  submittedAt: Timestamp;
  score?: number;
  totalQuestions?: number;
  percentage?: number;
}

export default function TeacherAssessmentResultsPage() {
  const { firestore } = useFirebase();
  const { user: authUser } = useUser();
  const [submissions, setSubmissions] = useState<AssessmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<AssessmentSubmission | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('completed');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    if (!firestore) return;

    // Fetch all assessments first, we'll filter client-side for better UX with search
    const q = query(
      collection(firestore, 'assessment'),
      orderBy('submittedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AssessmentSubmission[];
      setSubmissions(docs.filter(d => d.submittedAt)); // Ensure we only have docs with timestamps
      setLoading(false);
    }, (error) => {
      console.error("Error fetching assessments:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore]);

  // Client-side filtering
  const filteredSubmissions = submissions.filter(item => {
    const matchesSearch = 
      (item.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (item.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (item.whatsapp || '').includes(searchQuery) ||
      (item.invoiceId || '').includes(searchQuery);
    
    const matchesClass = classFilter === 'all' || item.class === classFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesType = typeFilter === 'all' || item.assessmentType === typeFilter;

    return matchesSearch && matchesClass && matchesStatus && matchesType;
  });

  const classes = Array.from(new Set(submissions.map(s => s.class))).sort();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Loading assessment reports...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-1 pb-10">
      <Reveal>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-primary mb-1">
                <ClipboardCheck size={20} />
                <span className="text-xs font-bold uppercase tracking-widest">Teacher Panel</span>
            </div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">Assessment Results</h1>
            <p className="text-muted-foreground mt-1">Review student performance and initial assessment inquiries.</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-3 bg-card border px-5 py-2.5 rounded-3xl shadow-sm">
                <div className="bg-primary/10 p-2.5 rounded-2xl">
                    <Trophy className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mb-1">Total Reports</p>
                    <p className="text-xl font-black leading-none">{submissions.length}</p>
                </div>
             </div>
          </div>
        </div>
      </Reveal>

      {/* Toolbar */}
      <Reveal delay={0.1}>
        <div className="flex flex-col md:flex-row gap-4 bg-card border p-4 rounded-[2rem] shadow-sm">
            <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                <Input 
                    placeholder="Search by name, email or whatsapp..." 
                    className="pl-12 rounded-2xl border-none bg-muted/30 focus-visible:ring-2 focus-visible:ring-primary/20 h-12"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="flex gap-4">
                <Select value={classFilter} onValueChange={setClassFilter}>
                    <SelectTrigger className="w-[160px] rounded-2xl border-none bg-muted/30 h-12 px-4 font-medium flex gap-2">
                        <Filter size={14} className="text-muted-foreground" />
                        <SelectValue placeholder="All Classes" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-xl">
                        <SelectItem value="all">All Classes</SelectItem>
                        {classes.map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px] rounded-2xl border-none bg-muted/30 h-12 px-4 font-medium flex gap-2">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-xl">
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="started">Started</SelectItem>
                        <SelectItem value="registered">Registered</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[120px] rounded-2xl border-none bg-muted/30 h-12 px-4 font-medium flex gap-2">
                        <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-xl">
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="free">Free</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
          {filteredSubmissions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30 border-none">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="font-bold py-5 pl-8">Student</TableHead>
                    <TableHead className="font-bold">Type/Fee</TableHead>
                    <TableHead className="font-bold">Class</TableHead>
                    <TableHead className="font-bold">Score</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="font-bold">Date</TableHead>
                    <TableHead className="font-bold text-right pr-8">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((item) => (
                    <TableRow 
                      key={item.id} 
                      className="group hover:bg-primary/[0.02] border-b border-border/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedItem(item)}
                    >
                      <TableCell className="py-5 pl-8">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center font-bold text-primary text-sm shrink-0 border border-primary/20">
                              {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                           </div>
                           <div className="flex flex-col">
                                <span className="font-bold text-foreground/90">{item.name || 'Anonymous'}</span>
                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{item.whatsapp}</span>
                           </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.assessmentType === 'paid' ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border-none rounded-xl font-black text-[10px] uppercase shadow-sm">
                                Paid
                            </Badge>
                        ) : (
                            <Badge className="bg-slate-100 text-slate-500 border-none rounded-xl font-bold text-[10px] uppercase">
                                Free
                            </Badge>
                        )}
                        {item.invoiceId && (
                            <p className="text-[9px] text-muted-foreground mt-1 font-mono">{item.invoiceId.slice(0, 8)}...</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary px-3 rounded-full font-bold text-[10px]">
                            {item.class}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.status === 'completed' ? (
                            <div className="flex flex-col">
                                <div className="text-sm font-black text-foreground">
                                    {item.score ?? 0}<span className="text-muted-foreground font-bold text-xs">/{item.totalQuestions ?? 0}</span>
                                </div>
                                <div className="w-16 h-1 bg-muted rounded-full mt-1 overflow-hidden">
                                    <div 
                                        className="h-full bg-primary rounded-full" 
                                        style={{ width: `${item.percentage ?? 0}%` }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <span className="text-xs text-muted-foreground italic">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                            variant="secondary" 
                            className={`capitalize rounded-lg px-2.5 py-0.5 font-bold border-none ${
                                item.status === 'completed' ? 'bg-green-100 text-green-700' :
                                item.status === 'registered' ? 'bg-blue-100 text-blue-700' :
                                'bg-orange-100 text-orange-700'
                            }`}
                        >
                            {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-medium">
                        {item.submittedAt ? format(item.submittedAt.toDate(), "MMM dd, yyyy") : "N/A"}
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-muted/30 text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all">
                            <ArrowUpRight size={18} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-24 flex flex-col items-center justify-center gap-4 bg-muted/5">
               <div className="bg-white w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-sm border-2 border-dashed border-border">
                  <Search size={32} className="text-muted-foreground/20" />
               </div>
               <div className="text-center">
                  <p className="text-xl font-black text-foreground/40 font-headline">No matching results</p>
                  <p className="text-muted-foreground font-medium max-w-[280px] mt-1 mx-auto text-sm">Try adjusting your filters or search query to find students.</p>
               </div>
            </div>
          )}
        </Card>
      </Reveal>

      {/* Details Modal (Same as Admin but with score details) */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl rounded-[3rem] gap-0">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 pt-10 text-white relative">
             <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black font-headline leading-tight">Assessment Record</h2>
                    <p className="text-white/50 font-medium text-sm mt-1">Detailed performance and contact data</p>
                </div>
                <div className="bg-white/10 p-4 rounded-[2rem] backdrop-blur-md shrink-0 border border-white/10">
                   <User size={32} className="text-white" />
                </div>
             </div>
             
             <div className="flex flex-wrap gap-2 mt-8">
                <Badge className="bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm px-4 py-1 rounded-full text-xs font-bold">
                    ID: {selectedItem?.id.slice(0, 8)}
                </Badge>
                {selectedItem?.isLoggedIn ? (
                    <Badge className="bg-green-500/20 hover:bg-green-500/30 border-green-500/30 text-green-200 backdrop-blur-sm px-4 py-1 rounded-full text-xs font-bold flex gap-1.5 items-center">
                        <ShieldCheck size={14} /> Official Student
                    </Badge>
                ) : (
                    <Badge className="bg-slate-500/20 hover:bg-slate-500/30 border-slate-500/30 text-slate-200 backdrop-blur-sm px-4 py-1 rounded-full text-xs font-bold flex gap-1.5 items-center">
                        <XCircle size={14} /> Guest Lead
                    </Badge>
                )}
             </div>
          </div>

          <div className="p-8 bg-background">
             {selectedItem?.status === 'completed' && (
                 <div className="mb-10 p-6 rounded-[2.5rem] bg-primary/5 border border-primary/10 flex flex-col md:flex-row items-center gap-8 shadow-inner">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                className="text-muted-foreground/10"
                                strokeWidth="8"
                                stroke="currentColor"
                                fill="transparent"
                                r="56"
                                cx="64"
                                cy="64"
                            />
                            <circle
                                className="text-primary"
                                strokeWidth="8"
                                strokeDasharray={351.85}
                                strokeDashoffset={351.85 - (351.85 * (selectedItem.percentage || 0)) / 100}
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="transparent"
                                r="56"
                                cx="64"
                                cy="64"
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-3xl font-black text-foreground leading-none">{selectedItem.percentage ?? 0}%</span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Score</span>
                        </div>
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-1">
                        <h4 className="text-xl font-black font-headline">Test Performance</h4>
                        <p className="text-muted-foreground text-sm font-medium">
                            Correctly answered <span className="text-foreground font-bold">{selectedItem.score}</span> out of <span className="text-foreground font-bold">{selectedItem.totalQuestions}</span> questions.
                        </p>
                    </div>
                 </div>
             )}

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-6">
                    <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mb-2 leading-none">Student Name</p>
                        <p className="text-lg font-black text-foreground/90 font-headline leading-none">{selectedItem?.name}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mb-2 leading-none">WhatsApp Contact</p>
                        <p className="text-lg font-bold text-foreground flex items-center gap-2 leading-none">
                            <Phone size={18} className="text-primary" />
                            {selectedItem?.whatsapp}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mb-2 leading-none">Email Address</p>
                        <p className="text-sm font-medium text-foreground flex items-center gap-2 leading-none bg-muted/20 p-2 rounded-xl border truncate">
                            <Mail size={16} className="text-primary shrink-0" />
                            {selectedItem?.email}
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mb-2 leading-none">Academic Class</p>
                        <p className="text-lg font-black text-primary font-headline flex items-center gap-2 leading-none">
                            <GraduationCap size={22} />
                            {selectedItem?.class}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mb-2 leading-none">Submitted On</p>
                        <p className="text-sm font-medium text-foreground/80 flex items-center gap-2 leading-none">
                            <Calendar size={18} className="text-muted-foreground" />
                            {selectedItem?.submittedAt ? format(selectedItem.submittedAt.toDate(), "MMMM dd, yyyy · hh:mm a") : "N/A"}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mb-2 leading-none">Category Status</p>
                        <Badge className="bg-primary/10 hover:bg-primary/20 border-primary/20 text-primary px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                            {selectedItem?.status}
                        </Badge>
                    </div>
                </div>
             </div>
             
             <div className="flex justify-end gap-3 pt-6 border-t">
                <Button 
                    variant="ghost"
                    onClick={() => setSelectedItem(null)} 
                    className="rounded-2xl px-6 h-12 font-bold"
                >
                    Dismiss
                </Button>
                <Button 
                    onClick={() => {
                        window.open(`https://wa.me/${selectedItem?.whatsapp?.replace(/[^\d]/g, '')}`, '_blank');
                    }} 
                    className="rounded-2xl px-8 h-12 font-black transition-all shadow-lg hover:shadow-primary/25 bg-green-600 hover:bg-green-700 text-white flex gap-2"
                >
                    <Phone size={18} />
                    WhatsApp Student
                </Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
