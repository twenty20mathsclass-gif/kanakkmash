'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import type { Schedule, User } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/shared/page-loader';
import { ChevronLeft, Calendar, Clock, Video, Users, User as UserIcon, Activity, AlertCircle, PlayCircle, StopCircle, ArrowRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ClassTrackingDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { firestore } = useFirebase();
    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [teacher, setTeacher] = useState<User | null>(null);
    const [students, setStudents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [googleEvent, setGoogleEvent] = useState<any>(null);

    useEffect(() => {
        if (!firestore || !params.id) return;
        const fetchDetails = async () => {
            try {
                // 1. Fetch Schedule
                const schedDoc = await getDoc(doc(firestore, 'schedules', params.id as string));
                if (!schedDoc.exists()) throw new Error("Not found");
                const schedData = { id: schedDoc.id, ...schedDoc.data() } as Schedule;
                setSchedule(schedData);

                // 2. Fetch Teacher
                if (schedData.teacherId) {
                    const tDoc = await getDoc(doc(firestore, 'users', schedData.teacherId));
                    if (tDoc.exists()) setTeacher({ id: tDoc.id, ...tDoc.data() } as User);
                }

                // 3. Fetch Students
                const sRef = collection(firestore, 'users');
                let sQuery;
                if (schedData.learningMode === 'one to one' && schedData.studentId) {
                    sQuery = query(sRef, where('__name__', '==', schedData.studentId));
                } else if (schedData.classes && schedData.classes.length > 0) {
                    // Match any student in the assigned classes. Because 'in' has a max of 10, we'll do client side filter if needed, 
                    // or just a basic query for role=student and filter client-side to be safe.
                    const allStudentsSnap = await getDocs(query(sRef, where('role', '==', 'student')));
                    const matchedStudents = allStudentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as User)).filter(student => {
                        if (schedData.classes?.includes(student.class || '')) return true;
                        if (schedData.levels?.includes(student.level || '')) return true;
                        if (schedData.competitiveExam && student.competitiveExam === schedData.competitiveExam) return true;
                        return false;
                    });
                    setStudents(matchedStudents);
                    setLoading(false);
                    return; // Early return since we set it manually
                } else {
                    // No specific students targeted directly
                    setStudents([]);
                    setLoading(false);
                    return;
                }

                if (sQuery) {
                    const sSnap = await getDocs(sQuery);
                    setStudents(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
                }

                // 4. Fetch Google Meet Details Live
                if (schedData.meetLink) {
                    try {
                        const googleRes = await fetch(`/api/google/meeting-details?meetLink=${schedData.meetLink}`);
                        if (googleRes.ok) {
                            const data = await googleRes.json();
                            if (data.success) setGoogleEvent(data);
                        }
                    } catch (e) {
                        console.error('Failed to fetch google live meet data', e);
                    }
                }

            } catch (error) {
                console.error("Failed to load tracking details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [firestore, params.id]);

    if (loading) return <PageLoader />;
    if (!schedule) return <div className="p-8 text-center text-muted-foreground">Class record not found.</div>;

    const dateObj = schedule.date.toDate();

    return (
        <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            
            {/* Header Navigation */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/admin/class-tracking')} className="shrink-0 h-10 w-10 bg-white shadow-sm border border-gray-200 text-gray-500 hover:text-gray-900">
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md" style={{ backgroundColor: `${schedule.color}20`, color: schedule.color }}>
                            {schedule.courseModel}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md bg-gray-100 text-gray-500">
                            {schedule.learningMode}
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">{schedule.title}</h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main Content - Left Column (2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Duration & Timeline Graph */}
                    <Card className="border-none shadow-sm overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50/50 border-b border-gray-100 pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-blue-100 rounded-lg"><Activity className="h-4 w-4 text-blue-600" /></div>
                                    <CardTitle className="text-lg">Session Tracking</CardTitle>
                                </div>
                                {(schedule as any).meetEventId ? (
                                    <div className="flex items-center text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                                        Google APIs Bound
                                    </div>
                                ) : (
                                    <div className="flex items-center text-xs font-semibold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        Manual Link (Untracked)
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            {/* Graphic Mockup of Duration Tracking foundation */}
                            <div className="space-y-6">
                                <div className="flex gap-8 justify-between lg:justify-start">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground flex items-center"><Calendar className="h-4 w-4 mr-1.5" /> Date</p>
                                        <p className="text-lg font-semibold text-gray-900">{format(dateObj, "MMMM d, yyyy")}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground flex items-center"><Clock className="h-4 w-4 mr-1.5" /> Scheduled Time</p>
                                        <p className="text-lg font-semibold text-gray-900">{schedule.startTime} <ArrowRight className="inline h-4 w-4 text-gray-300 mx-1" /> {schedule.endTime}</p>
                                    </div>
                                </div>

                                <div className="pt-6 relative">
                                    <div className="flex justify-between text-xs font-medium text-gray-400 mb-2 px-1">
                                        <span>Start ({schedule.startTime})</span>
                                        <span>Expected End ({schedule.endTime})</span>
                                    </div>
                                    
                                    {/* Timeline Bar */}
                                    <div className="h-6 w-full bg-gray-100 rounded-full overflow-hidden relative border border-gray-200 shadow-inner">
                                        {/* Scheduled Target Fill */}
                                        <div className="h-full bg-slate-200/50 w-full absolute top-0 left-0" />
                                        
                                        {/* Actual Tracked Fill (Mocked logic for visualization) */}
                                        <div 
                                            className={cn(
                                                "h-full relative flex items-center justify-end pr-2 transition-all duration-1000", 
                                                (schedule as any).meetEventId ? "bg-gradient-to-r from-green-400 to-green-500 w-[65%]" : "bg-gradient-to-r from-gray-300 to-gray-400 w-0"
                                            )}
                                        >
                                            {(schedule as any).meetEventId && (
                                                <div className="h-3 w-3 bg-white rounded-full shadow-sm animate-pulse" />
                                            )}
                                        </div>
                                    </div>

                                    {(schedule as any).meetEventId ? (
                                        <div className="flex justify-between items-center mt-3 px-1">
                                            <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded-md">
                                                <PlayCircle className="h-3 w-3" /> Event Logged
                                            </div>
                                            <p className="text-xs text-muted-foreground italic">
                                                {googleEvent ? `Total Conference Participants Data: ${googleEvent.participants?.length || 0}` : 'Fetching live Google metrics...'}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="mt-3 text-xs text-center text-muted-foreground">Class was created before API integration. Duration graph unavailable.</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Participants / Students */}
                    <Card className="border-none shadow-sm bg-white">
                        <CardHeader className="bg-slate-50/50 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-indigo-100 rounded-lg"><Users className="h-4 w-4 text-indigo-600" /></div>
                                    <CardTitle className="text-lg">Enrolled Students</CardTitle>
                                </div>
                                <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
                                    {students.length} Total
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {students.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground text-sm">
                                    No students specifically assigned or found for this class configuration.
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto scrollbar-thin">
                                    {students.map(student => (
                                        <div key={student.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 border border-gray-200 shadow-sm">
                                                    {student.avatarUrl && <AvatarImage src={student.avatarUrl} className="object-cover" />}
                                                    <AvatarFallback className="bg-indigo-50 text-indigo-600 font-medium">
                                                        {student.name.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">{student.name}</p>
                                                    <p className="text-[11px] text-muted-foreground">{student.email}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {student.class && <p className="text-xs font-medium text-gray-700">{student.class}</p>}
                                                <p className="text-[10px] text-muted-foreground uppercase">{student.courseModel || student.role}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Content - Right Column (1/3) */}
                <div className="space-y-6">
                    
                    {/* Teacher Details */}
                    <Card className="border-none shadow-sm overflow-hidden bg-white">
                        <CardHeader className="bg-orange-50/50 border-b border-orange-100 pb-4">
                            <CardTitle className="text-sm font-bold text-orange-900 uppercase tracking-wider flex items-center">
                                <UserIcon className="h-4 w-4 mr-2 text-orange-500" /> Instructor
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 text-center">
                            {teacher ? (
                                <div className="flex flex-col items-center">
                                    <Avatar className="h-20 w-20 border-4 border-white shadow-xl mb-4">
                                        {teacher.avatarUrl && <AvatarImage src={teacher.avatarUrl} className="object-cover" />}
                                        <AvatarFallback className="bg-orange-100 text-orange-700 text-xl font-bold">
                                            {teacher.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <h3 className="text-lg font-bold text-gray-900">{teacher.name}</h3>
                                    <p className="text-sm text-muted-foreground mb-4">{teacher.email}</p>
                                    <a href={`mailto:${teacher.email}`} className="text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-full transition-colors w-full tracking-wide">
                                        Contact Teacher
                                    </a>
                                </div>
                            ) : (
                                <div className="py-4 text-sm text-muted-foreground">Teacher details hidden or deleted.</div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Info & Meet Link */}
                    <Card className="border-none shadow-sm bg-gray-900 text-white overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                            <Video className="h-24 w-24" />
                        </div>
                        <CardContent className="p-6 relative z-10">
                            <h3 className="font-bold text-lg mb-1">Meet Details</h3>
                            <p className="text-gray-400 text-xs mb-6">Access credentials for this session</p>
                            
                            <div className="space-y-1 mb-6">
                                <p className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Meet URL</p>
                                <a 
                                    href={schedule.meetLink} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-sm font-medium text-blue-400 hover:text-blue-300 break-all underline decoration-blue-500/30 underline-offset-4"
                                >
                                    {schedule.meetLink}
                                </a>
                            </div>

                            {(schedule as any).meetEventId && (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Event Bind ID</p>
                                        <div className="bg-black/40 px-3 py-2 rounded-md font-mono text-[10px] text-gray-300 break-all">
                                            {(schedule as any).meetEventId}
                                        </div>
                                    </div>

                                    {googleEvent && (
                                        <div className="space-y-2 mt-4 pt-4 border-t border-gray-800">
                                            <p className="text-[10px] uppercase text-green-400 font-bold tracking-wider flex items-center">
                                                <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-2 animate-pulse" />
                                                Google Meet REST Server (v2)
                                            </p>
                                            {(googleEvent.spaceDetails && googleEvent.spaceDetails.error) ? (
                                                <div className="text-xs text-red-400 p-2 bg-red-950/40 border border-red-900/50 rounded-md">
                                                    REST API {googleEvent.spaceDetails.status}<br/>
                                                    Google prevents free standard Gmail accounts from accessing this API endpoint.
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-xs text-gray-300">Sessions Found: {googleEvent.totalSessionsFound}</p>
                                                    <p className="text-xs text-gray-400 mt-2 mb-1">Live Connected Participants:</p>
                                                    <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-thin">
                                                        {googleEvent.participants?.length === 0 && <p className="text-xs text-gray-500 italic">No one has connected to the meet yet.</p>}
                                                        {googleEvent.participants?.map((p: any, i: number) => (
                                                            <div key={i} className="text-[10px] bg-white/10 px-2 py-1.5 rounded text-gray-200 truncate border border-white/5 shadow-inner">
                                                                Participant Entry: {p.name}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}
