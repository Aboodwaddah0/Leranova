export interface ParentProfile {
  id: number;
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface Child {
  id: number;
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

export interface ChildMark {
  id: number;
  childName: string;
  childId: number;
  Numbers: number;
  OutOf: number;
  MarkType: string;
  time: string;
  subject: {
    id: number;
    name: string;
    course?: { id: number; name: string };
  };
}
