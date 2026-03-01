'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { AnimatedMathIcons } from '@/components/shared/animated-math-icons';
import { HomePageDock } from '@/components/shared/home-page-dock';
import { PublicHeader } from '@/components/shared/public-header';
import { useIsMobile } from '@/hooks/use-mobile';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

export default function Home() {
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={null}>
        {isMobile ? (
          <div className="fixed bottom-2 left-0 right-0 z-50 md:hidden">
            <HomePageDock />
          </div>
        ) : (
          <PublicHeader />
        )}
      </Suspense>
      <main className="flex flex-1 pt-8 pb-24 md:pt-24 md:pb-0">
        <section className="relative flex w-full items-center justify-center overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
          >
            <div className="absolute inset-0 bg-background bg-[radial-gradient(hsl(var(--primary)/.1)_1px,transparent_1px)] [background-size:16px_16px]"></div>
            <AnimatedMathIcons />
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
                  />
                </h1>
                <p className="mx-auto mt-6 max-w-xl text-lg text-foreground/80">
                  An online platform that offers quality mathematics classes for students from Class 1 to degree level and for competitive exam preparation.
                </p>
              </div>
              <div className="mt-10 flex justify-center gap-4">
                <Button size="lg" asChild className="bg-gradient-to-r from-primary to-accent text-primary-foreground transition-all hover:bg-gradient-to-br hover:shadow-lg">
                  <Link href="/sign-up">Get Started for Free</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/sign-in">Sign In</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-background py-6">
        <div>
          <div className="container mx-auto flex items-center justify-center px-4 md:px-6">
            <p className="text-sm text-foreground/60">
              © {new Date().getFullYear()} kanakkmash. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
