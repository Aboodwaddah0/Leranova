import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

// ── Root ──────────────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Auth: undefined;
  StudentApp: undefined;
  ParentApp: undefined;
};

// ── Auth Stack ────────────────────────────────────────────────────────────────
export type AuthStackParamList = {
  Login: undefined;
};

// ── Student Tabs ──────────────────────────────────────────────────────────────
export type StudentTabParamList = {
  Dashboard: undefined;
  Courses:   undefined;
  Chat:      undefined;
  Social:    undefined;
  Teachers:  undefined;
  Profile:   undefined;
};

// ── Student Stack (nested inside tabs or separate) ────────────────────────────
export type StudentStackParamList = {
  StudentTabs:    undefined;
  CourseDetails:  { courseId: number; courseName: string };
  SubjectLessons: { subjectId: number; subjectName: string; courseId: number };
  Lesson:         { lessonId: number; lessonTitle: string; subjectId: number; courseId: number; autoPlay?: boolean };
  TeacherProfile: { teacherId: number };
  ChatRoom:       { chatId: number; chatName?: string };
};

// ── Parent Tabs ───────────────────────────────────────────────────────────────
export type ParentTabParamList = {
  ParentDashboard: undefined;
  ParentMarks: undefined;
  ParentSettings: undefined;
};

// ── Screen prop helpers ───────────────────────────────────────────────────────
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type StudentStackScreenProps<T extends keyof StudentStackParamList> =
  NativeStackScreenProps<StudentStackParamList, T>;

export type StudentTabScreenProps<T extends keyof StudentTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<StudentTabParamList, T>,
  NativeStackScreenProps<StudentStackParamList>
>;

export type ParentTabScreenProps<T extends keyof ParentTabParamList> =
  BottomTabScreenProps<ParentTabParamList, T>;
