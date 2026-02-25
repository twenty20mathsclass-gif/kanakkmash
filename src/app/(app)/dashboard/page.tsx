'use client';
export const dynamic = 'force-dynamic';

import { useUser } from '@/firebase';
import { PageLoader } from '@/components/shared/page-loader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Bell, Search } from 'lucide-react';
import { LearningProgress } from '@/components/dashboard/learning-progress';
import { OngoingCourses } from '@/components/dashboard/ongoing-courses';
import { StudyHoursChart } from '@/components/dashboard/study-hours-chart';
import { Reveal } from '@/components/shared/reveal';


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

  return (
    <div className="space-y-6">
      <Reveal>
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold font-headline">{user.name}</h1>
              <p className="text-sm text-muted-foreground">{user.role}</p>
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
