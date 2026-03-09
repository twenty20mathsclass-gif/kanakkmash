
'use client';
import { useState, useEffect, use } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import type { BlogPost, BlogComment } from '@/lib/definitions';
import { Loader2, Calendar, Edit, Heart, MessageCircle, Send, Trash2 } from 'lucide-react';
import { Reveal } from '@/components/shared/reveal';
import Image from 'next/image';
import { format, formatDistanceToNow } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type PageProps = {
    params: {
        postId: string;
    };
};

export const dynamic = 'force-dynamic';

export default function BlogPostPage({ params }: PageProps) {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const resolvedParams = use(params as Promise<{ postId: string; }>);
    const { postId } = resolvedParams;

    const [post, setPost] = useState<BlogPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [comments, setComments] = useState<BlogComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLiking, setIsLiking] = useState(false);
    const [isCommenting, setIsCommenting] = useState(false);
    const [commentToDelete, setCommentToDelete] = useState<BlogComment | null>(null);
    const [isDeletingComment, setIsDeletingComment] = useState(false);

    useEffect(() => {
        if (!firestore || !postId) return;
        setLoading(true);

        const postRef = doc(firestore, 'blogPosts', postId);
        const unsubscribe = onSnapshot(postRef, (docSnap) => {
            if (docSnap.exists()) {
                setPost({ id: docSnap.id, ...docSnap.data() } as BlogPost);
            } else {
                setError('Blog post not found.');
            }
            setLoading(false);
        }, (e: any) => {
            console.warn(e);
            if (e.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({ path: `blogPosts/${postId}`, operation: 'get' }, { cause: e });
                errorEmitter.emit('permission-error', permissionError);
                setError('You do not have permission to view this post.');
            } else {
                setError('Failed to load blog post.');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, postId]);
    
    useEffect(() => {
        if (!firestore || !postId) return;
        
        const commentsQuery = query(collection(firestore, 'blogPosts', postId, 'comments'), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
            const commentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogComment));
            setComments(commentsData);
        }, (e: any) => {
            console.warn("Error fetching comments:", e);
        });

        return () => unsubscribe();
    }, [firestore, postId]);

    const handleLike = async () => {
        if (!firestore || !user || !post) {
            toast({
                variant: 'destructive',
                title: 'Authentication required',
                description: 'You must be logged in to like a post.',
            });
            return;
        }
        setIsLiking(true);
        const postRef = doc(firestore, 'blogPosts', postId);
        const userHasLiked = post.likes?.includes(user.id);
        
        try {
            if (userHasLiked) {
                await updateDoc(postRef, {
                    likes: arrayRemove(user.id)
                });
            } else {
                await updateDoc(postRef, {
                    likes: arrayUnion(user.id)
                });
            }
        } catch (e: any) {
            console.warn("Error liking post:", e);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not update like status.',
            });
        } finally {
            setIsLiking(false);
        }
    };

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !user || !newComment.trim()) {
             toast({
                variant: 'destructive',
                title: 'Cannot post comment',
                description: 'You must be logged in and write a comment.',
            });
            return;
        }
        setIsCommenting(true);
        
        const commentsCollection = collection(firestore, 'blogPosts', postId, 'comments');
        const commentData = {
            authorId: user.id,
            authorName: user.name,
            authorAvatarUrl: user.avatarUrl,
            text: newComment,
            createdAt: serverTimestamp(),
        };

        try {
            await addDoc(commentsCollection, commentData);
            setNewComment('');
        } catch (e: any) {
            console.warn("Error posting comment:", e);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not post your comment.',
            });
        } finally {
            setIsCommenting(false);
        }
    };

    const handleDeleteComment = async () => {
        if (!firestore || !commentToDelete) return;
        setIsDeletingComment(true);
        
        const commentRef = doc(firestore, 'blogPosts', postId, 'comments', commentToDelete.id);
        try {
            await deleteDoc(commentRef);
            toast({ title: 'Comment deleted' });
        } catch (e: any) {
             console.warn("Error deleting comment:", e);
             toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the comment.' });
        } finally {
            setIsDeletingComment(false);
            setCommentToDelete(null);
        }
    }

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
    const userHasLiked = user ? post.likes?.includes(user.id) : false;

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

            {post.imageUrl && (
                <Reveal delay={0.2}>
                    <div className="relative w-full aspect-video my-8 rounded-lg overflow-hidden shadow-lg">
                        <Image src={post.imageUrl} alt={post.title} fill className="object-cover" />
                    </div>
                </Reveal>
            )}
            
            <Reveal delay={0.4}>
                <div 
                    className="prose lg:prose-xl mx-auto"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                />
            </Reveal>

            <Reveal delay={0.5}>
                <Separator className="my-8" />
                <div className="flex items-center gap-6">
                    <Button variant="ghost" onClick={handleLike} disabled={isLiking || !user} className="flex items-center gap-2">
                        <Heart className={cn("h-5 w-5", userHasLiked && "fill-destructive text-destructive")} />
                        <span>{post.likes?.length || 0} Likes</span>
                    </Button>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <MessageCircle className="h-5 w-5" />
                        <span>{comments.length} Comments</span>
                    </div>
                </div>
            </Reveal>

            <Reveal delay={0.6}>
                <Separator className="my-8" />
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold font-headline">Comments</h2>
                    {user ? (
                        <form onSubmit={handleCommentSubmit} className="flex items-start gap-4">
                            <Avatar>
                                <AvatarImage src={user.avatarUrl} alt={user.name} />
                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." />
                                <Button type="submit" disabled={isCommenting || !newComment.trim()} className="mt-2">
                                    {isCommenting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                    Post
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <div className="text-center p-4 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">
                                <Link href="/sign-in" className="text-primary underline">Sign in</Link> to leave a comment.
                            </p>
                        </div>
                    )}

                    <div className="space-y-6">
                        {comments.map(comment => (
                            <div key={comment.id} className="flex items-start gap-4">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={comment.authorAvatarUrl} alt={comment.authorName} />
                                    <AvatarFallback>{comment.authorName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold">{comment.authorName}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : ''}
                                            </p>
                                        </div>
                                        {user && (user.role === 'admin' || user.id === comment.authorId) && (
                                            <Button variant="ghost" size="icon" onClick={() => setCommentToDelete(comment)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
                                    </div>
                                    <p className="mt-2 text-foreground/90 whitespace-pre-wrap">{comment.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Reveal>

            <AlertDialog open={!!commentToDelete} onOpenChange={(open) => !open && setCommentToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete this comment. This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteComment} disabled={isDeletingComment} className="bg-destructive hover:bg-destructive/90">
                             {isDeletingComment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </article>
    )
}
