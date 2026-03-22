'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import InstallButton from '@/components/shared/install-button';
import { Reveal } from '@/components/shared/reveal';

const FloatingSymbol = ({ symbol, className, duration, delay }: { symbol: string; className: string, duration: number, delay: number }) => (
    <div
      className={`absolute text-5xl font-bold text-primary/20 -z-10 ${className}`}
      style={{
        animation: `float-down ${duration}s ease-in-out ${delay}s infinite`,
      }}
    >
      {symbol}
    </div>
);

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
      <section className="relative flex min-h-0 w-full flex-col items-center justify-center px-4 py-4 sm:py-8 lg:py-12">
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
        <div className="container relative z-10 mx-auto text-center md:px-6">
          <Reveal>
            <div className="mx-auto max-w-5xl">
              <h1 className="font-headline text-3xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl leading-tight text-black dark:text-white">
                Unlock Your Math
                <br className="hidden sm:block" />
                Potential with{' '}
                <Image
                  src="/logo mlm@4x.png"
                  alt="kanakkmash"
                  width={350}
                  height={109}
                  className="inline-block h-auto w-[140px] align-middle sm:w-[220px] md:w-[280px] lg:w-[320px] ml-1 sm:ml-2"
                  priority
                  unoptimized
                />
              </h1>
              <p className="mx-auto mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg lg:text-xl text-foreground/80">
                An online platform offering quality mathematics classes for students from Class 1 to degree level under Kerala State, CBSE, and ICSE syllabuses, along with coaching for competitive exams such as LSS, NuMaTs, USS, NMMS, PSC, CSAT, MAT, JEE Maths, KTET, SET, and NET.
              </p>
            </div>
          </Reveal>
          
          <Reveal delay={0.2}>
            <div className="mt-6 sm:mt-10 flex flex-wrap justify-center gap-3 sm:gap-4">
              <Button size="lg" asChild className="h-10 sm:h-12 px-6 sm:px-8 text-sm sm:text-base bg-gradient-to-r from-primary via-accent to-chart-3 text-primary-foreground transition-all [background-size:200%_auto] animate-gradient-pan hover:shadow-lg rounded-full">
                <Link href="/sign-up">Enroll Now</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-10 sm:h-12 px-6 sm:px-8 text-sm sm:text-base rounded-full">
                <Link href="/sign-in">Login</Link>
              </Button>
              <InstallButton />
            </div>
          </Reveal>
        </div>
      </section>
  );
}
