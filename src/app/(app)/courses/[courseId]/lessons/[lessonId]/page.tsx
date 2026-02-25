import { notFound } from 'next/navigation';
import { courses } from '@/lib/data';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { PracticeGenerator } from '@/components/practice/practice-generator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Reveal } from '@/components/shared/reveal';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: {
    courseId: string;
    lessonId: string;
  };
};

export default function LessonPage({ params }: PageProps) {
  const course = courses.find((c) => c.id === params.courseId);
  if (!course) notFound();

  const allLessons = course.modules.flatMap((m) => m.lessons);
  const lessonIndex = allLessons.findIndex((l) => l.id === params.lessonId);
  if (lessonIndex === -1) notFound();

  const lesson = allLessons[lessonIndex];
  const prevLesson = lessonIndex > 0 ? allLessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < allLessons.length - 1 ? allLessons[lessonIndex + 1] : null;

  return (
    <div className="mx-auto max-w-4xl">
      <Reveal>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold font-headline">{lesson.title}</h1>
          <div
            className="prose lg:prose-lg"
            dangerouslySetInnerHTML={{ __html: lesson.content }}
          />
          <Button>
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark as Complete
          </Button>
        </div>
      </Reveal>

      <Separator className="my-8" />
      
      <Reveal>
        <div className="flex justify-between">
          {prevLesson ? (
            <Button variant="outline" asChild>
              <Link href={`/courses/${course.id}/lessons/${prevLesson.id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Previous
              </Link>
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link href={`/courses/${params.courseId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Course
              </Link>
            </Button>
          )}
          {nextLesson ? (
            <Button variant="outline" asChild>
              <Link href={`/courses/${course.id}/lessons/${nextLesson.id}`}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : <div />}
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <Card className="mt-12">
          <CardHeader>
              <CardTitle className="font-headline text-2xl">Reinforce Your Learning</CardTitle>
              <CardDescription>Use our AI tool to generate practice problems for this topic.</CardDescription>
          </CardHeader>
          <CardContent>
              <PracticeGenerator defaultTopic={lesson.topicForAI} />
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
