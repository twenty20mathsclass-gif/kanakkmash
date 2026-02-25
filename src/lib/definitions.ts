export type User = {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin' | 'teacher';
  avatarUrl: string;
  syllabus?: string;
  class?: string;
  countryCode?: string;
  mobile?: string;
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

export type StudentProgress = {
  [courseId: string]: {
    completedLessons: string[];
  };
};

export type PracticeTopic = {
  id: string;
  title: string;
};
