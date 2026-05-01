'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { Schedule } from '@/lib/definitions';
import Script from 'next/script';
import { Loader2, ArrowLeft, Video, Lock, Unlock, CheckCircle2, Users, PhoneOff, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

declare global {
    interface Window {
        JitsiMeetExternalAPI: any;
    }
}

export default function TeacherMeetingPage() {
    const params = useParams();
    const router = useRouter();
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const jitsiContainerRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<any>(null);

    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [scriptReady, setScriptReady] = useState(false);
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

    // Jitsi init
    useEffect(() => {
        if (!scriptReady || !schedule?.meetLink || !user || !jitsiContainerRef.current) return;
        if (apiRef.current) return;

        const url = new URL(schedule.meetLink);
        const roomName = url.pathname.replace('/', '');
        const domain = url.hostname;

        try {
            apiRef.current = new window.JitsiMeetExternalAPI(domain, {
                roomName,
                parentNode: jitsiContainerRef.current,
                width: '100%',
                height: '100%',
                userInfo: {
                    displayName: user.name || 'Teacher',
                    email: user.email || '',
                },
                configOverwrite: {
                    startWithAudioMuted: false,
                    startWithVideoMuted: false,
                    prejoinPageEnabled: false,
                    disableDeepLinking: true,
                    enableNoisyMicDetection: true,
                    defaultRemoteDisplayName: 'Student',
                    toolbarButtons: [
                        'microphone', 'camera', 'desktop', 'fullscreen',
                        'fodeviceselection', 'hangup', 'chat', 'recording',
                        'sharedvideo', 'settings', 'raisehand',
                        'videoquality', 'filmstrip', 'shortcuts',
                        'tileview', 'mute-everyone', 'mute-video-everyone',
                        'participants-pane', 'whiteboard',
                    ],
                },
                interfaceConfigOverwrite: {
                    TOOLBAR_ALWAYS_VISIBLE: false,
                    HIDE_INVITE_MORE_HEADER: true,
                    MOBILE_APP_PROMO: false,
                },
            });

            // When Jitsi's built-in hang-up is clicked, also end for all
            apiRef.current.addEventListener('readyToClose', () => {
                router.push('/teacher/create-schedule');
            });
        } catch (e) {
            console.error('[Meeting] Jitsi init error:', e);
            setError('Failed to start the meeting. Please try again.');
        }

        return () => {
            if (apiRef.current) { apiRef.current.dispose(); apiRef.current = null; }
        };
    }, [scriptReady, schedule, user, router]);

    /** Release the link: save timestamp + set meetLinkReleased = true */
    const handleReleaseLink = async () => {
        if (!firestore || !scheduleId || isReleased) return;
        setReleasing(true);
        try {
            await updateDoc(doc(firestore, 'schedules', scheduleId), {
                meetLinkReleased: true,
                meetReleasedAt: serverTimestamp(),  // <-- session start timestamp
            });
            setIsReleased(true);
            toast({ title: '🔓 Link Released!', description: 'Students can now see and join this meeting.' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Failed to release link', description: e.message });
        } finally { setReleasing(false); }
    };

    /** End meeting for ALL participants: Jitsi endConference + Firestore timestamp */
    const handleEndForAll = async () => {
        if (!firestore || !scheduleId || isEnded) return;
        setEnding(true);
        try {
            // 1. Kick everyone via Jitsi External API (moderator only)
            if (apiRef.current) {
                apiRef.current.executeCommand('endConference');
            }

            // 2. Write end timestamp + lock Firestore so no one can re-join
            await updateDoc(doc(firestore, 'schedules', scheduleId), {
                meetEnded: true,
                meetEndedAt: serverTimestamp(),     // <-- session end timestamp
                meetLinkReleased: false,             // re-lock the link
            });

            setIsEnded(true);
            if (timerRef.current) clearInterval(timerRef.current);

            toast({
                title: '📴 Meeting Ended',
                description: `Session closed for all participants. Duration: ${formatDuration(sessionSeconds)}.`,
            });

            // Navigate back after 2s
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
        <>
            <Script
                src="https://meet.jit.si/external_api.js"
                strategy="afterInteractive"
                onReady={() => setScriptReady(true)}
            />

            <div className="fixed inset-0 z-50 bg-black flex flex-col">
                {/* ── Header bar ─────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-3 py-2 bg-gray-900 shrink-0 gap-2">
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

                {/* ── Jitsi mount point ──────────────────────────────── */}
                <div ref={jitsiContainerRef} className="flex-1 w-full" />

                {!scriptReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black">
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <p className="text-sm">Connecting to meeting room…</p>
                        </div>
                    </div>
                )}
            </div>
        </>
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
