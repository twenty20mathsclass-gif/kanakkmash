import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, FlaskConical, GraduationCap, UserCog } from 'lucide-react';
import { Logo } from '@/components/shared/logo';

export default function Home() {
  const features = [
    {
      icon: <GraduationCap className="h-10 w-10 text-primary" />,
      title: 'Student Dashboard',
      description: 'Personalized space to track progress and access lessons.',
    },
    {
      icon: <UserCog className="h-10 w-10 text-primary" />,
      title: 'Admin Panel',
      description: 'Manage users, courses, and platform activity with ease.',
    },
    {
      icon: <FlaskConical className="h-10 w-10 text-primary" />,
      title: 'AI Practice Generator',
      description: 'Generate custom math problems to master any topic.',
    },
    {
      icon: <CheckCircle2 className="h-10 w-10 text-primary" />,
      title: 'Progress Tracking',
      description: 'Monitor lesson and module completion to stay on track.',
    },
  ];

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
        <section className="relative py-20 md:py-32">
          <div
            aria-hidden="true"
            className="absolute inset-0 top-0 -z-10 h-1/2 w-full"
          >
            <div className="absolute inset-0 bg-background bg-[radial-gradient(hsl(var(--primary)/.1)_1px,transparent_1px)] [background-size:16px_16px]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_60%,hsl(var(--background)))]"></div>
          </div>
          <div className="container mx-auto px-4 text-center md:px-6">
            <div className="mx-auto max-w-3xl">
              <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
                Unlock Your Math Potential with{' '}
                <span className="text-primary">kanakkmash</span>
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

        <section className="bg-secondary/50 py-20 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mb-12 text-center">
              <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl">
                Features for a Brighter Future
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-foreground/70">
                Everything you need to succeed, all in one platform.
              </p>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <Card key={feature.title} className="text-center">
                  <CardHeader>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      {feature.icon}
                    </div>
                    <CardTitle className="font-headline text-xl">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground/70">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
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
