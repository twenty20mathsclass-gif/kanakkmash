
import type { Timestamp } from 'firebase/firestore';

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin' | 'teacher' | 'promoter';
  avatarUrl: string;
  countryCode?: string;
  mobile?: string;
  learningMode?: 'group' | 'one to one';
  teachingMode?: 'group' | 'one to one' | 'both';
  courseModel?: string;
  class?: string;
  level?: string;
  syllabus?: string;
  competitiveExam?: string;
  createdAt?: Timestamp;
  referredBy?: string;
  paymentMethod?: 'bank' | 'upi';
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  upiQrCodeUrl?: string;
  hourlyRate?: number;
  hourlyRateGroup?: number;
  hourlyRateOneToOne?: number;
  rewardPercentage?: number;
  assignedClasses?: string[];
  isDisabled?: boolean;
};

export type ChatGroup = {
  id: string;
  name: string;
  members: string[];
  admins: string[];
  createdBy: string;
  createdAt: Timestamp;
  lastMessage?: string;
  lastTimestamp?: Timestamp;
  isGroup: true;
  avatarUrl?: string;
};

export type CourseModel = {
  id: string;
  name: string;
  configType: 'class-syllabus' | 'level' | 'competitive-exam' | 'none';
  description?: string;
  isActive: boolean;
  createdAt: Timestamp;
};

export type TeacherPrivateDetails = {
    paymentMethod?: 'bank' | 'upi';
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
    upiQrCodeUrl?: string;
    hourlyRate?: number;
    hourlyRateGroup?: number;
    hourlyRateOneToOne?: number;
};

export type PromoterPrivateDetails = {
    paymentMethod?: 'bank' | 'upi';
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
    upiQrCodeUrl?: string;
    rewardPercentage?: number;
};

export type Reward = {
  id?: string;
  promoterId: string;
  studentId: string;
  studentName: string;
  feeAmount: number;
  rewardAmount: number;
  paidOut: boolean;
  createdAt: Timestamp;
};

export type ReferredStudent = {
  studentId: string;
  studentName: string;
  studentAvatarUrl?: string;
  courseModel: string;
  referredAt: Timestamp;
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
  startTime: string;
  endTime: string;
  meetLink: string;
  teacherId: string;
  icon: string;
  color: string;
  textColor: string;
  learningMode?: 'group' | 'one to one';
  classes?: string[];
  levels?: string[];
  studentId?: string;
  syllabus?: string;
  examId?: string;
  duration?: number;
  competitiveExam?: string;
  createdAt?: Timestamp;
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
  learningMode?: 'group' | 'one to one';
  classes?: string[];
  levels?: string[];
  syllabus?: string;
  studentId?: string;
  competitiveExam?: string;
  examType: 'mcq' | 'descriptive';
  questions?: McqQuestion[];
  questionPaperUrl?: string;
  questionPaperContent?: string;
  totalMarks?: number;
};

export type ExamSubmission = {
    id: string;
    examId: string;
    studentId: string;
    studentName: string;
    examTitle: string;
    submittedAt: Timestamp;
    examType: 'mcq' | 'descriptive';
    answers?: (number | null)[];
    totalQuestions?: number;
    score?: number; 
    answerFileUrl?: string;
    status?: 'submitted' | 'reviewed';
    feedback?: string;
    totalMarks?: number;
};


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

export type SalaryPayment = {
  id?: string;
  teacherId: string;
  hourlyRate?: number;
  hourlyRateGroup?: number;
  hourlyRateOneToOne?: number;
  totalHours: number;
  totalHoursGroup?: number;
  totalHoursOneToOne?: number;
  amount: number;
  paymentDate: Timestamp;
  startDate: Timestamp;
  endDate: Timestamp;
  paymentMonth?: string;
  invoiceId?: string;
};

export type SalaryInvoice = {
    id: string;
    teacherId: string;
    teacherName: string;
    teacherEmail: string;
    paymentDate: Timestamp;
    startDate: Timestamp;
    endDate: Timestamp;
    hourlyRate?: number;
    hourlyRateGroup?: number;
    hourlyRateOneToOne?: number;
    totalHours: number;
    totalHoursGroup?: number;
    totalHoursOneToOne?: number;
    amount: number;
}


export type BlogPost = {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  likes?: string[];
};

export type BlogComment = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string;
  text: string;
  createdAt: Timestamp;
};

export type ChatMessage = {
  id?: string;
  text: string;
  senderId: string;
  timestamp: Timestamp;
  isRead?: boolean;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  href: string;
  createdAt: Timestamp;
  isRead: boolean;
};

export type CourseFee = {
  id: string;
  courseModel: string;
  learningMode?: 'group' | 'one to one';
  class?: string;
  level?: string;
  syllabus?: string;
  competitiveExam?: string;
  amount: number;
  createdAt: Timestamp;
};

export type Invoice = {
  id: string;
  studentId: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'overdue';
  type: 'fee' | 'cart';
  createdAt: Timestamp;
  dueDate: Timestamp;
  paidAt?: Timestamp;
  paymentId: string;
  paymentMethod: string;
};

export type RecordedClass = {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  teacherId: string;
  teacherName: string;
  teacherAvatarUrl: string;
  courseModel: string;
  class?: string;
  level?: string;
  syllabus?: string;
  competitiveExam?: string;
  createdAt: Timestamp;
};

export type Announcement = {
  id: string;
  text: string;
  link?: string;
  isActive: boolean;
  createdAt: Timestamp;
};
