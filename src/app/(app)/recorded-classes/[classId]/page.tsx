
'use client';
import { useEffect, useState, useRef } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, deleteDoc, getDocs } from 'firebase/firestore';
import type { RecordedClass } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Users, Play, Send, Trash2, Calendar, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/shared/reveal';
import { format, formatDistanceToNow } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
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
    classId: string;
  };
};

type VideoComment = {
    id: string;
    text: string;
    authorId: string;
    authorName: string;
    authorAvatarUrl: string;
    createdAt: any;
};

function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export default function RecordedClassPlayerPage({ params }: PageProps) {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const { classId } = params;

  const [mainVideo, setMainVideo] = useState<RecordedClass | null>(null);
  const [playlist, setPlaylist] = useState<RecordedClass[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<VideoComment | null>(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);

  useEffect(() => {
    if (!firestore || !classId) return;

    const fetchVideoAndPlaylist = async () => {
      setLoading(true);
      try {
        const videoRef = doc(firestore, 'recordedClasses', classId);
        const videoSnap = await getDoc(videoRef);

        if (videoSnap.exists()) {
          const videoData = { id: videoSnap.id, ...videoSnap.data() } as RecordedClass;
          setMainVideo(videoData);

          const playlistQuery = query(
            collection(firestore, 'recordedClasses'),
            where('teacherId', '==', videoData.teacherId)
          );
          const playlistSnap = await getDocs(playlistQuery);
          const playlistData = playlistSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as RecordedClass));
            
          setPlaylist(playlistData.sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
        }
      } catch (error) {
        console.error("Error fetching video data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideoAndPlaylist();
  }, [firestore, classId]);

  useEffect(() => {
    if (!firestore || !classId) return;
    
    const commentsQuery = query(
        collection(firestore, 'recordedClasses', classId, 'comments'),
        orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
        const commentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoComment));
        setComments(commentsData);
    });

    return () => unsubscribe();
  }, [firestore, classId]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user || !newComment.trim()) return;
    setIsCommenting(true);
    
    const commentData = {
        text: newComment,
        authorId: user.id,
        authorName: user.name,
        authorAvatarUrl: user.avatarUrl,
        createdAt: serverTimestamp(),
    };

    try {
        await addDoc(collection(firestore, 'recordedClasses', classId, 'comments'), commentData);
        setNewComment('');
    } catch (e) {
        console.error("Error posting comment:", e);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not post your comment.' });
    } finally {
        setIsCommenting(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!firestore || !commentToDelete) return;
    setIsDeletingComment(true);
    try {
        await deleteDoc(doc(firestore, 'recordedClasses', classId, 'comments', commentToDelete.id));
        toast({ title: 'Comment deleted' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete comment.' });
    } finally {
        setIsDeletingComment(false);
        setCommentToDelete(null);
    }
  };

  const videoId = mainVideo ? getYouTubeVideoId(mainVideo.youtubeUrl) : null;

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  if (!mainVideo) {
    return <div className="flex h-screen items-center justify-center">Video not found.</div>;
  }

  return (
    <div className="container mx-auto py-6 px-4">
        <Button variant="ghost" className="mb-6 rounded-full" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Library
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Video and Info */}
            <div className="lg:col-span-2 space-y-6">
                <Reveal>
                    <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl">
                        {videoId ? (
                            <iframe
                                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                                title={mainVideo.title}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full"
                            ></iframe>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white">Invalid YouTube URL</div>
                        )}
                    </div>
                </Reveal>

                <Reveal delay={0.1}>
                    <div className="space-y-4">
                        <h1 className="text-3xl font-black font-headline tracking-tighter leading-tight">{mainVideo.title}</h1>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-12 w-12 border-2 border-primary shadow-sm">
                                    <AvatarImage src={mainVideo.teacherAvatarUrl} />
                                    <AvatarFallback>{mainVideo.teacherName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-bold text-lg">{mainVideo.teacherName}</p>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Instructor</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
                                <div className="flex items-center gap-2"><Users className="h-4 w-4" /> <span>8.4K Views</span></div>
                                <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> <span>{mainVideo.createdAt ? format(mainVideo.createdAt.toDate(), 'PPP') : 'N/A'}</span></div>
                            </div>
                        </div>
                        <Separator />
                        <div className="bg-muted/30 p-6 rounded-2xl">
                            <p className="text-base leading-relaxed text-foreground/80 whitespace-pre-wrap">{mainVideo.description}</p>
                        </div>
                    </div>
                </Reveal>

                {/* Comment Section */}
                <Reveal delay={0.2} className="space-y-8 pt-6">
                    <div className="flex items-center gap-2">
                        <MessageCircle className="h-6 w-6 text-primary" />
                        <h2 className="text-2xl font-black font-headline tracking-tight">{comments.length} Comments</h2>
                    </div>

                    {user ? (
                        <form onSubmit={handleCommentSubmit} className="flex gap-4">
                            <Avatar className="shrink-0 border-2 border-primary/20">
                                <AvatarImage src={user.avatarUrl} />
                                <AvatarFallback>{user.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-2">
                                <Textarea 
                                    value={newComment} 
                                    onChange={(e) => setNewComment(e.target.value)} 
                                    placeholder="Add a public comment..." 
                                    className="min-h-[100px] rounded-2xl bg-card border-2 focus:border-primary transition-all shadow-sm"
                                />
                                <div className="flex justify-end">
                                    <Button type="submit" disabled={isCommenting || !newComment.trim()} className="rounded-full px-6 font-bold shadow-lg">
                                        {isCommenting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                        Comment
                                    </Button>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <div className="p-8 text-center border-2 border-dashed rounded-2xl bg-muted/20">
                            <p className="text-muted-foreground">Please sign in to join the discussion.</p>
                        </div>
                    )}

                    <div className="space-y-6">
                        {comments.map(comment => (
                            <div key={comment.id} className="group flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <Avatar className="h-10 w-10 shrink-0 shadow-sm">
                                    <AvatarImage src={comment.authorAvatarUrl} />
                                    <AvatarFallback>{comment.authorName[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 bg-muted/20 p-4 rounded-2xl relative">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm">{comment.authorName}</span>
                                            <span className="text-[10px] text-muted-foreground font-medium uppercase">
                                                {comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : ''}
                                            </span>
                                        </div>
                                        {user && (user.role === 'admin' || user.id === comment.authorId) && (
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                                                onClick={() => setCommentToDelete(comment)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Reveal>
            </div>

            {/* Right Column: Playlist */}
            <div className="lg:col-span-1">
                <Card className="sticky top-24 border-none shadow-xl bg-card/50 backdrop-blur-sm rounded-3xl overflow-hidden">
                    <CardHeader className="bg-primary/10 pb-4">
                        <CardTitle className="text-xl font-black font-headline tracking-tight">Up Next</CardTitle>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{playlist.length} Lessons Available</p>
                    </CardHeader>
                    <CardContent className="p-2 pt-4">
                        <div className="space-y-2 max-h-[calc(100vh-20rem)] overflow-y-auto pr-2 custom-scrollbar">
                            {playlist.map((item, index) => {
                                const isActive = item.id === classId;
                                return (
                                    <button 
                                        key={item.id} 
                                        onClick={() => router.push(`/recorded-classes/${item.id}`)}
                                        className={cn(
                                            "w-full group p-3 rounded-2xl text-left transition-all duration-300 flex gap-3 items-center active:scale-[0.98]",
                                            isActive 
                                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                                                : "hover:bg-muted/80 bg-background/50 border border-muted"
                                        )}
                                    >
                                        <div className="relative shrink-0 w-24 aspect-video rounded-lg overflow-hidden shadow-sm">
                                            <Image 
                                                src={item.thumbnailUrl} 
                                                alt={item.title} 
                                                fill 
                                                className="object-cover"
                                                unoptimized
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Play className={cn("h-4 w-4 fill-white text-white", isActive ? "hidden" : "block")} />
                                            </div>
                                            {isActive && (
                                                <div className="absolute inset-0 bg-primary/40 flex items-center justify-center">
                                                    <div className="h-4 w-4 flex gap-0.5 items-end">
                                                        <div className="w-1 bg-white animate-bounce h-full" />
                                                        <div className="w-1 bg-white animate-bounce h-2/3" style={{ animationDelay: '0.1s' }} />
                                                        <div className="w-1 bg-white animate-bounce h-3/4" style={{ animationDelay: '0.2s' }} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn("font-bold text-sm leading-tight line-clamp-2", isActive ? "text-white" : "text-foreground")}>
                                                {item.title}
                                            </p>
                                            <p className={cn("text-[10px] mt-1 font-medium", isActive ? "text-white/70" : "text-muted-foreground")}>
                                                Lesson {index + 1}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>

        <AlertDialog open={!!commentToDelete} onOpenChange={(open) => !open && setCommentToDelete(null)}>
            <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-bold font-headline">Delete comment?</AlertDialogTitle>
                    <AlertDialogDescription className="text-base">
                        This will permanently remove your comment. This action cannot be reversed.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 pt-4">
                    <AlertDialogCancel className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Keep it</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleDeleteComment} 
                        disabled={isDeletingComment} 
                        className="bg-destructive hover:bg-destructive/90 rounded-xl font-black uppercase text-[10px] tracking-widest h-10 px-6"
                    >
                        {isDeletingComment ? <Loader2 className="animate-spin" /> : 'Yes, Delete'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  )
}
