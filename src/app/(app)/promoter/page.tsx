
'use client';
import { useUser } from '@/firebase';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Reveal } from '@/components/shared/reveal';

export default function PromoterDashboardPage() {
  const { user } = useUser();

  return (
    <div className="space-y-8">
      <Reveal>
        <div>
          <h1 className="text-3xl font-bold font-headline">
            Welcome, {user?.name || 'Promoter'}!
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your promoter activities.
          </p>
        </div>
      </Reveal>
      <Card>
        <CardHeader>
            <CardTitle>Promoter Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Your referral and reward information will be displayed here. Use the sidebar to navigate to your referrals and reward history.</p>
        </CardContent>
      </Card>
    </div>
  );
}
