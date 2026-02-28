'use client';
import { useState, useEffect } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Card, CardContent } from "@/components/ui/card";
import { BrainCircuit, Clock, Flame, Loader2 } from "lucide-react";
import { Reveal } from "@/components/shared/reveal";

type ProgressCardProps = {
  title: string;
  value: string | React.ReactNode;
  icon: React.ReactNode;
  color: string;
  delay?: number;
};

function ProgressCard({ title, value, icon, color, delay = 0 }: ProgressCardProps) {
  return (
    <Reveal delay={delay}>
      <Card style={{ backgroundColor: color }} className="shadow-lg">
        <CardContent className="p-4 flex flex-col items-center justify-center text-primary-foreground h-28">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-medium">{title}</span>
          </div>
          <div className="text-2xl font-bold mt-1">{value}</div>
        </CardContent>
      </Card>
    </Reveal>
  );
}

export function LearningProgress() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !user) {
        setLoading(false);
        return;
    };

    const attendanceQuery = collection(firestore, 'users', user.id, 'attendance');
    const unsubscribe = onSnapshot(attendanceQuery, (snapshot) => {
        const total = snapshot.docs.reduce((sum, doc) => {
                return sum + (doc.data().durationMinutes || 0);
            }, 0);
        setTotalMinutes(total);
        setLoading(false);
    }, (error) => {
        console.error("Failed to fetch learning progress in real-time:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, user]);

  const formatTime = (minutes: number) => {
      if (minutes === 0) return `0m`;
      if (minutes < 60) return `${minutes}m`;
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) return `${hours}h`;
      return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <section>
      <h2 className="text-xl font-bold font-headline mb-4">Learning Progress</h2>
      <div className="grid grid-cols-3 gap-4">
        <ProgressCard 
          title="Total Time" 
          value={loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatTime(totalMinutes)}
          icon={<Clock className="h-5 w-5" />}
          color="hsl(30 95% 55%)"
          delay={0.1}
        />
        <ProgressCard 
          title="Retention" 
          value="88%" // Static for now
          icon={<BrainCircuit className="h-5 w-5" />}
          color="hsl(270 80% 65%)"
          delay={0.2}
        />
        <ProgressCard 
          title="Streak" 
          value="03" // Static for now
          icon={<Flame className="h-5 w-5" />}
          color="hsl(30 85% 50%)"
          delay={0.3}
        />
      </div>
    </section>
  );
}
