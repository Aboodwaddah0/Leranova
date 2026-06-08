// ── Instructor Profile ────────────────────────────────────────────────────────
export interface InstructorProfile {
  id: number;
  userId?: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string | null;
  gender?: string | null;
  age?: number | null;
  address?: string | null;
  work?: string | null;
  specialization?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  organization?: {
    id: number;
    Name?: string;
    type?: string;  // 'SCHOOL' | 'ACADEMY'
    studentMode?: string;
  };
  studentMode?: string; // 'SCHOOL' | 'ACADEMY'
}

// ── Course / Subject / Lesson ──────────────────────────────────────────────────
export interface InstructorCourse {
  id: number;
  Name: string;
  Description?: string | null;
  Thumbnail?: string | null;
  GradeLevel?: number | null;
  level?: string | null;
  kind?: string | null;
  Kind?: string | null;
  enrolledCount?: number;
}

export interface InstructorSubject {
  id: number;
  name: string;
  Description?: string | null;
  courseId?: number;
  courseName?: string;
  level?: string | null;
  imageUrl?: string | null;
  lessonsCount?: number;
}

export interface InstructorLesson {
  id: number;
  title: string;
  description?: string | null;
  videoUrl?: string | null;
  subjectId: number;
  subjectName?: string;
  courseId?: number;
  createdAt?: string;
  updatedAt?: string;
  aiContentPublished?: boolean;
  aiContentStatus?: string;
}

// ── Attachments ────────────────────────────────────────────────────────────────
export interface LessonAttachment {
  id: number;
  originalName?: string;
  name?: string;
  fileUrl?: string;
  url?: string;
  fileType?: string;
  type?: string;
  mimeType?: string;
  fileSize?: number;
  ragStatus?: string;
}

// ── RAG ────────────────────────────────────────────────────────────────────────
export interface RagStatus {
  processed: number;
  total: number;
  status?: string;
}

// ── AI Content ────────────────────────────────────────────────────────────────
export interface Flashcard {
  id?: string | number;
  question: string;
  answer: string;
}

export interface MindmapBranch {
  label: string;
  children?: string[];
}

export interface Mindmap {
  central: string;
  branches: MindmapBranch[];
}

export interface AiContent {
  flashcards?: Flashcard[];
  mindmap?: Mindmap;
  isPublished?: boolean;
  lang?: string;
}

// ── Slides ─────────────────────────────────────────────────────────────────────
export interface SlideItem {
  title?: string;
  content?: string;
  bulletPoints?: string[];
}

export interface PowerSlides {
  title?: string;
  slides?: SlideItem[];
  theme?: string;
  lang?: string;
  numSlides?: number;
  generatedAt?: string;
}

// ── Quiz ───────────────────────────────────────────────────────────────────────
export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';

export interface QuizQuestion {
  id?: number;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer?: string | number;
  expectedAnswer?: string;
  explanation?: string;
  lang?: string;
}

export interface Quiz {
  id: number;
  title: string;
  difficulty?: string;
  passingScore?: number;
  isPublished?: boolean;
  questions?: QuizQuestion[];
  lang?: string;
}

// ── Students ───────────────────────────────────────────────────────────────────
export interface InstructorStudent {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  address?: string | null;
  dob?: string | null;
  gender?: string | null;
  age?: number | null;
  registrationNumber?: string | null;
  phone?: string | null;
}

// ── Student Notes ──────────────────────────────────────────────────────────────
export interface StudentNote {
  id: number;
  studentId: number;
  title?: string | null;
  content: string;
  createdAt?: string;
}

// ── Marks ──────────────────────────────────────────────────────────────────────
export interface InstructorMark {
  id: number;
  studentId?: number;
  Student_id?: number;
  studentName?: string;
  subjectId?: number;
  Subject_id?: number;
  subjectName?: string;
  courseId?: number;
  Numbers: number;
  OutOf: number;
  ExamPercentage?: number;
  MarkType?: string;
  time?: string;
  termId?: number | null;
  academicYearId?: number | null;
  gradeLevel?: number | null;
}

// ── Analytics ──────────────────────────────────────────────────────────────────
export interface InstructorAnalytics {
  overview?: {
    totalStudents: number;
    activeStudents: number;
    avgXp: number;
    avgLevel: number;
    avgCompletionRate: number;
    quizPassRate: number;
  };
  subjectPerformance?: { subjectId: number; subjectName: string; completionRate: number }[];
  performanceTrend?: { date: string; completions: number; quizPasses: number }[];
  topStudents?: { studentId: number; name: string; rank: number; level: number; completedLessons: number; streak: number; xp: number }[];
  atRiskStudents?: { studentId: number; name: string; lastActivityAt?: string; completionRate: number; daysInactive: number }[];
  activityFeed?: { eventType: string; studentName: string; occurredAt: string }[];
  aiCoaching?: { summary?: string; keyInsights?: string[]; actionItems?: string[]; fallback?: boolean };
}

// ── Chat ───────────────────────────────────────────────────────────────────────
export interface InstructorChat {
  id: number;
  title?: string;
  name?: string;
  lastMessage?: string;
  unreadCount?: number;
  updatedAt?: string;
  type?: string;
  participants?: { userId: number; name?: string }[];
}

export interface ChatMessage {
  id: number;
  content: string;
  senderId: number;
  senderName?: string;
  isOwn?: boolean;
  createdAt: string;
  type?: string;
}

// ── Timetable ─────────────────────────────────────────────────────────────────
export interface InstructorTimetableSlot {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectName?: string;
  courseName?: string;
  roomNumber?: string | null;
}

// ── Attendance (instructor side) ───────────────────────────────────────────────
export interface AttendanceStudent {
  id: number;
  firstName: string;
  lastName: string;
}

export interface SubjectAttendanceRecord {
  studentId: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  note?: string;
}
