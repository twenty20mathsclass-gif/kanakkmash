import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/logo';
import { AnimatedMathIcons } from '@/components/shared/animated-math-icons';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        <Logo />
        <nav className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">Sign Up</Link>
          </Button>
        </nav>
      </header>
      <main className="flex-1">
        <section className="relative overflow-hidden py-20 md:py-32">
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
                Unlock Your Math Potential with{' '}
                <span className="bg-gradient-to-r from-yellow-500 to-orange-600 bg-clip-text text-transparent">
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
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-background py-6">
        <div className="container mx-auto flex items-center justify-between px-4 md:px-6">
          <Logo />
          <p className="text-sm text-foreground/60">
            © {new Date().getFullYear()} kanakkmash. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
