
'use client';
import { useState, useEffect } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { BlogPost } from '@/lib/definitions';
import { Loader2 } from 'lucide-react';
import { Reveal } from '@/components/shared/reveal';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { BlogPostForm } from '@/components/shared/blog-post-form';
import { useRouter } from 'next/navigation';

type PageProps = {
    params: {
        postId: string;
    };
};

export const dynamic = 'force-dynamic';

export default function EditBlogPostPage({ params }: PageProps) {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const router = useRouter();
    const { postId } = params;

    const [post, setPost] = useState<BlogPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!firestore || !postId || !user) return;
        setLoading(true);

        const fetchPost = async () => {
            try {
                const postRef = doc(firestore, 'blogPosts', postId);
                const postSnap = await getDoc(postRef);

                if (postSnap.exists()) {
                    const postData = { id: postSnap.id, ...postSnap.data() } as BlogPost;

                    // Security check: only admin or the author teacher can edit
                    if (user.role === 'admin' || (user.role === 'teacher' && user.id === postData.authorId)) {
                        setPost(postData);
                    } else {
                        setError('You are not authorized to edit this post.');
                        router.replace(`/blog/${postId}`); // Redirect if not authorized
                    }
                    
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
                    setError('Failed to load blog post for editing.');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchPost();

    }, [firestore, postId, user, router]);

    return (
        <div className="space-y-8">
             <Reveal>
                <div>
                    <h1 className="text-3xl font-bold font-headline">Edit Blog Post</h1>
                    <p className="text-muted-foreground">Refine your post and update your content.</p>
                </div>
            </Reveal>
            <Reveal delay={0.2}>
                {loading ? (
                    <div className="flex justify-center items-center py-24">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : post ? (
                    <BlogPostForm post={post} />
                ) : (
                    <div className="text-center text-muted-foreground py-24 border-2 border-dashed rounded-lg">
                        <p className="text-lg text-destructive">{error || 'Could not load post for editing.'}</p>
                    </div>
                )}
            </Reveal>
        </div>
    )
}
