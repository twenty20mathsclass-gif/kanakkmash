
'use client';
import { use, useEffect, useState } from 'react';
import { useFirebase } from '@/firebase';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import type { RecordedClass } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Users, Play } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/shared/reveal';

type PageProps = {
  params: {
    classId: string;
  };
};

function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export default function RecordedClassPlayerPage({ params }: PageProps) {
  const { firestore } = useFirebase();
  const router = useRouter();
  const resolvedParams = use(params as Promise<{ classId: string }>);
  const { classId } = resolvedParams;

  const [mainVideo, setMainVideo] = useState<RecordedClass | null>(null);
  const [playlist, setPlaylist] = useState<RecordedClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !classId) return;

    const fetchVideoAndPlaylist = async () => {
      setLoading(true);
      try {
        // Fetch the main video
        const videoRef = doc(firestore, 'recordedClasses', classId);
        const videoSnap = await getDoc(videoRef);

        if (videoSnap.exists()) {
          const videoData = { id: videoSnap.id, ...videoSnap.data() } as RecordedClass;
          setMainVideo(videoData);

          // Fetch other videos from the same teacher to act as a playlist
          const playlistQuery = query(
            collection(firestore, 'recordedClasses'),
            where('teacherId', '==', videoData.teacherId)
          );
          const playlistSnap = await getDocs(playlistQuery);
          const playlistData = playlistSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as RecordedClass))
            .filter(item => item.id !== classId); // Exclude the main video
            
          setPlaylist([videoData, ...playlistData]); // Put main video at start of playlist
        } else {
          console.error("Video not found");
        }
      } catch (error) {
        console.error("Error fetching video data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideoAndPlaylist();
  }, [firestore, classId]);

  const videoId = mainVideo ? getYouTubeVideoId(mainVideo.youtubeUrl) : null;

  if (loading) {
    return <div className="flex h-screen items-center justify-center -m-8"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  if (!mainVideo) {
    return <div className="flex h-screen items-center justify-center -m-8"><p>Could not load video.</p></div>
  }

  return (
    <div className="bg-primary/10 -m-4 md:-m-6 lg:-m-8 min-h-screen">
       <div className="max-w-lg mx-auto">
            <header className="p-4 flex justify-between items-center text-primary">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10" onClick={() => router.back()}>
                    <ArrowLeft />
                </Button>
            </header>
            <Reveal>
                <div className="aspect-video bg-black rounded-lg overflow-hidden mx-4 shadow-xl">
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

            <div className="bg-background rounded-t-3xl p-6 mt-4 space-y-6 min-h-[calc(100vh-18rem)]">
                <Reveal delay={0.1}>
                    <h1 className="text-2xl font-bold font-headline">{mainVideo.title}</h1>
                    <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>1.1K Students View</span>
                    </div>
                </Reveal>
                
                <Reveal delay={0.2}>
                    <div className="flex gap-4">
                        <Button>Lessons</Button>
                        <Button variant="secondary">Comment</Button>
                    </div>
                </Reveal>

                <Reveal delay={0.3} className="space-y-2">
                    {playlist.map((item, index) => (
                        <button key={item.id} className={cn("w-full p-4 rounded-lg text-left transition-colors", mainVideo.id === item.id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80")} onClick={() => setMainVideo(item)}>
                            <p className="font-semibold">{index + 1}. {item.title}</p>
                            <p className={cn("text-sm", mainVideo.id === item.id ? "text-primary-foreground/80" : "text-muted-foreground")}>12:00 min</p>
                        </button>
                    ))}
                </Reveal>
            </div>
       </div>
    </div>
  )
}
