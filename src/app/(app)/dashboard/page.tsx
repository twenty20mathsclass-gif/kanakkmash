'use client'; // Make client component

import { useUser } from '@/firebase';
import { courses, studentProgress } from '@/lib/data';
import type { Course } from '@/lib/definitions';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { PageLoader } from '@/components/shared/page-loader';

export default function DashboardPage() {
  const { user, loading } = useUser();
  const progressData = studentProgress; // In a real app, this would be fetched for the specific user

  const getTotalLessons = (course: Course) =>
    course.modules.reduce((acc, module) => acc + module.lessons.length, 0);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <PageLoader fullScreen={false} />
      </div>
    );
  }

  if (!user) {
    return <div>Please sign in to view your dashboard.</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Welcome back, {user?.name.split(' ')[0]}!</h1>
        <p className="text-muted-foreground">Let&apos;s continue your learning journey.</p>
      </div>

      <section>
        <h2 className="text-2xl font-bold font-headline mb-4">My Courses</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const totalLessons = getTotalLessons(course);
            const completedLessons = progressData[course.id]?.completedLessons.length || 0;
            const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
            const courseImage = PlaceHolderImages.find(img => img.id === course.imageId);
            const firstLesson = course.modules[0]?.lessons[0];

            return (
              <Card key={course.id} className="flex flex-col overflow-hidden">
                {courseImage && (
                    <div className="relative h-48 w-full">
                        <Image
                            src={courseImage.imageUrl}
                            alt={course.title}
                            fill
                            className="object-cover"
                            data-ai-hint={courseImage.imageHint}
                        />
                    </div>
                )}
                <CardHeader>
                  <CardTitle className="font-headline text-xl">{course.title}</CardTitle>
                  <CardDescription className='line-clamp-2'>{course.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between">
                    <div>
                        <div className="mb-2 flex justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span>{completedLessons} / {totalLessons} Lessons</span>
                        </div>
                        <Progress value={progress} className="mb-4 h-2" />
                    </div>
                    {firstLesson && (
                        <Button asChild className="w-full mt-auto">
                            <Link href={`/courses/${course.id}/lessons/${firstLesson.id}`}>
                                Continue Learning <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
