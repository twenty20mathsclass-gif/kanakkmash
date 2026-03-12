'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import type { Announcement } from '@/lib/definitions';

export function AnnouncementBanner() {
    const { firestore } = useFirebase();
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);

    useEffect(() => {
        if (!firestore) return;
        
        const q = query(collection(firestore, 'announcements'), where('isActive', '==', true), orderBy('createdAt', 'desc'), limit(1));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                setAnnouncement({ id: doc.id, ...doc.data() } as Announcement);
            } else {
                setAnnouncement(null);
            }
        });

        return () => unsubscribe();
    }, [firestore]);

    if (!announcement) {
        return null;
    }

    const content = (
        <div className="flex items-center justify-center p-3 rounded-lg bg-gradient-to-r from-primary via-accent to-destructive text-primary-foreground shadow-lg">
            <p className="font-bold text-center uppercase tracking-wider">{announcement.text}</p>
        </div>
    );
    
    if (announcement.link) {
        return (
            <Link href={announcement.link} target="_blank" rel="noopener noreferrer" className="block w-full">
                {content}
            </Link>
        )
    }

    return <div className="w-full">{content}</div>;
}
