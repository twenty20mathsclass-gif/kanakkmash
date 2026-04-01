'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
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
  CheckCircle2, XCircle, LayoutGrid, Eye, Search, Info, ShieldCheck
} from 'lucide-react';
import { Reveal } from '@/components/shared/reveal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface AssessmentSubmission {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  class: string;
  isLoggedIn: boolean;
  userEmail: string | null;
  userId: string | null;
  status: string;
  submittedAt: Timestamp;
}

export default function TeacherAssessmentPage() {
  const { firestore } = useFirebase();
  const [submissions, setSubmissions] = useState<AssessmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<AssessmentSubmission | null>(null);

  useEffect(() => {
    if (!firestore) return;

    const q = query(
      collection(firestore, 'assessment'),
      orderBy('submittedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AssessmentSubmission[];
      setSubmissions(docs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching assessments:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Loading assessment reports...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-1">
      <Reveal>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">Assessment Leads</h1>
            <p className="text-muted-foreground mt-1">Review and manage detailed student assessment submissions.</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-3 bg-card border px-5 py-2.5 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-primary/10 p-2.5 rounded-2xl">
                    <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mb-1">Live Leads</p>
                    <p className="text-xl font-black leading-none">{submissions.length}</p>
                </div>
             </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
          {submissions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="font-bold py-5 pl-8">Student</TableHead>
                    <TableHead className="font-bold">Contact</TableHead>
                    <TableHead className="font-bold">Class</TableHead>
                    <TableHead className="font-bold">Registration</TableHead>
                    <TableHead className="font-bold">Date</TableHead>
                    <TableHead className="font-bold text-right pr-8">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((item) => (
                    <TableRow 
                      key={item.id} 
                      className="group hover:bg-primary/[0.02] border-b border-border/50 transition-colors"
                    >
                      <TableCell className="py-5 pl-8">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center font-bold text-primary text-sm shrink-0 border border-primary/10">
                              {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                           </div>
                           <span className="font-bold text-foreground/90">{item.name || 'Anonymous'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                           <span className="text-sm font-medium text-foreground/80 flex items-center gap-1.5 shrink-0">
                              <Phone size={12} className="text-muted-foreground" />
                              {item.whatsapp}
                           </span>
                           <span className="text-xs text-muted-foreground truncate max-w-[150px]">{item.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary px-3 rounded-full font-bold text-[10px]">
                            {item.class}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.isLoggedIn ? (
                           <div className="flex items-center gap-1.5 text-green-600 font-bold text-xs uppercase tracking-tighter">
                              <CheckCircle2 size={14} /> Registered
                           </div>
                        ) : (
                           <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs uppercase tracking-tighter">
                              <XCircle size={14} /> Not Registered
                           </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-medium">
                        {item.submittedAt ? format(item.submittedAt.toDate(), "MMM dd, yyyy") : "N/A"}
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedItem(item)}
                          className="rounded-xl h-9 w-9 p-0 hover:bg-primary/10 hover:text-primary transition-all group-hover:scale-110 active:scale-95"
                        >
                          <Eye size={18} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-32 flex flex-col items-center justify-center gap-4 bg-muted/10">
               <div className="bg-card w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-inner border-2 border-dashed border-border">
                  <LayoutGrid size={40} className="text-muted-foreground/20" />
               </div>
               <div className="text-center">
                  <p className="text-2xl font-black text-foreground/40 font-headline">No Leads Found</p>
                  <p className="text-muted-foreground font-medium max-w-[300px] mt-1 mx-auto text-sm">Waiting for new students to complete the assessment form.</p>
               </div>
            </div>
          )}
        </Card>
      </Reveal>

      {/* Details Modal */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl rounded-[3rem] gap-0">
          <div className="bg-gradient-to-br from-primary via-primary/95 to-primary/90 p-8 pt-10 text-white relative">
             <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black font-headline leading-tight">Assessment Details</h2>
                    <p className="text-white/70 font-medium text-sm mt-1">Full profile of student inquiry</p>
                </div>
                <div className="bg-white/20 p-4 rounded-[2rem] backdrop-blur-md shrink-0">
                   <User size={32} className="text-white" />
                </div>
             </div>
             
             <div className="flex flex-wrap gap-2 mt-8">
                <Badge className="bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm px-4 py-1 rounded-full text-xs font-bold">
                    ID: {selectedItem?.id.slice(0, 8)}...
                </Badge>
                {selectedItem?.isLoggedIn ? (
                    <Badge className="bg-green-500/20 hover:bg-green-500/30 border-green-500/30 text-green-200 backdrop-blur-sm px-4 py-1 rounded-full text-xs font-bold flex gap-1.5 items-center">
                        <ShieldCheck size={14} /> Registered User
                    </Badge>
                ) : (
                    <Badge className="bg-slate-500/20 hover:bg-slate-500/30 border-slate-500/30 text-slate-200 backdrop-blur-sm px-4 py-1 rounded-full text-xs font-bold flex gap-1.5 items-center">
                        <XCircle size={14} /> Not Registered
                    </Badge>
                )}
             </div>
          </div>

          <div className="p-8 pb-10 bg-background grid grid-cols-1 md:grid-cols-2 gap-8">
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
                   <p className="text-sm font-medium text-foreground flex items-center gap-2 leading-none">
                       <Mail size={18} className="text-primary" />
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
                   <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mb-2 leading-none">Submission Time</p>
                   <p className="text-sm font-medium text-foreground/80 flex items-center gap-2 leading-none">
                       <Calendar size={18} className="text-muted-foreground" />
                       {selectedItem?.submittedAt ? format(selectedItem.submittedAt.toDate(), "MMMM dd, yyyy · hh:mm a") : "N/A"}
                   </p>
                </div>
                <div>
                   <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mb-2 leading-none">Process Status</p>
                   <div className="flex items-center gap-2 h-6">
                       <Badge variant="secondary" className="capitalize font-bold border-primary/20 text-primary/80 px-4 py-0.5 rounded-full">
                           {selectedItem?.status}
                       </Badge>
                   </div>
                </div>
             </div>

             {(selectedItem?.userId || selectedItem?.userEmail) && (
               <div className="md:col-span-2 pt-6 border-t mt-2">
                  <div className="bg-muted/30 p-4 rounded-3xl border border-border/50">
                     <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mb-3 leading-none flex items-center gap-1.5">
                        <Info size={14} /> Auth Metadata
                     </p>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedItem?.userEmail && (
                           <div>
                              <p className="text-[9px] text-muted-foreground font-medium uppercase mb-1">Auth Email</p>
                              <p className="text-xs font-bold text-foreground/70 truncate">{selectedItem.userEmail}</p>
                           </div>
                        )}
                        {selectedItem?.userId && (
                           <div>
                              <p className="text-[9px] text-muted-foreground font-medium uppercase mb-1">Auth UID</p>
                              <p className="text-xs font-bold text-foreground/70 truncate">{selectedItem.userId}</p>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
             )}
          </div>
          
          <div className="px-8 pb-8 bg-background flex justify-end">
             <Button 
                onClick={() => setSelectedItem(null)} 
                className="rounded-2xl px-10 h-14 font-black transition-all hover:scale-[1.03] active:scale-[0.98] shadow-lg shadow-primary/25"
             >
                Close Report
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
