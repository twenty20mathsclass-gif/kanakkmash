'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFirebase } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import type { Announcement } from '@/lib/definitions';
import { Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function AnnouncementBanner() {
    const { firestore } = useFirebase();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (!firestore) return;
        
        const q = query(collection(firestore, 'announcements'), where('isActive', '==', true));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const active = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
                active.sort((a, b) => {
                    const timeA = a.createdAt?.toMillis() || 0;
                    const timeB = b.createdAt?.toMillis() || 0;
                    return timeB - timeA;
                });
                setAnnouncements(active);
                setCurrentIndex(0); // Reset to first when list changes
            } else {
                setAnnouncements([]);
            }
        }, (err) => {
            console.error("Announcement listener failed:", err);
        });

        return () => unsubscribe();
    }, [firestore]);

    useEffect(() => {
        if (announcements.length <= 1) return;
        
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % announcements.length);
        }, 10000); // 10 seconds

        return () => clearInterval(timer);
    }, [announcements.length]);

    if (announcements.length === 0) {
        return null;
    }

    const current = announcements[currentIndex];

    const content = (
        <div className="flex items-center justify-center gap-3 p-2 bg-gradient-to-r from-primary via-accent to-destructive text-primary-foreground shadow-sm w-full border-b border-white/10 h-10 overflow-hidden relative">
            <Megaphone className="h-4 w-4 shrink-0 animate-bounce z-10" />
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="flex flex-col items-center justify-center"
                >
                    <p className="font-bold text-center uppercase tracking-wider text-xs sm:text-sm line-clamp-1">
                        {current.text.split('').map((char, i) => (
                            <motion.span
                                key={i}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: 0.1,
                                    delay: i * 0.03,
                                }}
                            >
                                {char}
                            </motion.span>
                        ))}
                    </p>
                </motion.div>
            </AnimatePresence>
        </div>
    );
    
    if (current.link) {
        return (
            <Link href={current.link} target="_blank" rel="noopener noreferrer" className="block w-full hover:opacity-95 transition-opacity">
                {content}
            </Link>
        )
    }

    return <div className="w-full">{content}</div>;
}
