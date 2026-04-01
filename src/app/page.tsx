'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

import { Reveal } from '@/components/shared/reveal';
import { AnnouncementBanner } from '@/components/home/announcement-banner';

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
    <section className="relative flex flex-col w-full h-full min-h-0 flex-grow pt-16 md:pt-0">
      <div className="w-full z-40 shrink-0">
        <AnnouncementBanner />
      </div>

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

      <div className="container relative z-10 mx-auto text-center px-4 flex flex-col justify-center items-center flex-grow overflow-hidden">
        <Reveal className="w-full">
          <div className="mx-auto max-w-5xl">
            <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-tight text-black dark:text-white">
              Unlock Your Math
              <br className="hidden sm:block" />
              Potential with{' '}
              <Image
                src="/logo mlm@4x.png"
                alt="kanakkmash"
                width={350}
                height={109}
                className="inline-block h-auto w-[160px] align-middle sm:w-[220px] md:w-[280px] lg:w-[320px] ml-1 sm:ml-2"
                priority
                unoptimized
              />
            </h1>
            <p className="mx-auto mt-4 sm:mt-6 max-w-3xl text-sm sm:text-lg lg:text-xl text-foreground/80 leading-relaxed px-2">
              An online platform offering quality mathematics classes for students from Class 1 to degree level under Kerala State, CBSE, and ICSE syllabuses, along with coaching for competitive exams such as LSS, NuMaTs, USS, NMMS, PSC, CSAT, MAT, JEE Maths, KTET, SET, and NET.
            </p>
          </div>
        </Reveal>

        {/* buttons  */}
        <Reveal delay={0.2} className="w-full">
          {/* Desktop Layout (hidden on small screens) */}
          <div className="hidden sm:flex mt-8 sm:mt-10 flex-wrap justify-center gap-3 sm:gap-4 relative z-20">
            <Button size="lg" variant="outline" asChild className="h-11 sm:h-12 px-8 sm:px-10 text-sm sm:text-base font-bold rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all hover:shadow-lg">
              <Link href="/assessment-form">Assessment Test</Link>
            </Button>
            <Button size="lg" asChild className="h-11 sm:h-12 px-8 sm:px-10 text-sm sm:text-base font-bold bg-gradient-to-r from-[#F97316] to-[#F59E0B] text-primary-foreground transition-all hover:shadow-lg rounded-full">
              <Link href="/sign-up">Enroll Now</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-11 sm:h-12 px-8 sm:px-10 text-sm sm:text-base font-bold rounded-full bg-background/50 backdrop-blur-sm border-muted-foreground/20 font-medium">
              <Link href="/sign-in">Login</Link>
            </Button>
          </div>

          {/* Mobile Layout (hidden on screens sm and above) */}
          <div className="flex sm:hidden mt-8 flex-col items-center gap-3 w-full max-w-sm mx-auto relative z-20">
            <Button size="lg" variant="outline" asChild className="w-full h-11 text-sm font-bold rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all hover:shadow-lg">
              <Link href="/assessment-form">Assessment Test</Link>
            </Button>

            <div className="flex w-full gap-3">
              <Button size="lg" asChild className="flex-1 h-11 text-sm font-bold bg-gradient-to-r from-[#F97316] to-[#F59E0B] text-primary-foreground transition-all hover:shadow-lg rounded-full">
                <Link href="/sign-up">Enroll</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="flex-1 h-11 text-sm rounded-full bg-background/50 backdrop-blur-sm border-muted-foreground/20 font-medium">
                <Link href="/sign-in">Login</Link>
              </Button>

            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
