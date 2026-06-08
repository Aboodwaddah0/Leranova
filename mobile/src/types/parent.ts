export interface ParentProfile {
  id: number;
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface Child {
  studentId: number;
  name: string;
  email?: string;
  avatarUrl?: string | null;
  className?: string | null;
  gradeLevel?: string | null;
}

export interface TeacherNote {
  id: number;
  content: string;
  isRead: boolean;
  createdAt: string;
  teacher?: { name: string; avatarUrl?: string | null };
  child?: { name: string } | null;
}

export interface Mark {
  id: number;
  Numbers: number;
  OutOf: number;
  MarkType: string;
  time: string;
  subject?: {
    id: number;
    name: string;
    course?: { id: number; name: string };
  } | null;
}

export interface ChildMark {
  id: number;
  childName: string;
  childId: number;
  Numbers: number;
  OutOf: number;
  MarkType: string;
  time: string;
  subject?: {
    id: number;
    name: string;
    course?: { id: number; name: string };
  } | null;
}

export interface ChildMarksGroup {
  studentId: number;
  studentName: string;
  marks: Mark[];
}

export interface GroupNote {
  id: number;
  title: string | null;
  content: string;
  isRead: boolean;
  teacherName: string;
  createdAt: string;
}

export interface NoteGroup {
  studentId: number;
  studentName: string;
  unreadCount: number;
  notes: GroupNote[];
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface AttendanceRecord {
  id: number;
  date: string;
  status: AttendanceStatus;
  subjectName?: string | null;
}

export interface ChildAttendanceGroup {
  studentId: number;
  studentName: string;
  records: AttendanceRecord[];
}

export type CalendarEventType = 'HOLIDAY' | 'EXAM' | 'PTA_MEETING' | 'ACTIVITY' | 'ANNOUNCEMENT' | 'OTHER';

export interface CalendarEvent {
  id: number;
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  type: CalendarEventType;
  isPublished: boolean;
}
