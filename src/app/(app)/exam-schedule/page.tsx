"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  format,
  addDays,
  startOfWeek,
  isToday,
  isSameDay,
  startOfDay,
  endOfDay,
  parse,
} from "date-fns";
import { useFirebase, useUser } from "@/firebase";
import {
  collection,
  query,
  where,
  Timestamp,
  onSnapshot,
  doc,
  getDoc,
  collectionGroup,
} from "firebase/firestore";
import type { Schedule, User } from "@/lib/definitions";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Clock,
  MoreHorizontal,
  BookText,
  AppWindow,
  FlaskConical,
  CalendarDays,
  Loader2,
  BarChart,
  User as UserIcon,
  Award,
  BookOpen,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/shared/reveal";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { CalendarView } from "@/components/shared/calendar-view";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const iconMap: { [key: string]: React.ElementType } = {
  BookText,
  AppWindow,
  FlaskConical,
  BarChart,
  User: UserIcon,
  Award,
  BookOpen,
  Trophy,
};

type ScheduleWithTeacher = Schedule & { teacherName?: string };

export default function ExamSchedulePage() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"exam" | "homework">("homework");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedules, setSchedules] = useState<ScheduleWithTeacher[]>([]);
  const [eventDates, setEventDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Schedule | null>(null);
  const [completedExams, setCompletedExams] = useState<string[]>([]);
  const [completedHomeworks, setCompletedHomeworks] = useState<string[]>([]);

  useEffect(() => {
    if (!firestore || !user) {
      setSchedules([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);

    // Initial query for both exams and homework
    // We'll filter them correctly in the snapshot handler
    const schedulesQuery = query(
      collection(firestore, "schedules"),
      where("type", "in", ["exam", "homework"])
    );

    const unsubscribe = onSnapshot(
      schedulesQuery,
      async (snapshot) => {
        let filteredSchedules = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }) as Schedule)
          .filter((schedule) => {
            // 1. Correct Tab Filter
            if (schedule.type !== activeTab) return false;

            // 2. Date Filter
            if (schedule.type === "exam") {
              const examDate = schedule.date?.toDate();
              if (!examDate || !isSameDay(examDate, selectedDate)) return false;
            } else {
              // Homework Range Filter
              const startDate = schedule.startDate?.toDate();
              const endDate = schedule.endDate?.toDate();
              if (!startDate || !endDate) return false;
              
              const day = startOfDay(selectedDate);
              const sDate = startOfDay(startDate);
              const eDate = startOfDay(endDate);
              
              if (day < sDate || day > eDate) return false;
            }

            // 3. Identification Filter (Personal)
            if (schedule.studentId === user.id) return true;

            // 4. Identification Filter (Group)
            if (!schedule.studentId && schedule.courseModel === user.courseModel) {
              if (user.courseModel === "COMPETITIVE EXAM") {
                return schedule.competitiveExam === user.competitiveExam;
              }
              if (user.courseModel === "TWENTY 20 BASIC MATHS") {
                return user.level && schedule.levels?.includes(user.level);
              }
              if (user.class && schedule.classes?.includes(user.class)) {
                if (user.class !== "DEGREE") {
                  return schedule.syllabus === user.syllabus;
                }
                return true;
              }
            }
            return false;
          });

        if (filteredSchedules.length === 0) {
          setSchedules([]);
          setLoading(false);
          return;
        }

        const teacherIds = [...new Set(filteredSchedules.map((s) => s.teacherId))];
        const teacherDocs = await Promise.all(
          teacherIds.map((id) => getDoc(doc(firestore, "users", id)))
        );

        const teachersMap = new Map<string, string>();
        teacherDocs.forEach((docSnap) => {
          if (docSnap && docSnap.exists()) {
            teachersMap.set(docSnap.id, docSnap.data().name);
          }
        });

        const schedulesWithTeacherNames: ScheduleWithTeacher[] =
          filteredSchedules.map((schedule) => ({
            ...schedule,
            teacherName: teachersMap.get(schedule.teacherId) || "Unknown",
          }));

        // Sort by start time if available, otherwise title
        schedulesWithTeacherNames.sort((a, b) =>
          (a.startTime || "").localeCompare(b.startTime || "") || a.title.localeCompare(b.title)
        );
        setSchedules(schedulesWithTeacherNames);
        setLoading(false);
      },
      (serverError: any) => {
        console.warn("Firestore error fetching schedule:", serverError);
        setSchedules([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedDate, firestore, user, activeTab]);

  useEffect(() => {
    if (!firestore || !user) return;

    const allQuery = query(
      collection(firestore, "schedules"),
      where("type", "in", ["exam", "homework"]),
    );

    const unsub = onSnapshot(allQuery, (snapshot) => {
      const datesSet = new Set<string>();
      
      snapshot.docs.forEach((doc) => {
        const schedule = { id: doc.id, ...doc.data() } as Schedule;
        
        // Use logic similar to the list filter but broader for "Has Content" markers
        let isEligible = false;
        if (schedule.studentId === user.id) isEligible = true;
        else if (!schedule.studentId && schedule.courseModel === user.courseModel) {
            if (user.courseModel === "COMPETITIVE EXAM") isEligible = (schedule.competitiveExam === user.competitiveExam);
            else if (user.courseModel === "TWENTY 20 BASIC MATHS") isEligible = (!!user.level && !!schedule.levels?.includes(user.level));
            else if (user.class && schedule.classes?.includes(user.class)) {
              if (user.class !== "DEGREE") isEligible = (schedule.syllabus === user.syllabus);
              else isEligible = true;
            }
        }

        if (isEligible) {
          if (schedule.type === 'homework' && schedule.startDate && schedule.endDate) {
            let curr = startOfDay(schedule.startDate.toDate());
            const last = startOfDay(schedule.endDate.toDate());
            while (curr <= last) {
              datesSet.add(startOfDay(curr).toISOString());
              curr = addDays(curr, 1);
            }
          } else if (schedule.date) {
            datesSet.add(startOfDay(schedule.date.toDate()).toISOString());
          }
        }
      });

      const uniqueDates = Array.from(datesSet).map(iso => new Date(iso));
      setEventDates(uniqueDates);
    });

    return () => unsub();
  }, [firestore, user]);

  const [loadingH, setLoadingH] = useState(true);
  const [loadingE, setLoadingE] = useState(true);
  const loadingSubmissions = loadingH || loadingE;

  useEffect(() => {
    if (!firestore || !user) return;

    // Using top-level collections for better performance and reliability than collectionGroup
    const hSubQuery = query(collection(firestore, "homework_submissions"), where("studentId", "==", user.id));
    const eSubQuery = query(collection(firestore, "exams_submissions"), where("studentId", "==", user.id));

    const unsubH = onSnapshot(hSubQuery, (snapshot) => {
      const ids = snapshot.docs.map(doc => doc.data().homeworkId);
      setCompletedHomeworks(ids);
      setLoadingH(false);
    });

    const unsubE = onSnapshot(eSubQuery, (snapshot) => {
      const ids = snapshot.docs.map(doc => doc.data().examId);
      setCompletedExams(ids);
      setLoadingE(false);
    });

    return () => { unsubH(); unsubE(); };
  }, [firestore, user]);

  const startOfSelectedWeek = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }).map((_, i) =>
    addDays(startOfSelectedWeek, i),
  );

  const getFormattedTime = (time: string) => {
    if (!time) return "";
    try {
      const date = parse(time, "HH:mm", new Date());
      return format(date, "hh:mmaaa");
    } catch {
      return "";
    }
  };

  const handleAction = (event: Schedule) => {
    if (activeTab === "exam") {
      if (!event.examId) return;
      router.push(`/exams/take/${event.examId}`);
    } else {
      if (!event.homeworkId) return;
      router.push(`/homework/submit/${event.homeworkId}`);
    }
    setSelectedEvent(null);
  };

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  return (
    <div className="space-y-8 w-full max-w-md md:max-w-3xl lg:max-w-4xl mx-auto pb-24 px-4 pt-6">
      <Reveal>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold font-headline">
            Practice Schedule
          </h1>
          <div className="flex items-center gap-2">
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-10 w-10"
                >
                  <CalendarDays className="h-6 w-6" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 rounded-3xl overflow-hidden border-2 shadow-2xl"
                align="end"
              >
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date: Date | undefined) => {
                    date && setSelectedDate(date);
                    setIsCalendarOpen(false);
                  }}
                  initialFocus
                  modifiers={{ hasEvent: eventDates }}
                  modifiersStyles={{
                    selected: {
                      color: "white",
                      backgroundColor: "hsl(var(--primary))",
                      borderRadius: "0.75rem",
                    },
                    hasEvent: {
                      fontWeight: "bold",
                      textDecoration: "underline",
                      color: "hsl(var(--primary))",
                    },
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </Reveal>

      {/* Tabs Design */}
      <Reveal delay={0.05}>
        <div className="flex p-1 bg-muted rounded-2xl w-full max-w-[280px] mx-auto border shadow-inner">
          <button
            onClick={() => setActiveTab("homework")}
            className={cn(
              "flex-1 py-2 text-sm font-bold rounded-xl transition-all duration-300",
              activeTab === "homework"
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Home Work
          </button>
          <button
            onClick={() => setActiveTab("exam")}
            className={cn(
              "flex-1 py-2 text-sm font-bold rounded-xl transition-all duration-300",
              activeTab === "exam"
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Exams
          </button>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex w-max space-x-1 p-1 bg-muted rounded-full mx-auto">
            {weekDays.map((day) => (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "flex flex-col items-center justify-center w-12 h-16 rounded-full transition-colors relative shrink-0",
                  isSameDay(day, selectedDate)
                    ? "bg-orange-500 text-white shadow-lg"
                    : "hover:bg-accent/50",
                )}
              >
                <span className="text-[10px] uppercase font-medium">{format(day, "E")}</span>
                <span className="font-bold text-lg">{format(day, "d")}</span>
                {isToday(day) && !isSameDay(day, selectedDate) && (
                  <div className="absolute bottom-1.5 h-1 w-1 rounded-full bg-orange-500"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <Card
          className={cn(
            "text-primary-foreground shadow-lg transition-colors duration-500 bg-[#a855f7]",
          )}
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-medium opacity-90 uppercase tracking-wider">Today's Progress</p>
                <p className="text-xl font-bold mt-1">
                  {activeTab === "exam"
                    ? `${completedExams.length} Exams Finished`
                    : `${completedHomeworks.length} Homeworks Finished`}
                </p>
              </div>
              <div className="bg-white/20 p-3 rounded-2xl">
                {activeTab === "exam" ? (
                    <Trophy className="h-6 w-6 text-white" />
                ) : (
                    <BookOpen className="h-6 w-6 text-white" />
                )}
              </div>
            </div>
            <Progress
              value={schedules.length > 0
                ? (activeTab === "exam"
                    ? (completedExams.filter((id) => schedules.some((s) => s.examId === id)).length / schedules.length) * 100
                    : (completedHomeworks.filter((id) => schedules.some((s) => s.homeworkId === id)).length / schedules.length) * 100)
                : 0
              }
              className="mt-4 h-2 bg-white/20 [&>*]:bg-white"
            />
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.3}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold font-headline">
            My {activeTab === "exam" ? "Exam" : "Home Work"} Schedule for{" "}
            {format(selectedDate, "MMMM d")}
          </h2>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </Reveal>

      <Reveal
        delay={0.4}
        className="space-y-1 relative border-l-2 border-dashed border-border ml-20 pl-6"
      >
        {loading || loadingSubmissions ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : schedules.length > 0 ? (
          schedules.map((event) => {
            const IconComponent =
              iconMap[event.icon] ||
              (activeTab === "exam" ? BookOpen : BookText);
            const isCompleted =
              activeTab === "exam"
                ? completedExams.includes(event.examId || "")
                : completedHomeworks.includes(event.homeworkId || "");

            // Time validity check
            const now = new Date();
            const startLimit = event.type === 'homework' ? event.startDate?.toDate() : event.date?.toDate();
            const endLimit = event.type === 'homework' ? event.endDate?.toDate() : event.date?.toDate();
            // Note: exams also have endTime, but for the list we use the day usually.
            
            const isOutsideRange = (startLimit && now < startLimit) || (endLimit && now > endLimit);
            const isClickable = !isCompleted && !isOutsideRange;

            return (
              <div key={event.id} className="relative mb-6">
                {event.type === 'exam' && (
                  <div className="absolute -left-[5.5rem] top-1 text-xs font-medium text-muted-foreground w-16 text-right">
                    {getFormattedTime(event.startTime || "")}
                  </div>
                )}
                <div className="absolute -left-[1.95rem] top-2 h-3 w-3 rounded-full bg-border border-2 border-background z-10"></div>

                <Card
                  onClick={() => {
                    if (isCompleted) {
                      toast({
                        title: "Already Completed",
                        description: `You have already finished this ${activeTab}.`,
                        variant: "default"
                      });
                      return;
                    }

                    if (isClickable) {
                      if (activeTab === "exam") {
                        setSelectedEvent(event);
                      } else {
                        handleAction(event);
                      }
                    } else if (isOutsideRange) {
                       toast({
                        title: "Access Restricted",
                        description: "This assignment is not currently available.",
                        variant: "destructive"
                      });
                    }
                  }}
                  style={{ backgroundColor: event.color }}
                  className={cn(
                    "shadow-lg transition-all relative overflow-hidden group",
                    isClickable
                      ? "cursor-pointer hover:shadow-xl hover:translate-x-1"
                      : "opacity-60 cursor-not-allowed grayscale-[0.2]",
                  )}
                >
                  {isCompleted && (
                    <Badge
                      variant="secondary"
                      className="absolute top-2 right-2 bg-background/25 border-none text-xs"
                      style={{ color: event.textColor }}
                    >
                      Already Completed
                    </Badge>
                  )}
                  <CardContent
                    className="p-4"
                    style={{ color: event.textColor }}
                  >
                    <div className="flex gap-4 items-center">
                      <div className="bg-background/20 rounded-xl p-3 flex items-center justify-center shrink-0">
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs opacity-80 uppercase tracking-wider font-semibold">
                          {event.subject}
                        </p>
                        <p className="font-bold text-base leading-tight mt-0.5">
                          {event.title}
                        </p>
                        {event.type === 'exam' && (
                          <div className="flex items-center gap-3 mt-2 text-xs opacity-90">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              <span>
                                {getFormattedTime(event.startTime || "")} -{" "}
                                {getFormattedTime(event.endTime || "")}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <UserIcon className="h-3.5 w-3.5" />
                              <span>{event.teacherName}</span>
                            </div>
                          </div>
                        )}
                        {event.type === 'homework' && (
                           <div className="flex items-center gap-3 mt-2 text-xs opacity-90">
                            <div className="flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5" />
                              <span>
                                {event.startDate && format(event.startDate.toDate(), "MMM d")} - {event.endDate && format(event.endDate.toDate(), "MMM d")}
                              </span>
                            </div>
                             <div className="flex items-center gap-1">
                              <UserIcon className="h-3.5 w-3.5" />
                              <span>{event.teacherName}</span>
                            </div>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {event.classes?.map((c) => (
                            <Badge
                              key={c}
                              variant="secondary"
                              className="bg-background/20 border-none text-[10px] font-medium"
                              style={{ color: "inherit" }}
                            >
                              {c}
                            </Badge>
                          ))}
                          {event.syllabus && (
                            <Badge
                              variant="secondary"
                              className="bg-background/20 border-none text-[10px] font-medium"
                              style={{ color: "inherit" }}
                            >
                              {event.syllabus}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })
        ) : (
          <div className="text-center text-muted-foreground text-sm py-12 bg-muted/30 rounded-3xl border-2 border-dashed">
            No {activeTab}s scheduled for this day.
          </div>
        )}
      </Reveal>

      <AlertDialog
        open={!!selectedEvent}
        onOpenChange={(isOpen) => !isOpen && setSelectedEvent(null)}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">
              {selectedEvent?.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              You are about to start this {activeTab}. Once started, the timer
              cannot be paused.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="p-4 bg-muted rounded-2xl space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subject</span>
              <span className="font-semibold">{selectedEvent?.subject}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Time</span>
              <span className="font-semibold">
                {selectedEvent
                  ? `${getFormattedTime(selectedEvent.startTime || "")} - ${getFormattedTime(selectedEvent.endTime || "")}`
                  : ""}
              </span>
            </div>
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-full">
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={() => selectedEvent && handleAction(selectedEvent)}
              className="rounded-full px-8"
            >
              Start {activeTab === "exam" ? "Exam" : "Homework"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
