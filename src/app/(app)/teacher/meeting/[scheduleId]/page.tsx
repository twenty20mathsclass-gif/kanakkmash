'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { Schedule } from '@/lib/definitions';
import { Loader2, ArrowLeft, Video, Lock, Unlock, CheckCircle2, Users, PhoneOff, Timer, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function TeacherMeetingPage() {
    const params = useParams();
    const router = useRouter();
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();

    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [releasing, setReleasing] = useState(false);
    const [isReleased, setIsReleased] = useState(false);
    const [ending, setEnding] = useState(false);
    const [isEnded, setIsEnded] = useState(false);

    // Live session timer (starts when link is released)
    const [sessionSeconds, setSessionSeconds] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const scheduleId = params?.scheduleId as string;

    useEffect(() => {
        if (!firestore || !scheduleId) return;
        const fetchSchedule = async () => {
            try {
                const snap = await getDoc(doc(firestore, 'schedules', scheduleId));
                if (!snap.exists()) { setError('Class not found.'); return; }
                const data = { id: snap.id, ...snap.data() } as Schedule;
                setSchedule(data);
                setIsReleased(data.meetLinkReleased === true);
                setIsEnded(data.meetEnded === true);
            } catch { setError('Failed to load class details.'); }
            finally { setLoading(false); }
        };
        fetchSchedule();
    }, [firestore, scheduleId]);

    // Start live timer when link is released
    useEffect(() => {
        if (isReleased && !isEnded) {
            timerRef.current = setInterval(() => setSessionSeconds(s => s + 1), 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isReleased, isEnded]);

    /** Release the link: save timestamp + set meetLinkReleased = true */
    const handleReleaseLink = async () => {
        if (!firestore || !scheduleId || isReleased) return;
        setReleasing(true);
        try {
            await updateDoc(doc(firestore, 'schedules', scheduleId), {
                meetLinkReleased: true,
                meetReleasedAt: serverTimestamp(),
            });
            setIsReleased(true);
            toast({ title: '🔓 Link Released!', description: 'Students can now see and join this meeting.' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Failed to release link', description: e.message });
        } finally { setReleasing(false); }
    };

    /** End meeting for ALL participants: mark Firestore so students lose access */
    const handleEndForAll = async () => {
        if (!firestore || !scheduleId || isEnded) return;
        setEnding(true);
        try {
            await updateDoc(doc(firestore, 'schedules', scheduleId), {
                meetEnded: true,
                meetEndedAt: serverTimestamp(),
                meetLinkReleased: false,   // re-lock the link
            });

            setIsEnded(true);
            if (timerRef.current) clearInterval(timerRef.current);

            toast({
                title: '📴 Meeting Ended',
                description: `Session closed for all participants. Duration: ${formatDuration(sessionSeconds)}.`,
            });

            setTimeout(() => router.push('/teacher/create-schedule'), 2000);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Failed to end meeting', description: e.message });
        } finally { setEnding(false); }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p>Loading meeting room…</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
                <div className="flex flex-col items-center gap-4 text-center max-w-sm px-4">
                    <Video className="h-12 w-12 text-muted-foreground" />
                    <h2 className="text-xl font-bold">Meeting Error</h2>
                    <p className="text-muted-foreground">{error}</p>
                    <Button onClick={() => router.back()} variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
            {/* ── Header bar ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-gray-800 shrink-0 gap-2">
                {/* Left: title + badge */}
                <div className="flex items-center gap-2 text-white min-w-0">
                    <Video className="h-4 w-4 text-green-400 shrink-0" />
                    <span className="font-semibold text-sm truncate">{schedule?.title}</span>
                    <Badge className="shrink-0 bg-green-700 text-white text-[10px] px-1.5 py-0 border-none">
                        Moderator
                    </Badge>
                    {/* Live session timer */}
                    {isReleased && !isEnded && (
                        <span className="flex items-center gap-1 text-xs text-amber-300 font-mono ml-1">
                            <Timer className="h-3 w-3" />
                            {formatDuration(sessionSeconds)}
                        </span>
                    )}
                </div>

                {/* Right: action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Release Link */}
                    {!isEnded && (
                        <Button
                            size="sm"
                            onClick={handleReleaseLink}
                            disabled={releasing || isReleased}
                            className={cn(
                                'h-8 text-xs gap-1.5 font-semibold',
                                isReleased
                                    ? 'bg-green-700 hover:bg-green-700 text-white cursor-default'
                                    : 'bg-amber-500 hover:bg-amber-400 text-black'
                            )}
                        >
                            {releasing ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Releasing…</>
                            ) : isReleased ? (
                                <><CheckCircle2 className="h-3.5 w-3.5" /> Released</>
                            ) : (
                                <><Unlock className="h-3.5 w-3.5" /> Release Link</>
                            )}
                        </Button>
                    )}

                    {/* End for All — visible only after link is released */}
                    {isReleased && !isEnded && (
                        <Button
                            size="sm"
                            onClick={handleEndForAll}
                            disabled={ending}
                            className="h-8 text-xs gap-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold"
                        >
                            {ending ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Ending…</>
                            ) : (
                                <><PhoneOff className="h-3.5 w-3.5" /> End for All</>
                            )}
                        </Button>
                    )}

                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-400 hover:text-white h-7 text-xs"
                        onClick={() => router.push('/teacher/create-schedule')}
                    >
                        <ArrowLeft className="mr-1 h-3 w-3" /> Back
                    </Button>
                </div>
            </div>

            {/* ── Status bar below header ─────────────────────────── */}
            {!isReleased && !isEnded && (
                <div className="flex items-center justify-center gap-2 py-1.5 bg-amber-900/60 text-amber-200 text-xs font-medium shrink-0">
                    <Lock className="h-3 w-3" />
                    <span>Students cannot join yet — click <strong>Release Link</strong> when ready</span>
                </div>
            )}
            {isReleased && !isEnded && (
                <div className="flex items-center justify-center gap-2 py-1.5 bg-green-900/60 text-green-200 text-xs font-medium shrink-0">
                    <Users className="h-3 w-3" />
                    <span>Students can now join · Click <strong>End for All</strong> to close the session for everyone</span>
                </div>
            )}
            {isEnded && (
                <div className="flex items-center justify-center gap-2 py-1.5 bg-red-900/60 text-red-200 text-xs font-medium shrink-0">
                    <PhoneOff className="h-3 w-3" />
                    <span>Meeting ended · Session duration saved · Returning to dashboard…</span>
                </div>
            )}

            {/* ── Main content: Google Meet CTA ───────────────────── */}
            <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 text-center">
                {/* Google Meet logo mark */}
                <div className="relative">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#00BCD4] via-[#1976D2] to-[#7B1FA2] flex items-center justify-center shadow-2xl shadow-blue-500/30">
                        <Video className="h-12 w-12 text-white" />
                    </div>
                    {isReleased && !isEnded && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500" />
                        </span>
                    )}
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white">{schedule?.title}</h2>
                    <p className="text-gray-400 text-sm">
                        {isEnded
                            ? 'This session has ended.'
                            : 'Click the button below to open Google Meet in a new tab.'}
                    </p>
                    {schedule?.meetLink && !isEnded && (
                        <p className="text-gray-600 text-xs font-mono break-all max-w-md mx-auto">
                            {schedule.meetLink}
                        </p>
                    )}
                </div>

                {!isEnded && schedule?.meetLink && (
                    <a
                        href={schedule.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                            'inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-semibold text-lg',
                            'bg-gradient-to-r from-[#1976D2] to-[#1565C0]',
                            'hover:from-[#1E88E5] hover:to-[#1976D2]',
                            'shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50',
                            'transition-all duration-200 transform hover:scale-105 active:scale-95'
                        )}
                    >
                        <ExternalLink className="h-5 w-5" />
                        Join Google Meet
                    </a>
                )}

                {/* Instructions */}
                {!isReleased && !isEnded && (
                    <div className="bg-gray-900 border border-gray-800 rounded-xl px-6 py-4 max-w-md text-left space-y-2">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Teacher workflow</p>
                        <ol className="text-sm text-gray-300 space-y-1.5 list-decimal list-inside">
                            <li>Join Google Meet using the button above</li>
                            <li>Click <span className="text-amber-400 font-medium">Release Link</span> to let students join</li>
                            <li>When done, click <span className="text-red-400 font-medium">End for All</span> to lock everyone out</li>
                        </ol>
                    </div>
                )}
            </div>
        </div>
    );
}

function formatDuration(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}
