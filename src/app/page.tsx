
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import InstallButton from '@/components/shared/install-button';
import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import type { Announcement } from '@/lib/definitions';

const FloatingSymbol = ({ symbol, className, duration, delay }: { symbol: string; className: string, duration: number, delay: number }) => (
    <div
      className={`absolute text-5xl font-bold text-primary/20 -z-10 ${className}`}
      style={{
        animation: `float ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`
      }}
    >
      {symbol}
    </div>
);

function AnnouncementBanner() {
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
        <div className="flex items-center justify-center p-3 rounded-lg bg-gradient-to-r from-primary to-destructive text-primary-foreground shadow-lg">
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


export default function Home() {
  const symbols = [
    { symbol: '+', className: 'top-[20%] left-[10%]', duration: 8, delay: 0 },
    { symbol: '−', className: 'top-[50%] right-[12%]', duration: 10, delay: 2 },
    { symbol: '×', className: 'bottom-[25%] left-[20%]', duration: 9, delay: 1 },
    { symbol: '÷', className: 'top-[15%] right-[25%]', duration: 12, delay: 3 },
    { symbol: '∫', className: 'bottom-[15%] right-[15%]', duration: 7, delay: 0.5 },
    { symbol: '√', className: 'top-[70%] left-[15%]', duration: 11, delay: 2.5 },
    { symbol: 'π', className: 'top-[10%] left-[40%]', duration: 9, delay: 1.5 },
    { symbol: 'Σ', className: 'bottom-[5%] left-[50%]', duration: 13, delay: 4 },
  ];

  return (
    <div className="flex flex-col flex-grow items-center justify-center">
      <section className="relative flex w-full flex-col items-center justify-center overflow-hidden pt-16">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
        >
          <div className="absolute inset-0 bg-background bg-[radial-gradient(hsl(var(--primary)/.05)_1px,transparent_1px)] [background-size:8px_8px]"></div>
          <div className="hidden md:block">
              {symbols.map((s, i) => (
                  <FloatingSymbol key={i} {...s} />
              ))}
          </div>
        </div>
        <div className="container relative z-10 mx-auto px-4 text-center md:px-6">
          <div>
            <div className="mx-auto max-w-4xl">
              <h1 className="font-headline text-5xl font-bold tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl">
                Unlock Your <span>Math Potential</span> with{' '}
                <Image
                  src="/logo mlm@4x.png"
                  alt="kanakkmash"
                  width={250}
                  height={78}
                  className="inline-block"
                  priority
                  unoptimized
                />
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-foreground/80">
                An online platform offering quality mathematics classes for students from Class 1 to degree level under Kerala State, CBSE, and ICSE syllabuses, along with coaching for competitive exams such as LSS, NuMaTs, USS, NMMS, PSC, CSAT, MAT, JEE Maths, KTET, SET, and NET.
              </p>
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Button size="lg" asChild className="bg-gradient-to-r from-primary via-accent to-chart-3 text-primary-foreground transition-all [background-size:200%_auto] animate-gradient-pan hover:shadow-lg">
                <Link href="/sign-up">Enroll Now</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/sign-in">Login</Link>
              </Button>
              <InstallButton />
            </div>
          </div>
        </div>
      </section>
      <div className="w-full max-w-4xl mx-auto px-4 md:px-6 py-10">
        <AnnouncementBanner />
      </div>
    </div>
  );
}
