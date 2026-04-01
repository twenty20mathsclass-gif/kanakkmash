
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { useFirebase, useUser } from "@/firebase";
import type { Homework, Schedule, User } from "@/lib/definitions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen } from "lucide-react";
import { HomeworkInterface } from "@/components/student/homework-interface";
import { Reveal } from "@/components/shared/reveal";
import { format } from "date-fns";

type PageProps = {
  params: {
    homeworkId: string;
  };
};

export default function SubmitHomeworkPage({ params }: PageProps) {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const router = useRouter();
  const { homeworkId } = params;

  const [homework, setHomework] = useState<Homework | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [status, setStatus] = useState<
    "loading" | "already_submitted" | "ready" | "error"
  >("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firestore || !homeworkId || !user) return;

    const checkSubmissionAndFetchHomework = async () => {
      try {
        // 1. Check if a submission already exists
        const submissionRef = doc(
          firestore,
          "homeworks",
          homeworkId,
          "submissions",
          user.id
        );
        const submissionSnap = await getDoc(submissionRef);

        if (submissionSnap.exists()) {
          setStatus("already_submitted");
          return;
        }

        // 2. Fetch homework data
        const homeworkRef = doc(firestore, "homeworks", homeworkId);
        const homeworkSnap = await getDoc(homeworkRef);

        if (homeworkSnap.exists()) {
          const hData = homeworkSnap.data();
          setHomework({ id: homeworkSnap.id, ...hData } as Homework);
          
          // 3. Fetch schedule
          const scheduleQuery = query(
            collection(firestore, "schedules"),
            where("homeworkId", "==", homeworkId)
          );
          const scheduleSnap = await getDocs(scheduleQuery);

          let currentSchedule: Schedule | null = null;
          if (!scheduleSnap.empty) {
            currentSchedule = {
              id: scheduleSnap.docs[0].id,
              ...scheduleSnap.docs[0].data(),
            } as Schedule;
            setSchedule(currentSchedule);
          }

          // Fetch teacher name if missing
          const teacherId = hData.teacherId || currentSchedule?.teacherId;
          if (teacherId) {
            const teacherSnap = await getDoc(doc(firestore, "users", teacherId));
            if (teacherSnap.exists()) {
                const tData = teacherSnap.data();
                if (currentSchedule && !currentSchedule.teacherName) {
                    setSchedule({ ...currentSchedule, teacherName: tData.name });
                }
            }
          }

          // 4. Check if current time is within validity period
          if (currentSchedule) {
            const now = Timestamp.now().toMillis();
            const startMillis = currentSchedule.startDate?.toMillis() || 0;
            const endMillis = currentSchedule.endDate?.toMillis() || Infinity;

            if (now < startMillis) {
                setError(`Assignment not started yet. Available from: ${format(currentSchedule.startDate!.toDate(), 'PPP p')}`);
                setStatus('error');
                return;
            }

            if (now > endMillis) {
                setError('The deadline for this assignment has passed.');
                setStatus("error");
                return;
            }
          }
          
          setStatus("ready");
        } else {
          setError("Homework assignment not found.");
          setStatus("error");
          return;
        }
      } catch (err: any) {
        console.warn("Error fetching homework data:", err);
        setError("Failed to load homework. Please try again.");
        setStatus("error");
      }
    };

    checkSubmissionAndFetchHomework();
  }, [firestore, homeworkId, user, router]);

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <div className="flex flex-col justify-center items-center h-64 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Preparing homework session...</p>
          </div>
        );
      case "already_submitted":
        return (
          <Card className="rounded-[3rem] shadow-2xl border-none overflow-hidden">
             <CardHeader className="p-12 pb-6 text-center space-y-4">
                 <div className="h-32 w-32 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary border-8 border-white shadow-xl animate-pulse">
                    <BookOpen className="h-16 w-16" />
                </div>
                <CardTitle className="text-4xl font-black tracking-tighter">Academic Session Recorded</CardTitle>
                <CardDescription className="text-xl font-bold">You have already transmitted your responses for this assignment.</CardDescription>
             </CardHeader>
             <CardContent className="p-12 text-center">
                 <p className="text-muted-foreground font-medium text-lg max-w-lg mx-auto">Your work has been safely recorded in the central evaluation system. Please visit your schedule for results or new assignments.</p>
                 <Button onClick={() => router.push('/exam-schedule')} size="lg" className="mt-10 rounded-full px-16 h-18 text-xl font-black bg-primary shadow-2xl transition-all hover:scale-105 active:scale-95">
                    Return to Mission Hub
                 </Button>
             </CardContent>
          </Card>
        );
      case "error":
        return (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle>Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive font-medium">{error}</p>
            </CardContent>
          </Card>
        );
      case "ready":
        if (homework && user) {
          return (
            <Reveal>
              <HomeworkInterface
                homework={homework}
                schedule={schedule}
                user={user}
              />
            </Reveal>
          );
        }
      default:
        return (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground font-medium">
              Could not load homework details.
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      {renderContent()}
    </div>
  );
}

export const dynamic = "force-dynamic";
