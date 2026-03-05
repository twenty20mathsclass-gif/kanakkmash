'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFirebase } from '@/firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import type { Testimonial } from '@/lib/definitions';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Quote, PlayCircle, ExternalLink, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/shared/reveal';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function TestimonialsSection() {
    const { firestore } = useFirebase();
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!firestore) return;
        setLoading(true);
        // Fetch only the 3 most recent testimonials for the home page
        const testimonialsQuery = query(collection(firestore, 'testimonials'), orderBy('createdAt', 'desc'), limit(3));

        const unsubscribe = onSnapshot(testimonialsQuery, (snapshot) => {
            const fetchedTestimonials = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Testimonial));
            setTestimonials(fetchedTestimonials);
            setLoading(false);
        }, (serverError: any) => {
            if (serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({ path: 'testimonials', operation: 'list' }, { cause: serverError });
                errorEmitter.emit('permission-error', permissionError);
            } else {
                console.warn("Firestore error fetching testimonials:", serverError);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);

    const getYouTubeEmbedUrl = (url: string) => {
        if (!url) return null;
        let videoId;
        if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        } else if (url.includes('youtube.com/watch?v=')) {
            videoId = new URL(url).searchParams.get('v');
        } else if (url.includes('youtube.com/embed/')) {
            videoId = url.split('/embed/')[1].split('?')[0];
        }
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    };

    const videoUrlToEmbed = getYouTubeEmbedUrl(selectedVideoUrl || '');

    return (
        <section className="py-16 sm:py-24 bg-secondary/30">
            <div className="container mx-auto px-4 md:px-6">
                <Reveal>
                    <div className="text-center">
                        <h2 className="text-4xl font-bold font-headline tracking-tight sm:text-5xl">What Our Students Say</h2>
                        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                            Discover how our students have excelled with our expert guidance and personalized learning approach.
                        </p>
                    </div>
                </Reveal>

                {loading ? (
                    <div className="flex justify-center items-center py-24">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : testimonials.length > 0 ? (
                    <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {testimonials.map((testimonial, index) => (
                            <Reveal key={testimonial.id} delay={0.1 * index}>
                                <Card className="h-full flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                                    <CardContent className="p-6 flex flex-col flex-grow">
                                        <Quote className="w-8 h-8 text-primary mb-4" />
                                        <p className="text-muted-foreground flex-grow line-clamp-4">"{testimonial.quote}"</p>
                                        <div className="mt-6 flex items-center gap-4">
                                            <div className="relative">
                                                <Avatar className="h-14 w-14 border-2 border-primary">
                                                    <AvatarImage src={testimonial.imageUrl} alt={testimonial.studentName} />
                                                    <AvatarFallback>{testimonial.studentName.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                {testimonial.videoUrl && (
                                                    <button
                                                        onClick={() => setSelectedVideoUrl(testimonial.videoUrl!)}
                                                        className="absolute -bottom-2 -right-2 bg-background rounded-full p-0.5"
                                                    >
                                                        <PlayCircle className="h-7 w-7 text-primary hover:scale-110 transition-transform" />
                                                    </button>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-lg">{testimonial.studentName}</p>
                                                {testimonial.link && (
                                                    <a href={testimonial.link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                                                        View Profile <ExternalLink className="h-3 w-3"/>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Reveal>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground mt-12 py-24 border-2 border-dashed rounded-lg">
                        <p className="text-lg">Testimonials are coming soon.</p>
                        <p>Check back later to see what our students are saying!</p>
                    </div>
                )}
                 {testimonials.length > 0 && (
                    <Reveal>
                        <div className="mt-12 text-center">
                            <Button asChild variant="outline" size="lg">
                                <Link href="/testimonials">
                                    View All Testimonials <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </Reveal>
                )}
            </div>
             <AlertDialog open={!!selectedVideoUrl} onOpenChange={() => setSelectedVideoUrl(null)}>
                <AlertDialogContent className="max-w-3xl p-2">
                    {videoUrlToEmbed ? (
                        <div className="aspect-video">
                            <iframe
                                src={videoUrlToEmbed}
                                title="Testimonial Video"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full rounded-md"
                            ></iframe>
                        </div>
                    ) : (
                         <AlertDialogHeader>
                            <AlertDialogTitle>Invalid Video URL</AlertDialogTitle>
                            <AlertDialogDescription>The provided video link is not a valid YouTube URL.</AlertDialogDescription>
                         </AlertDialogHeader>
                    )}
                </AlertDialogContent>
            </AlertDialog>
        </section>
    );
}
