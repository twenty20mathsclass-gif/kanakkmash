
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
  createdAt?: Timestamp;
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
  type: 'class' | 'exam';
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
  syllabus?: string;
  examId?: string;
  duration?: number; // in minutes, for exam countdown
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

export type McqOption = {
  text: string;
};

export type McqQuestion = {
  questionText: string;
  imageUrl?: string;
  options: McqOption[];
  correctAnswerIndex: number;
};

export type Exam = {
  id: string;
  teacherId: string;
  title: string;
  courseModel: string;
  class?: string;
  syllabus?: string;
  studentId?: string;
  questions: McqQuestion[];
};

export type ExamSubmission = {
    id: string;
    examId: string;
    studentId: string;
    studentName: string;
    answers: (number | null)[];
    submittedAt: Timestamp;
    score: number;
    totalQuestions: number;
    examTitle: string;
}

export type CartOffer = {
  id?: string;
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
};

export type CourseCategory = {
  id?: string;
  name: string;
  courseCount: string;
  imageUrl: string;
  style: 'primary' | 'secondary' | 'accent';
};

export type PopularCourse = {
  id?: string;
  courseId: string;
};

export type Testimonial = {
  id: string;
  studentName: string;
  quote: string;
  imageUrl: string;
  videoUrl?: string;
  link?: string;
  createdAt: Timestamp;
};
