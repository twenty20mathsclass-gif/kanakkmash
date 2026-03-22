'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useFirebase, useUser } from '@/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import type { RecordedClass } from '@/lib/definitions';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Play } from 'lucide-react';
import { Reveal } from '@/components/shared/reveal';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function RecordedClassesPage() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const [classes, setClasses] = useState<RecordedClass[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore || !user) return;

        const q = query(collection(firestore, 'recordedClasses'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const all_classes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecordedClass));

            // Client-side filtering based on user's profile
            const relevant_classes = all_classes.filter(rc => {
                if (rc.studentId === user.id) return true;
                if (!rc.studentId && rc.courseModel === user.courseModel) {
                     if (user.courseModel === 'COMPETITIVE EXAM') {
                        return rc.competitiveExam === user.competitiveExam;
                    }
                    if (rc.class === user.class) {
                        if (user.class !== 'DEGREE') {
                            return rc.syllabus === user.syllabus;
                        }
                        return true;
                    }
                }
                return false;
            }).sort((a,b) => {
                const timeA = a.createdAt?.toMillis() || 0;
                const timeB = b.createdAt?.toMillis() || 0;
                return timeB - timeA;
            });
            
            setClasses(relevant_classes);
            setLoading(false);
        }, (serverError: any) => {
            if (serverError.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'recordedClasses', operation: 'list' }, { cause: serverError }));
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, user]);

    return (
    <div className="space-y-10">
        <Reveal>
            <div className="text-center">
                <h1 className="text-4xl font-bold font-headline tracking-tight sm:text-5xl">Library</h1>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                    Review lessons and concepts at your own pace from our recorded session library.
                </p>
            </div>
        </Reveal>

        {loading ? (
            <div className="flex justify-center items-center py-24">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        ) : classes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
                {classes.map((rc, index) => (
                    <Reveal key={rc.id} delay={0.05 * index}>
                        <Link href={`/recorded-classes/${rc.id}`} className="group block space-y-3">
                            {/* Thumbnail Container */}
                            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted shadow-sm transition-all group-hover:shadow-md">
                                <Image 
                                    src={rc.thumbnailUrl} 
                                    alt={rc.title} 
                                    fill 
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    unoptimized
                                />
                                {/* Overlay with play button */}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                                    <div className="rounded-full bg-primary p-3 opacity-0 shadow-lg transition-all duration-300 group-hover:opacity-100 group-hover:scale-110">
                                        <Play className="h-6 w-6 fill-white text-white translate-x-0.5" />
                                    </div>
                                </div>
                                {/* Duration Placeholder (could be dynamic if we had durations) */}
                                <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                    12:45
                                </div>
                            </div>

                            {/* Content Info */}
                            <div className="flex gap-3 px-1">
                                <Avatar className="h-9 w-9 shrink-0 shadow-sm">
                                    <AvatarImage src={rc.teacherAvatarUrl} alt={rc.teacherName}/>
                                    <AvatarFallback>{rc.teacherName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1 overflow-hidden">
                                    <h3 className="font-bold text-[15px] leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                                        {rc.title}
                                    </h3>
                                    <div className="text-xs text-muted-foreground space-y-0.5">
                                        <p className="font-medium hover:text-foreground transition-colors">{rc.teacherName}</p>
                                        <div className="flex items-center gap-1.5">
                                            <span>8.4K views</span>
                                            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                                            <span>2 days ago</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </Reveal>
                ))}
            </div>
        ) : (
            <div className="text-center text-muted-foreground py-24 border-2 border-dashed rounded-2xl">
                <p className="text-lg font-medium">No recorded classes available for you yet.</p>
                <p className="text-sm">Check back soon for updated lessons!</p>
            </div>
        )}
    </div>
    )
}
