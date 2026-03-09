
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useFirebase, useUser } from '@/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import type { RecordedClass } from '@/lib/definitions';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, PlayCircle } from 'lucide-react';
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
            }).sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            
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
    <div className="space-y-8">
        <Reveal>
            <div className="text-center">
                <h1 className="text-4xl font-bold font-headline tracking-tight sm:text-5xl">Recorded Classes</h1>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                    Catch up on missed classes or review key concepts at your own pace.
                </p>
            </div>
        </Reveal>

        {loading ? (
            <div className="flex justify-center items-center py-24">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        ) : classes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {classes.map((rc, index) => (
                    <Reveal key={rc.id} delay={0.1 * index}>
                        <Card className="h-full flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                            <Link href={`/recorded-classes/${rc.id}`} className="block">
                                <div className="aspect-video relative group">
                                    <Image 
                                        src={rc.thumbnailUrl} 
                                        alt={rc.title} 
                                        fill 
                                        className="object-cover" 
                                    />
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <PlayCircle className="h-16 w-16 text-white/80"/>
                                    </div>
                                </div>
                            </Link>
                            <CardHeader>
                                <Link href={`/recorded-classes/${rc.id}`} className="block">
                                    <h2 className="font-headline text-xl font-bold hover:text-primary transition-colors line-clamp-2">{rc.title}</h2>
                                </Link>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col">
                                <p className="text-muted-foreground line-clamp-3 flex-grow">{rc.description}</p>
                                <div className="flex items-center gap-3 mt-4 pt-4 border-t">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={rc.teacherAvatarUrl} alt={rc.teacherName}/>
                                        <AvatarFallback>{rc.teacherName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-semibold">{rc.teacherName}</p>
                                        <p className="text-xs text-muted-foreground">Teacher</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Reveal>
                ))}
            </div>
        ) : (
            <div className="text-center text-muted-foreground py-24 border-2 border-dashed rounded-lg">
                <p className="text-lg">No recorded classes available for you yet.</p>
                <p>Check back soon!</p>
            </div>
        )}
    </div>
    )
}
