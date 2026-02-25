'use client';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { courses } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, MoreVertical, Calendar, Clock, BookOpen } from 'lucide-react';
import { Reveal } from '@/components/shared/reveal';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: {
    courseId: string;
  };
};

export default function CourseDetailPage({ params }: PageProps) {
  const course = courses.find((c) => c.id === params.courseId);
  if (!course) notFound();

  const allLessons = course.modules.flatMap((m) => m.lessons);
  const firstLesson = allLessons[0];
  const totalModules = course.modules.length;
  const totalHours = (allLessons.length * 0.75).toFixed(1);

  return (
    <div className="bg-primary -m-4 md:-m-6 lg:-m-8 min-h-screen">
      <div className="max-w-lg mx-auto">
        <header className="p-4 flex justify-between items-center text-primary-foreground">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary-foreground/10" asChild>
            <Link href="/courses">
              <ArrowLeft />
            </Link>
          </Button>
          <h1 className="text-xl font-bold">Course</h1>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary-foreground/10">
            <MoreVertical />
          </Button>
        </header>

        <Reveal>
            <div className="relative h-64 w-full">
                <Image
                    src="https://picsum.photos/seed/math-professor/600/400"
                    alt="Math Professor"
                    fill
                    className="object-contain"
                    data-ai-hint="math professor illustration"
                />
            </div>
        </Reveal>

        <div className="bg-background rounded-t-3xl p-6 space-y-6 min-h-[calc(100vh-15rem)]">
          <Reveal delay={0.1}>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold font-headline">{course.title}</h2>
                <div className="flex items-center gap-4 text-muted-foreground mt-2 text-sm">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4" />
                    <span>{totalModules} Modules</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>{totalHours} Hours</span>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="icon">
                <Calendar className="h-5 w-5" />
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <Tabs defaultValue="lessons">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="lessons">Lessons</TabsTrigger>
                <TabsTrigger value="timetable" disabled>Time Table</TabsTrigger>
                <TabsTrigger value="course-info" disabled>Course Info</TabsTrigger>
              </TabsList>
              <TabsContent value="lessons" className="mt-6">
                <div className="grid grid-cols-2 gap-4">
                  {course.modules.flatMap((module, moduleIndex) =>
                    module.lessons.map((lesson, lessonIndex) => {
                      const lessonNumberLabel = `${moduleIndex + 1}.${lessonIndex + 1}`;
                      return (
                        <Link href={`/courses/${course.id}/lessons/${lesson.id}`} key={lesson.id} className="block">
                          <div className="p-4 rounded-xl bg-primary/10 h-full min-h-[6rem] flex flex-col justify-center">
                            <p className="font-bold text-lg text-primary">{lessonNumberLabel}</p>
                            <p className="font-semibold text-sm mt-1 text-foreground leading-tight">{lesson.title}</p>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </Reveal>
        </div>

        {firstLesson && (
            <div className="fixed bottom-[7rem] md:bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg z-20">
                <Reveal>
                    <Button size="lg" className="w-full shadow-2xl" asChild>
                        <Link href={`/courses/${course.id}/lessons/${firstLesson.id}`}>Watch Now</Link>
                    </Button>
                </Reveal>
            </div>
        )}
      </div>
    </div>
  );
}
