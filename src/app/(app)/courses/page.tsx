
'use client';
import { Reveal } from '@/components/shared/reveal';
import { courses } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function CoursesPage() {
  return (
    <div className="space-y-8">
      <Reveal>
        <div>
          <h1 className="text-3xl font-bold font-headline">All Courses</h1>
          <p className="text-muted-foreground">
            Browse our available courses and start learning.
          </p>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course, index) => {
              const courseImage = PlaceHolderImages.find(img => img.id === course.imageId);
              return (
              <Reveal key={course.id} delay={0.1 * index}>
                  <Link href={`/courses/${course.id}`} className="block h-full">
                      <Card className="h-full flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                          {courseImage && (
                            <div className="aspect-video relative">
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
                            <CardTitle className="font-headline text-xl font-bold">{course.title}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-muted-foreground line-clamp-3 flex-grow">{course.description}</p>
                          </CardContent>
                      </Card>
                  </Link>
              </Reveal>
          )})}
      </div>
    </div>
  );
}
