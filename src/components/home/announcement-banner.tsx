
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFirebase } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import type { Announcement } from '@/lib/definitions';
import { Megaphone } from 'lucide-react';

export function AnnouncementBanner() {
    const { firestore } = useFirebase();
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);

    useEffect(() => {
        if (!firestore) return;
        
        const q = query(collection(firestore, 'announcements'), where('isActive', '==', true));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const activeAnnouncements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
                activeAnnouncements.sort((a, b) => {
                    const timeA = a.createdAt?.toMillis() || 0;
                    const timeB = b.createdAt?.toMillis() || 0;
                    return timeB - timeA;
                });
                setAnnouncement(activeAnnouncements[0]);
            } else {
                setAnnouncement(null);
            }
        }, (err) => {
            console.error("Announcement listener failed:", err);
        });

        return () => unsubscribe();
    }, [firestore]);

    if (!announcement) {
        return null;
    }

    const content = (
        <div className="flex items-center justify-center gap-3 p-2 bg-gradient-to-r from-primary via-accent to-destructive text-primary-foreground shadow-sm w-full border-b border-white/10">
            <Megaphone className="h-4 w-4 shrink-0 hidden sm:block animate-bounce" />
            <p className="font-bold text-center uppercase tracking-wider text-[10px] sm:text-xs md:text-sm">{announcement.text}</p>
        </div>
    );
    
    if (announcement.link) {
        return (
            <Link href={announcement.link} target="_blank" rel="noopener noreferrer" className="block w-full hover:opacity-95 transition-opacity">
                {content}
            </Link>
        )
    }

    return <div className="w-full">{content}</div>;
}
