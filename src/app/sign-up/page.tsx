
'use client';

import Link from 'next/link';
import Image from 'next/image';
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
import { Reveal } from '@/components/shared/reveal';

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
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-muted/30 lg:flex flex-col items-center justify-center p-8 text-center">
        <AnimatedMathIcons />
        <Link href="/" className="absolute top-8 left-8 z-10">
            <Image
              src="/logo eng@4x.png"
              alt="kanakkmash"
              width={200}
              height={62}
              className="inline-block"
              priority
            />
        </Link>
        <Reveal>
          <div className='z-10 space-y-4'>
              <Image 
                  src="https://picsum.photos/seed/signup-illustration/600/400"
                  width={600}
                  height={400}
                  alt="Illustration"
                  className="mx-auto rounded-lg shadow-lg"
                  data-ai-hint="online education teaching"
              />
              <h1 className="font-headline text-4xl font-bold mt-4">Welcome to Your Learning Journey</h1>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">Unlock your potential with our expert-led math courses for all levels.</p>
          </div>
        </Reveal>
      </div>
      <div className="flex items-center justify-center p-6 min-h-screen relative">
         <Link href="/" className="absolute top-4 left-4 z-10 lg:hidden">
            <Button variant="ghost">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
            </Button>
        </Link>
        <Reveal className="w-full">
          <Card className="mx-auto w-full max-w-xl shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-3xl">Create an account</CardTitle>
              <CardDescription>
                Enter your details below to start your journey with kanakkmash.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignUpForm />
              <div className="mt-4 text-center text-sm">
                Already have an account?{" "}
                <Link href="/sign-in" className="font-medium text-primary underline underline-offset-4 hover:text-primary/80">
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </div>
  );
}
