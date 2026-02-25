
import Link from 'next/link';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { AnimatedMathIcons } from '@/components/shared/animated-math-icons';
import { HomePageDock } from '@/components/shared/home-page-dock';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={null}>
        <HomePageDock />
      </Suspense>
      <main className="flex flex-1 items-center justify-center pt-20 pb-20 md:pt-20 md:pb-0">
        <section className="relative overflow-hidden">
          <AnimatedMathIcons />
          <div
            aria-hidden="true"
            className="absolute inset-0 top-0 -z-10 h-1/2 w-full"
          >
            <div className="absolute inset-0 bg-background bg-[radial-gradient(hsl(var(--primary)/.1)_1px,transparent_1px)] [background-size:16px_16px]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_60%,hsl(var(--background)))]"></div>
          </div>
          <div className="container relative z-10 mx-auto px-4 text-center md:px-6">
            <div className="mx-auto max-w-3xl">
              <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
                Unlock Your <span>Math Potential</span> with{' '}
                <Image
                  src="/logoo_1@4x.webp"
                  alt="kanakkmash"
                  width={400}
                  height={123}
                  className="inline-block"
                  priority
                />
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-lg text-foreground/80">
                An online platform that offers quality mathematics classes for students from Class 1 to degree level and for competitive exam preparation.
              </p>
            </div>
            <div className="mt-10 flex justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/sign-up">Get Started for Free</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/sign-in">Sign In</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-background py-6">
        <div className="container mx-auto flex items-center justify-center px-4 md:px-6">
          <p className="text-sm text-foreground/60">
            © {new Date().getFullYear()} kanakkmash. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
