'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { Schedule } from '@/lib/definitions';
import Script from 'next/script';
import { Loader2, ArrowLeft, Video, Lock, Unlock, CheckCircle2, Users } from 'lucide-react';
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

    const scheduleId = params?.scheduleId as string;

    // Step 1: Fetch the schedule from Firestore
    useEffect(() => {
        if (!firestore || !scheduleId) return;
        const fetchSchedule = async () => {
            try {
                const snap = await getDoc(doc(firestore, 'schedules', scheduleId));
                if (!snap.exists()) {
                    setError('Class not found.');
                    return;
                }
                const data = { id: snap.id, ...snap.data() } as Schedule;
                setSchedule(data);
                setIsReleased(data.meetLinkReleased === true);
            } catch (e) {
                setError('Failed to load class details.');
            } finally {
                setLoading(false);
            }
        };
        fetchSchedule();
    }, [firestore, scheduleId]);

    // Step 2: Once both the schedule and Jitsi script are ready, init the meeting
    useEffect(() => {
        if (!scriptReady || !schedule?.meetLink || !user || !jitsiContainerRef.current) return;
        if (apiRef.current) return; // already initialized

        // Extract the room name from the meetLink URL
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

            apiRef.current.addEventListener('readyToClose', () => {
                router.push('/teacher/create-schedule');
            });
        } catch (e) {
            console.error('[Meeting] Jitsi init error:', e);
            setError('Failed to start the meeting. Please try again.');
        }

        return () => {
            if (apiRef.current) {
                apiRef.current.dispose();
                apiRef.current = null;
            }
        };
    }, [scriptReady, schedule, user, router]);

    /** Release the meeting link so students can join */
    const handleReleaseLink = async () => {
        if (!firestore || !scheduleId || isReleased) return;
        setReleasing(true);
        try {
            await updateDoc(doc(firestore, 'schedules', scheduleId), {
                meetLinkReleased: true,
            });
            setIsReleased(true);
            toast({
                title: '🔓 Link Released!',
                description: 'Students can now see and join this meeting.',
            });
        } catch (e: any) {
            toast({
                variant: 'destructive',
                title: 'Failed to release link',
                description: e.message || 'Please try again.',
            });
        } finally {
            setReleasing(false);
        }
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
                {/* Header bar */}
                <div className="flex items-center justify-between px-4 py-2 bg-gray-900 shrink-0 gap-3">
                    {/* Left: title */}
                    <div className="flex items-center gap-2 text-white min-w-0">
                        <Video className="h-4 w-4 text-green-400 shrink-0" />
                        <span className="font-semibold text-sm truncate">{schedule?.title}</span>
                        <Badge className="shrink-0 bg-green-600 text-white text-[10px] px-1.5 py-0 border-none">
                            Moderator
                        </Badge>
                    </div>

                    {/* Right: Release link + back */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Release Link Button */}
                        <Button
                            size="sm"
                            onClick={handleReleaseLink}
                            disabled={releasing || isReleased}
                            className={cn(
                                'h-8 text-xs gap-1.5 font-semibold transition-all',
                                isReleased
                                    ? 'bg-green-700 hover:bg-green-700 text-white cursor-default'
                                    : 'bg-amber-500 hover:bg-amber-400 text-black'
                            )}
                        >
                            {releasing ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Releasing…</>
                            ) : isReleased ? (
                                <><CheckCircle2 className="h-3.5 w-3.5" /> Link Released to Students</>
                            ) : (
                                <><Unlock className="h-3.5 w-3.5" /> Release Link to Students</>
                            )}
                        </Button>

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

                {/* Meeting status indicator below header */}
                {!isReleased && (
                    <div className="flex items-center justify-center gap-2 py-1.5 bg-amber-900/60 text-amber-200 text-xs font-medium shrink-0">
                        <Lock className="h-3 w-3" />
                        <span>Students cannot join yet — click <strong>"Release Link to Students"</strong> when you&apos;re ready</span>
                    </div>
                )}
                {isReleased && (
                    <div className="flex items-center justify-center gap-2 py-1.5 bg-green-900/60 text-green-200 text-xs font-medium shrink-0">
                        <Users className="h-3 w-3" />
                        <span>Students can now see and join this meeting</span>
                    </div>
                )}

                {/* Jitsi mount point */}
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
