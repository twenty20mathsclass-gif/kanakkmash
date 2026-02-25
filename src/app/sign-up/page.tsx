'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SignUpForm } from '@/components/auth/sign-up-form';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PageLoader } from '@/components/shared/page-loader';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { AnimatedMathIcons } from '@/components/shared/animated-math-icons';

export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      const targetPath =
        user.role === 'teacher'
          ? '/teacher'
          : '/dashboard';
      router.replace(targetPath);
    }
  }, [user, loading, router]);

  if (loading || (!loading && user)) {
    return <PageLoader />;
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-background p-4">
      <AnimatedMathIcons />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
      >
        <div className="absolute inset-0 bg-background bg-[radial-gradient(hsl(var(--primary)/.1)_1px,transparent_1px)] [background-size:16px_16px]"></div>
      </div>
      <Button variant="ghost" asChild className="absolute top-4 left-4 z-10">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </Button>

      <main className="z-10 grid w-full max-w-6xl grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-16">
        <div className="hidden flex-col justify-center text-left md:flex">
          <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl">
            Create an Account
          </h1>
          <p className="mt-4 text-lg text-foreground/80">
            Join kanakkmash and start your learning adventure. One account for all your needs.
          </p>
        </div>

        <Card className="w-full bg-background/80 backdrop-blur-sm">
          <CardHeader className="md:hidden">
            <CardTitle className="font-headline text-2xl">Create an Account</CardTitle>
            <CardDescription>
              Join kanakkmash and start your learning adventure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignUpForm />
            <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <Link href="/sign-in" className="font-medium text-primary underline underline-offset-4 hover:text-primary/80">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
