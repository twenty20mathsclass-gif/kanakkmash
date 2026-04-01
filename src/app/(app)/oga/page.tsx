'use client';

import Link from 'next/link';
import { FilePenLine, Settings, ClipboardList, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Reveal } from '@/components/shared/reveal';
import { useUser } from '@/firebase';

export default function OGADashboardPage() {
  const { user } = useUser();

  const cards = [
    {
      href: '/oga/questions',
      icon: FilePenLine,
      title: 'Assessment Questions',
      description: 'Create, edit, and manage questions for the public assessment test.',
      color: 'hsl(28 95% 53%)',
    },
    {
      href: '/oga/settings',
      icon: Settings,
      title: 'Test Settings',
      description: 'Set the assessment test duration and toggle it active or inactive.',
      color: 'hsl(210 80% 55%)',
    },
  ];

  return (
    <div className="space-y-8">
      <Reveal>
        <div>
          <h1 className="text-3xl font-bold font-headline">OGA Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome, <span className="font-semibold text-foreground">{user?.name}</span>. Manage the assessment test from here.
          </p>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Reveal key={card.href} delay={i * 0.1}>
              <Link href={card.href}>
                <Card className="hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer border-border h-full">
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: card.color }}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{card.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed">{card.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={0.3}>
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Quick Guide</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1.5">
            <p>1. Go to <strong>Assessment Questions</strong> to add MCQ questions for the test.</p>
            <p>2. In <strong>Test Settings</strong>, set the duration and activate the assessment.</p>
            <p>3. Students can take the test at <strong>/assessment-form</strong> → <strong>/assessment-test</strong>.</p>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
