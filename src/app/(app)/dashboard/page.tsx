
'use client';
export const dynamic = 'force-dynamic';

import { useUser } from '@/firebase';
import { LearningProgress } from '@/components/dashboard/learning-progress';
import { UpcomingClasses } from '@/app/(app)/dashboard/upcoming-classes';
import { StudyHoursChart } from '@/components/dashboard/study-hours-chart';
import { Reveal } from '@/components/shared/reveal';
import type { User } from '@/lib/definitions';
import { NotificationBell } from '@/components/shared/notification-bell';
import { UpcomingExams } from '@/components/dashboard/upcoming-exams';


export default function DashboardPage() {
  const { user, loading } = useUser();

  if (loading || !user) {
    // The AppLayout handles the initial full-screen loading.
    // We return null here to prevent a second loader from appearing
    // and to avoid rendering content before the user object is ready.
    return null;
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
    <div className="space-y-8">
      <Reveal>
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold font-headline">{user.name}</h1>
              <p className="text-sm text-muted-foreground">{getSubtitle(user)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell user={user} />
          </div>
        </header>
      </Reveal>

      <LearningProgress />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
            <UpcomingClasses />
            <UpcomingExams />
        </div>
        <div className="lg:col-span-1">
            <StudyHoursChart />
        </div>
      </div>

    </div>
  );
}
