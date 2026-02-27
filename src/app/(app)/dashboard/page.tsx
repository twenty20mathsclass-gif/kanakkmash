'use client';
export const dynamic = 'force-dynamic';

import { useUser } from '@/firebase';
import { PageLoader } from '@/components/shared/page-loader';
import { Button } from '@/components/ui/button';
import { Bell, Search } from 'lucide-react';
import { LearningProgress } from '@/components/dashboard/learning-progress';
import { OngoingCourses } from '@/components/dashboard/ongoing-courses';
import { StudyHoursChart } from '@/components/dashboard/study-hours-chart';
import { Reveal } from '@/components/shared/reveal';
import type { User } from '@/lib/definitions';


export default function DashboardPage() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <PageLoader fullScreen={false} />
      </div>
    );
  }

  if (!user) {
    // This case should be handled by the layout, but as a fallback:
    return <div>Please sign in to view your dashboard.</div>;
  }

  const getSubtitle = (user: User) => {
    if (user.role !== 'student') {
      return user.role;
    }
    if (user.competitiveExam) {
      return user.competitiveExam;
    }
    if (user.courseModel && user.class) {
      return `${user.courseModel} - ${user.class}`;
    }
    if (user.courseModel) {
      return user.courseModel;
    }
    return user.role;
  };

  return (
    <div className="space-y-6">
      <Reveal>
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold font-headline">{user.name}</h1>
              <p className="text-sm text-muted-foreground">{getSubtitle(user)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell className="h-5 w-5" />
            </Button>
          </div>
        </header>
      </Reveal>

      <LearningProgress />
      
      <OngoingCourses />

      <StudyHoursChart />

    </div>
  );
}
