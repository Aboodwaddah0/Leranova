// ── Organization profile ───────────────────────────────────────────────────────
export interface OrgProfile {
  id: number;
  Name: string;
  Email: string;
  Phone?: string | null;
  Address?: string | null;
  Description?: string | null;
  Founded?: string | null;
  logoUrl?: string | null;
  type: 'SCHOOL' | 'ACADEMY';
  Role?: string;
}

// ── Teacher ────────────────────────────────────────────────────────────────────
export interface OrgTeacher {
  id: number;
  userId?: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  specialization?: string | null;
  gender?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  user?: { email?: string; role?: string };
}

// ── Course / Grade Level / Specialization ─────────────────────────────────────
export interface OrgCourse {
  id: number;
  Name: string;
  Description?: string | null;
  Thumbnail?: string | null;
  Teacher_id?: number | null;
  Start?: string | null;
  End?: string | null;
  price?: number | null;
  isPaid?: boolean;
  GradeLevel?: number | null;
  level?: string | null;
  kind?: string | null;   // "CLASS" for school grade courses
  Kind?: string | null;
  enrolledCount?: number;
  teacher?: { firstName?: string; lastName?: string };
}

// ── Subject ────────────────────────────────────────────────────────────────────
export interface OrgSubject {
  id: number;
  name: string;
  Description?: string | null;
  Teacher_id?: number | null;
  isPaid?: boolean;
  price?: number | null;
  level?: string | null;
  imageUrl?: string | null;
  teacher?: { firstName?: string; lastName?: string };
  lessonsCount?: number;
}

// ── User (Student / Parent) ────────────────────────────────────────────────────
export interface OrgUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone?: string | null;
  gender?: string | null;
  address?: string | null;
  dob?: string | null;
  avatarUrl?: string | null;
  parentNationalId?: string | null;
  fatherName?: string | null;
  registrationNumber?: string | null;
  enrollments?: Array<{ courseId: number; courseName?: string }>;
  linkedStudents?: OrgUser[];
}

// ── Mark / Assessment ──────────────────────────────────────────────────────────
export interface OrgMark {
  id: number;
  studentId: number;
  studentName?: string;
  subjectId?: number;
  subjectName?: string;
  courseId?: number;
  courseName?: string;
  score: number;
  outOf: number;
  type: string;
  termId?: number | null;
  academicYearId?: number | null;
  gradeLevel?: number | null;
  createdAt?: string;
}

export interface AssessmentComponent {
  id: number;
  name: string;
  weight: number;
  outOf: number;
  courseId?: number | null;
  subjectId?: number | null;
}

// ── Academic Year / Term ───────────────────────────────────────────────────────
export interface AcademicYear {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  numberOfTerms?: number;
}

export type TermStatus = 'UPCOMING' | 'ACTIVE' | 'CLOSED' | 'LOCKED';

export interface Term {
  id: number;
  academicYearId: number;
  termNumber: number;
  name: string;
  startDate: string;
  endDate: string;
  status: TermStatus;
}

// ── Computed Grade ─────────────────────────────────────────────────────────────
export interface ComputedGrade {
  id: number;
  studentId: number;
  studentName?: string;
  subjectId?: number;
  subjectName?: string;
  courseId?: number;
  courseName?: string;
  gradeLevel?: number | null;
  termId?: number;
  totalScore: number;
  totalOutOf: number;
  percentage: number;
  letterGrade?: string | null;
  isPassed?: boolean;
}

export interface GradeRanking {
  rank: number;
  studentId: number;
  studentName?: string;
  gradeLevel?: number | null;
  termId?: number;
  average: number;
}

// ── Calendar Event ─────────────────────────────────────────────────────────────
export type EventType = 'HOLIDAY' | 'EXAM' | 'PTA_MEETING' | 'ACTIVITY' | 'ANNOUNCEMENT' | 'OTHER';

export interface CalendarEvent {
  id: number;
  title: string;
  description?: string | null;
  type: EventType;
  startDate: string;
  endDate?: string | null;
  isPublished?: boolean;
}

// ── Attendance ─────────────────────────────────────────────────────────────────
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface AttendanceRecord {
  id?: number;
  studentId: number;
  studentName?: string;
  date: string;
  status: AttendanceStatus;
  note?: string | null;
}

export interface AttendanceSummaryItem {
  studentId: number;
  studentName: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  percentage: number;
}

// ── Timetable ──────────────────────────────────────────────────────────────────
export interface TimetableSlot {
  id: number;
  courseId: number;
  courseName?: string;
  subjectId?: number | null;
  subjectName?: string | null;
  teacherId?: number | null;
  teacherName?: string | null;
  dayOfWeek: number; // 0=Mon … 6=Sun
  startTime: string; // "HH:MM"
  endTime: string;
  roomNumber?: string | null;
}

// ── Finance ────────────────────────────────────────────────────────────────────
export interface OrgRevenue {
  totalRevenue: number;
  totalEnrollments: number;
  paidEnrollments?: number;
  recentTransactions?: RevenueTransaction[];
  monthly?: { month: string; revenue: number }[];
}

export interface RevenueTransaction {
  id: number;
  studentName?: string;
  courseName?: string;
  amount: number;
  date: string;
  status?: string;
}

// ── School Settings ────────────────────────────────────────────────────────────
export interface SchoolSettings {
  schoolYearStartMonth?: number;
  schoolYearStartDay?: number;
  promotionMonth?: number;
  promotionDay?: number;
  entryGradeMinAge?: number;
  passThresholdPercentage?: number;
  minSubjectPassPercentage?: number;
  requireAllSubjectsPass?: boolean;
}

// ── Certificate ────────────────────────────────────────────────────────────────
export interface CertificateStatus {
  totalStudents: number;
  issued: number;
  published: number;
  pending: number;
}
