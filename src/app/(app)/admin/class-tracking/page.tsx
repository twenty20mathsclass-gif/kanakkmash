'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import type { Schedule, User } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Search, Calendar, Video, Clock, ChevronRight, User as UserIcon, X, Users, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function ClassTrackingPage() {
    const { firestore } = useFirebase();
    const router = useRouter();
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [teachers, setTeachers] = useState<Record<string, User>>({});
    
    const [searchTitle, setSearchTitle] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    useEffect(() => {
        if (!firestore) return;
        
        // Fetch all teachers for mapping names
        const fetchTeachers = async () => {
            const q = query(collection(firestore, 'users'), where('role', '==', 'teacher'));
            const snap = await getDocs(q);
            const teacherMap: Record<string, User> = {};
            snap.docs.forEach(doc => {
                teacherMap[doc.id] = { id: doc.id, ...doc.data() } as User;
            });
            setTeachers(teacherMap);
        };
        fetchTeachers();

        // Real-time listener for classes
        const schedQ = query(collection(firestore, 'schedules'), where('type', '==', 'class'));
        const unsubSched = onSnapshot(schedQ, (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule));
            // Sort by date descending
            list.sort((a,b) => b.date.toMillis() - a.date.toMillis());
            setSchedules(list);
        });

        return () => unsubSched();
    }, [firestore]);

    const filteredSchedules = useMemo(() => {
        return schedules.filter(sched => {
            // Title filter
            if (searchTitle && !sched.title.toLowerCase().includes(searchTitle.toLowerCase())) return false;
            
            // Date filter
            if (selectedDate) {
                const schedDate = sched.date.toDate();
                if (
                    schedDate.getDate() !== selectedDate.getDate() ||
                    schedDate.getMonth() !== selectedDate.getMonth() ||
                    schedDate.getFullYear() !== selectedDate.getFullYear()
                ) {
                    return false;
                }
            }
            return true;
        });
    }, [schedules, searchTitle, selectedDate]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Class Tracking Hub</h1>
                    <p className="text-muted-foreground mt-1">Monitor, analyze, and oversee all active and completed virtual classes seamlessly.</p>
                </div>
            </div>

            {/* FLITERS BAR */}
            <Card className="border-none shadow-sm bg-white/50 backdrop-blur-md">
                <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input 
                            placeholder="Search classes by title..." 
                            value={searchTitle}
                            onChange={(e) => setSearchTitle(e.target.value)}
                            className="pl-9 bg-white border-gray-200 focus-visible:ring-[#FF8C00]/20 max-w-md w-full"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    className={cn(
                                        "w-full md:w-[240px] justify-start text-left font-normal bg-white border-gray-200",
                                        !selectedDate && "text-muted-foreground",
                                        selectedDate && "border-[#FF8C00]/30 text-[#FF8C00] bg-orange-50/50"
                                    )}
                                >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {selectedDate ? format(selectedDate, "PPP") : <span>Filter by date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <CalendarComponent
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={(date) => {
                                        setSelectedDate(date);
                                        setIsCalendarOpen(false);
                                    }}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        
                        {selectedDate && (
                            <Button variant="ghost" size="icon" onClick={() => setSelectedDate(undefined)} className="h-10 w-10 text-gray-400 hover:text-red-500 hover:bg-red-50 shrink-0">
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* SCHEDULES GRID */}
            {filteredSchedules.length === 0 ? (
                <div className="text-center py-20 bg-white/40 rounded-2xl border border-dashed border-gray-200">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Activity className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No classes found</h3>
                    <p className="text-muted-foreground">Adjust your search or date filter to find classes.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSchedules.map(sched => {
                        const teacher = teachers[sched.teacherId!];
                        const dateObj = sched.date.toDate();
                        
                        return (
                            <Card 
                                key={sched.id} 
                                className="group drop-shadow-sm hover:drop-shadow-md transition-all duration-300 border border-gray-200/60 overflow-hidden cursor-pointer active:scale-95"
                                onClick={() => router.push(`/admin/class-tracking/${sched.id}`)}
                            >
                                <div className="h-2 w-full" style={{ backgroundColor: sched.color || '#FF8C00' }} />
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: `${sched.color}15`, color: sched.color }}>
                                            {sched.courseModel}
                                        </div>
                                        {sched.learningMode === 'one to one' ? (
                                            <div className="flex items-center text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                                                <UserIcon className="h-3 w-3 mr-1" /> 1-on-1
                                            </div>
                                        ) : (
                                            <div className="flex items-center text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                                                <Users className="h-3 w-3 mr-1" /> Group
                                            </div>
                                        )}
                                    </div>
                                    
                                    <h3 className="font-semibold text-lg line-clamp-1 mb-1">{sched.title}</h3>
                                    
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                                        <UserIcon className="h-4 w-4 shrink-0" />
                                        <span className="truncate">{teacher ? teacher.name : 'Unknown Teacher'}</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-1">Date</span>
                                            <span className="text-sm font-medium text-gray-700 flex items-center">
                                                <Calendar className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                                                {format(dateObj, "MMM d, yyyy")}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-1">Time</span>
                                            <span className="text-sm font-medium text-gray-700 flex items-center">
                                                <Clock className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                                                {sched.startTime} - {sched.endTime}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                        {sched.meetLink && sched.meetLink.includes('meet.google.com') ? (
                                            <div className="flex items-center text-xs font-medium text-green-600">
                                                <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-2 animate-pulse" />
                                                Live Tracked
                                            </div>
                                        ) : (
                                            <div className="flex items-center text-xs font-medium text-gray-400">
                                                Standard Link
                                            </div>
                                        )}
                                        
                                        <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#FF8C00] group-hover:text-white text-gray-400 transition-colors">
                                            <ChevronRight className="h-4 w-4" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    );
}
