'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

import { Reveal } from '@/components/shared/reveal';
import { AnnouncementBanner } from '@/components/home/announcement-banner';
import { FloatingMathBackground } from '@/components/home/floating-math-background';


export default function Home() {
  return (
    <section className="relative flex flex-col w-full h-full min-h-0 flex-grow pt-16 md:pt-0">
      <div className="w-full z-40 shrink-0">
        <AnnouncementBanner />
      </div>

      <FloatingMathBackground />

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
