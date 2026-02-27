import { courses } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '@/components/shared/reveal';

export const dynamic = 'force-dynamic';

export default function CoursesPage() {
  return (
    <div className="space-y-8">
      <Reveal>
        <div>
          <h1 className="text-3xl font-bold font-headline">All Courses</h1>
          <p className="text-muted-foreground">Browse our catalog of math courses and start learning today.</p>
        </div>
      </Reveal>

      <section>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, index) => {
            const courseImage = PlaceHolderImages.find(img => img.id === course.imageId);
            const firstLesson = course.modules[0]?.lessons[0];

            return (
              <Reveal key={course.id} delay={index * 0.1}>
                <Card className="flex flex-col overflow-hidden h-full">
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
                  <CardContent className="flex flex-1 items-end">
                      {firstLesson ? (
                          <Button asChild className="w-full">
                              <Link href={`/courses/${course.id}`}>
                                  Start Learning <ArrowRight className="ml-2 h-4 w-4" />
                              </Link>
                          </Button>
                      ) : (
                          <Button className="w-full" disabled>
                              Coming Soon
                          </Button>
                      )}
                  </CardContent>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </section>
    </div>
  );
}
