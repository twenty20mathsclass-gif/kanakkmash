import type { Timestamp } from 'firebase/firestore';

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin' | 'teacher';
  avatarUrl: string;
  countryCode?: string;
  mobile?: string;
  courseModel?: string;
  class?: string;
  syllabus?: string;
  competitiveExam?: string;
};

export type Lesson = {
  id: string;
  title: string;
  content: string;
  topicForAI: string;
};

export type Module = {
  id: string;
  title: string;
  lessons: Lesson[];
};

export type Course = {
  id: string;
  title: string;
  description: string;
  imageId: string;
  modules: Module[];
};

export type Schedule = {
  id: string;
  courseModel: string;
  subject: string;
  title: string;
  date: Timestamp;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  meetLink: string;
  teacherId: string;
  icon: string; // lucide icon name
  color: string; // hsl color
  textColor: string;
  class?: string;
  studentId?: string;
};

export type StudentProgress = {
  [courseId: string]: {
    completedLessons: string[];
  };
};

export type PracticeTopic = {
  id: string;
  title: string;
};
