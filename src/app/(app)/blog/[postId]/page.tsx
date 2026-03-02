
'use client';
import { useState, useEffect, use } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { BlogPost } from '@/lib/definitions';
import { Loader2, Calendar, Edit } from 'lucide-react';
import { Reveal } from '@/components/shared/reveal';
import Image from 'next/image';
import { format } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type PageProps = {
    params: {
        postId: string;
    };
};

export const dynamic = 'force-dynamic';

export default function BlogPostPage({ params }: PageProps) {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const resolvedParams = use(params as Promise<{ postId: string; }>);
    const { postId } = resolvedParams;

    const [post, setPost] = useState<BlogPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!firestore || !postId) return;
        setLoading(true);

        const fetchPost = async () => {
            try {
                const postRef = doc(firestore, 'blogPosts', postId);
                const postSnap = await getDoc(postRef);

                if (postSnap.exists()) {
                    setPost({ id: postSnap.id, ...postSnap.data() } as BlogPost);
                } else {
                    setError('Blog post not found.');
                }
            } catch (e: any) {
                console.warn(e);
                if (e.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({ path: `blogPosts/${postId}`, operation: 'get' }, { cause: e });
                    errorEmitter.emit('permission-error', permissionError);
                    setError('You do not have permission to view this post.');
                } else {
                    setError('Failed to load blog post.');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchPost();

    }, [firestore, postId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (error || !post) {
        return (
            <div className="text-center py-24">
                <h2 className="text-2xl font-bold text-destructive">{error || 'Could not load the post.'}</h2>
            </div>
        )
    }

    const canEdit = user && (user.role === 'admin' || (user.role === 'teacher' && user.id === post.authorId));

    return (
        <article className="max-w-4xl mx-auto py-8">
            <Reveal>
                <header className="space-y-4 text-center">
                    <h1 className="text-4xl font-bold font-headline tracking-tight sm:text-5xl">{post.title}</h1>
                    <div className="flex items-center justify-center gap-4 text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={post.authorAvatarUrl} alt={post.authorName} />
                                <AvatarFallback>{post.authorName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span>{post.authorName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <time dateTime={post.createdAt.toDate().toISOString()}>
                                {format(post.createdAt.toDate(), 'PPP')}
                            </time>
                        </div>
                        {canEdit && (
                            <Button asChild variant="outline" size="sm">
                                <Link href={`/blog/${post.id}/edit`}>
                                    <Edit className="mr-2 h-4 w-4"/> Edit Post
                                </Link>
                            </Button>
                        )}
                    </div>
                </header>
            </Reveal>

            <Reveal delay={0.2}>
                <div className="relative w-full aspect-video my-8 rounded-lg overflow-hidden shadow-lg">
                    <Image src={post.imageUrl || ''} alt={post.title} fill className="object-cover" />
                </div>
            </Reveal>
            
            <Reveal delay={0.4}>
                <div 
                    className="prose lg:prose-xl mx-auto"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                />
            </Reveal>
        </article>
    )
}
