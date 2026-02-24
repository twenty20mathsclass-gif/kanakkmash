'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AnimatedMathIcons } from '@/components/shared/animated-math-icons';
import { AppleStyleDock } from '@/components/shared/apple-style-dock';
import { BookOpen, Newspaper, Library, Users, UserPlus } from 'lucide-react';

export default function Home() {
  const navItems = [
    { href: '/courses', label: 'Courses', icon: BookOpen },
    { href: '/blog', label: 'Blog', icon: Newspaper },
    { href: '/materials', label: 'Materials', icon: Library },
    { href: '/community', label: 'Community', icon: Users },
    { href: '/sign-up', label: 'Sign Up', icon: UserPlus },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <AppleStyleDock items={navItems} user={null} onSignOut={() => {}} />
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
                <span className="animate-gradient-pan bg-gradient-to-r from-amber-400 via-primary to-amber-400 bg-[length:200%_auto] bg-clip-text text-transparent">
                  kanakkmash
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-lg text-foreground/80">
                Engaging lessons, AI-powered practice, and a path to mathematical mastery. Your journey to excellence starts here.
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
