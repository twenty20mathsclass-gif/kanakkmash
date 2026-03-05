
'use client';
import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import type { BlogPost } from '@/lib/definitions';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { Reveal } from '@/components/shared/reveal';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default function BlogPage() {
    const { firestore } = useFirebase();
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;
        setLoading(true);

        const postsQuery = query(collection(firestore, 'blogPosts'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
            const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
            setPosts(fetchedPosts);
            setLoading(false);
        }, (serverError: any) => {
            if (serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({ path: 'blogPosts', operation: 'list' }, { cause: serverError });
                errorEmitter.emit('permission-error', permissionError);
            } else {
                console.warn("Firestore error fetching posts:", serverError);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);

    return (
    <div className="space-y-8">
        <Reveal>
            <div className="text-center">
                <h1 className="text-4xl font-bold font-headline tracking-tight sm:text-5xl">Our Blog</h1>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                    News, insights, and updates from the team at kanakkmash.
                </p>
            </div>
        </Reveal>

        {loading ? (
            <div className="flex justify-center items-center py-24">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        ) : posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {posts.map((post, index) => (
                    <Reveal key={post.id} delay={0.1 * index}>
                        <Card className="h-full flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                            <Link href={`/blog/${post.id}`} className="block">
                                <div className="aspect-video relative">
                                    <Image 
                                        src={post.imageUrl || 'https://picsum.photos/seed/placeholder/600/400'} 
                                        alt={post.title} 
                                        fill 
                                        className="object-cover" 
                                    />
                                </div>
                            </Link>
                            <CardHeader>
                                <Link href={`/blog/${post.id}`} className="block">
                                    <h2 className="font-headline text-xl font-bold hover:text-primary transition-colors line-clamp-2">{post.title}</h2>
                                </Link>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col">
                                <p className="text-muted-foreground line-clamp-3 flex-grow">{post.content.replace(/<[^>]*>?/gm, '').substring(0, 120)}...</p>
                                <div className="flex items-center gap-3 mt-4 pt-4 border-t">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={post.authorAvatarUrl} alt={post.authorName}/>
                                        <AvatarFallback>{post.authorName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-semibold">{post.authorName}</p>
                                        <p className="text-xs text-muted-foreground">{post.createdAt ? format(post.createdAt.toDate(), 'PPP') : ''}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Reveal>
                ))}
            </div>
        ) : (
            <div className="text-center text-muted-foreground py-24 border-2 border-dashed rounded-lg">
                <p className="text-lg">No blog posts yet.</p>
                <p>Check back soon for news and updates!</p>
            </div>
        )}
    </div>
  );
}
