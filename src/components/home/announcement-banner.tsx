
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
        
        // Simpler query to avoid missing index errors, with client-side sorting
        const q = query(collection(firestore, 'announcements'), where('isActive', '==', true));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const activeAnnouncements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
                // Sort client-side to show the most recently created active announcement
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
        <div className="flex items-center justify-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary via-accent to-destructive text-primary-foreground shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
            <Megaphone className="h-5 w-5 shrink-0 hidden sm:block animate-bounce" />
            <p className="font-bold text-center uppercase tracking-wider text-sm sm:text-base">{announcement.text}</p>
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
