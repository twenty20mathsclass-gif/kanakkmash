
'use client';
export const dynamic = 'force-dynamic';

import { useUser } from '@/firebase';
import { LearningProgress } from '@/components/dashboard/learning-progress';
import { UpcomingClasses } from '@/components/dashboard/upcoming-classes';
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
    if (user.role !== 'student') return user.role;
    
    const parts = [];
    if (user.courseModel) parts.push(user.courseModel);
    
    if (user.courseModel === 'TWENTY 20 BASIC MATHS') {
      if (user.level) parts.push(user.level);
    } else if (user.courseModel === 'MATHS ONLINE TUITION') {
      if (user.class) parts.push(user.class);
      if (user.syllabus) parts.push(user.syllabus);
    } else if (user.courseModel === 'COMPETITIVE EXAM') {
      if (user.competitiveExam) parts.push(user.competitiveExam);
    } else if (user.competitiveExam) {
      // Fallback if courseModel is not set but exam is
      parts.push(user.competitiveExam);
    }

    return parts.length > 0 ? parts.join(' - ') : 'Student';
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
