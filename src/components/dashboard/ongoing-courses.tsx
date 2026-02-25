'use client';
import { Card, CardContent } from "@/components/ui/card";
import { courses } from "@/lib/data";
import { ArrowRight } from "lucide-react";
import Link from 'next/link';
import { Reveal } from "../shared/reveal";

export function OngoingCourses() {
    const ongoingCourses = courses.slice(0, 2); 
    const courseCardColors = ["hsl(30 95% 60%)", "hsl(255 85% 65%)"];

  return (
    <section>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold font-headline">Ongoing Courses</h2>
            <Link href="/courses" className="text-sm font-medium text-primary hover:underline">
                View All
            </Link>
        </div>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
        {ongoingCourses.map((course, index) => {
          const firstLesson = course.modules[0]?.lessons[0];
          return (
          <Reveal key={course.id} delay={0.2 + index * 0.1} className="min-w-[280px] w-[280px] flex-shrink-0">
             {firstLesson ? (
                <Link href={`/courses/${course.id}/lessons/${firstLesson.id}`} className="block h-full">
                    <Card style={{ backgroundColor: courseCardColors[index % courseCardColors.length] }} className="text-primary-foreground shadow-lg h-full">
                        <CardContent className="p-6 flex flex-col justify-between h-full">
                            <div>
                                <h3 className="font-bold font-headline text-2xl">{course.title}</h3>
                                <p className="text-sm text-primary-foreground/80 mt-1">by kanakkmash</p>
                            </div>
                            <div className="flex justify-between items-end mt-6">
                                <div>
                                    <p className="text-base">{course.modules.reduce((acc, m) => acc + m.lessons.length, 0) * 26} Lectures</p>
                                    <p className="text-base">~{course.modules.reduce((acc, m) => acc + m.lessons.length, 0) * 19} Hours</p>
                                </div>
                                <div className="bg-primary-foreground/20 rounded-full p-3">
                                    <ArrowRight className="h-6 w-6 text-primary-foreground" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
             ) : null}
          </Reveal>
        )})}
      </div>
    </section>
  );
}
