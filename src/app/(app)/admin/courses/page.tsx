import { courses } from "@/lib/data";
import { CoursesTable } from "@/components/admin/courses-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Reveal } from '@/components/shared/reveal';

export const dynamic = 'force-dynamic';

export default function AdminCoursesPage() {
  return (
    <div className="space-y-8">
        <Reveal>
          <div className="flex items-center justify-between">
              <div>
                  <h1 className="text-3xl font-bold font-headline">Course Management</h1>
                  <p className="text-muted-foreground">Create, edit, and manage all courses.</p>
              </div>
              <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Course
              </Button>
          </div>
        </Reveal>
        <Reveal delay={0.2}>
          <Card>
            <CardHeader>
              <CardTitle>All Courses</CardTitle>
              <CardDescription>A list of all courses in the system.</CardDescription>
            </CardHeader>
            <CardContent>
                <CoursesTable courses={courses} />
            </CardContent>
          </Card>
        </Reveal>
    </div>
  );
}
