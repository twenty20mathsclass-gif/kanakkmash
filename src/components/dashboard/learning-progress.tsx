'use client';
import { useState, useEffect } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { collection, onSnapshot, collectionGroup, query, where } from 'firebase/firestore';
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Loader2, BookOpen, FileText, ShoppingBag } from "lucide-react";
import { Reveal } from "@/components/shared/reveal";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
  const [attendedClassesCount, setAttendedClassesCount] = useState(0);
  const [attendedExamsCount, setAttendedExamsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !user) {
        setLoading(false);
        return;
    };
    setLoading(true);

    const attendanceQuery = collection(firestore, 'users', user.id, 'attendance');
    const unsubAttendance = onSnapshot(attendanceQuery, (snapshot) => {
        let totalMins = 0;
        let classCount = 0;
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            totalMins += (data.durationMinutes || 0);
            if (data.type === 'class' || !data.type) { 
                classCount++;
            }
        });
        setTotalMinutes(totalMins);
        setAttendedClassesCount(classCount);
    }, (serverError: any) => {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `users/${user.id}/attendance`,
                operation: 'list',
            }, { cause: serverError });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.warn("Firestore error fetching learning progress:", serverError);
        }
    });
    
    const submissionsQuery = query(collectionGroup(firestore, 'submissions'), where('studentId', '==', user.id));
    const unsubSubmissions = onSnapshot(submissionsQuery, (snapshot) => {
        setAttendedExamsCount(snapshot.size);
        setLoading(false);
    }, (serverError: any) => {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `submissions collection group`,
                operation: 'list',
            }, { cause: serverError });
            errorEmitter.emit('permission-error', permissionError);
        } else {
             console.warn("Firestore error fetching exam submissions:", serverError);
        }
        setLoading(false);
    });

    return () => {
        unsubAttendance();
        unsubSubmissions();
    };
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ProgressCard 
          title="Total Time" 
          value={loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatTime(totalMinutes)}
          icon={<Clock className="h-5 w-5" />}
          color="hsl(30 95% 55%)"
          delay={0.1}
        />
        <ProgressCard 
          title="Total Class" 
          value={loading ? <Loader2 className="h-6 w-6 animate-spin" /> : attendedClassesCount}
          icon={<BookOpen className="h-5 w-5" />}
          color="hsl(210 80% 65%)"
          delay={0.2}
        />
        <ProgressCard 
          title="Total Exam Attended" 
          value={loading ? <Loader2 className="h-6 w-6 animate-spin" /> : attendedExamsCount}
          icon={<FileText className="h-5 w-5" />}
          color="hsl(140 60% 50%)"
          delay={0.3}
        />
        <ProgressCard 
          title="Number of Material" 
          value={loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 0}
          icon={<ShoppingBag className="h-5 w-5" />}
          color="hsl(270 80% 65%)"
          delay={0.4}
        />
      </div>
    </section>
  );
}
