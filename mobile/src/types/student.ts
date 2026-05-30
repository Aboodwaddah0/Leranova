import type { StudentMode } from './auth';

// ── Context ──────────────────────────────────────────────────────────────────
export interface StudentContext {
  mode: StudentMode;
  organization?: { id: number; name: string } | null;
  class?: { id: number; name: string; gradeLevel?: string } | null;
  student?: { id: number; name: string } | null;
}

// ── Course / Subject / Lesson ─────────────────────────────────────────────────
export interface Course {
  id: number;
  name: string;
  description: string;
  category: string;
  progress: number;
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE';
  priceStatus: 'PAID' | 'PENDING' | 'FREE';
  cover: string;
  teacher?: { name: string; title?: string } | null;
}

export interface Subject {
  id: number;
  courseId?: number;
  name: string;
  description?: string;
  teacher?: { name: string; title?: string } | null;
}

export interface LessonAttachment {
  id: string | number;
  name: string | null;
  url: string;
  fileType: string;
  mimeType?: string | null;
  createdAt?: string | null;
  originalName?: string | null;
}

export interface Lesson {
  id: number;
  subjectId: number | null;
  title: string;
  name: string;
  description: string;
  content?: string;
  videoUrl: string;
  duration?: string | null;
  isCompleted?: boolean;
  attachments: LessonAttachment[];
  subject?: Subject | null;
  course?: Course | null;
}

// ── Comments ─────────────────────────────────────────────────────────────────
export interface Comment {
  id: number;
  content: string;
  createdAt: string;
  user: { id: number; name: string; avatarUrl?: string | null };
}

// ── Flashcards ────────────────────────────────────────────────────────────────
export interface Flashcard {
  question: string;
  answer: string;
}

// ── Quiz ─────────────────────────────────────────────────────────────────────
export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';

export interface QuizQuestion {
  id: string;
  question: string;
  type: QuestionType;
  options?: string[];
  correctAnswer?: string;
}

export interface QuizAttemptAnswer {
  questionId: string;
  answer: string;
}

export interface QuizResult {
  score: number;
  total: number;
  passed: boolean;
  answers: Array<{
    questionId: string;
    correct: boolean;
    feedback?: string;
  }>;
}

// ── Mind Map ─────────────────────────────────────────────────────────────────
export interface MindMapBranch {
  label: string;
  children: string[];
}

export interface MindMap {
  title: string;
  branches: MindMapBranch[];
}

// ── AI Content ───────────────────────────────────────────────────────────────
export interface LessonAiContent {
  flashcards?: Flashcard[];
  mindmap?: MindMap;
  published?: boolean;
  flashcardsPublished?: boolean;
  mindmapPublished?: boolean;
}

// ── Teachers ─────────────────────────────────────────────────────────────────
export interface Teacher {
  id: number;
  userId: number;
  name: string;
  email: string;
  work?: string;
  specialization?: string;
  bio?: string;
  age?: number | null;
  gender?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
  subjectCount: number;
  subjects: string[];
}

// ── Profile ───────────────────────────────────────────────────────────────────
export interface StudentProfile {
  id: number;
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

// ── Gamification ─────────────────────────────────────────────────────────────
export interface GamificationStats {
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
}

export interface LeaderboardEntry {
  rank: number;
  studentId: number;
  name: string;
  avatarUrl?: string | null;
  totalXp: number;
  level?: number;
  currentStreak?: number;
}

export interface Mission {
  key: string;
  label: string;
  progress: number;
  goal: number;
  xp: number;
  completed: boolean;
  recommended?: boolean;
  difficulty?: string;
}

export interface MissionsData {
  daily: Mission[];
  weekly: Mission[];
}

export interface Achievement {
  key: string;
  label: string;
  xp?: number;
  unlockedAt?: string;
}

export interface AchievementsData {
  unlocked: Achievement[];
  locked: Achievement[];
  latestUnlocked: Achievement | null;
}

export interface AIMentor {
  narrative?: string;
  aiPowered?: boolean;
  urgentWarning?: { type: string; message: string } | null;
  successHighlight?: { message: string } | null;
  nextBestAction?: { action: string; reason?: string; urgency: string; icon?: string } | null;
  coachingPoints?: Array<{ icon: string; type: string; message: string }>;
}

export type ActivityType =
  | 'LESSON_COMPLETE'
  | 'QUIZ_PASS'
  | 'QUIZ_PERFECT'
  | 'DAILY_LOGIN'
  | 'FLASHCARD_SESSION'
  | 'MINDMAP_SESSION'
  | 'CHATBOT_SESSION';

export interface ActivityFeedItem {
  type: ActivityType;
  label: string;
  xp: number;
  createdAt: string;
}

export interface ActivityFeedData {
  feed: ActivityFeedItem[];
  engagedToday: boolean;
  totalXp?: number;
  level?: number;
  currentStreak?: number;
}

// ── Social / Competition ──────────────────────────────────────────────────────
export interface SocialEntry {
  studentId: number;
  name: string;
  avatarUrl?: string | null;
  rank: number;
  totalXp: number;
  weeklyXp?: number;
  currentStreak?: number;
  longestStreak?: number;
  level?: number;
}

export interface XpRaceMe {
  studentId: number;
  name: string;
  rank?: number;
  totalXp: number;
  level?: number;
  currentStreak?: number;
}

export interface XpRace {
  me: XpRaceMe | null;
  above: { name: string; totalXp: number } | null;
  xpToOvertake: number | null;
}

export interface WeeklyChallengeLeader {
  studentId: number;
  name: string;
  weeklyXp: number;
  rank?: number;
}

export interface WeeklyChallenge {
  title: string;
  description: string;
  endsAt: string;
  myRank?: number | null;
  myWeeklyXp: number;
  leader?: WeeklyChallengeLeader | null;
  leaderboard?: WeeklyChallengeLeader[];
}

export interface SocialFeedItem {
  studentId: number;
  studentName: string;
  eventType: string;
  label: string;
  xpAwarded: number;
  occurredAt: string;
}

export interface AchieveShowcaseEntry {
  studentId: number;
  name: string;
  count: number;
  rank: number;
  isMe?: boolean;
}

export interface AchievementShowcase {
  myCount: number;
  topAchievers: AchieveShowcaseEntry[];
}

export interface MyRankInfo {
  rank?: number;
  totalXp?: number;
  weeklyXp?: number;
  weeklyRank?: number;
}

export interface SocialData {
  myRank?: MyRankInfo | null;
  xpRace?: XpRace | null;
  streakCompetition?: SocialEntry[];
  weeklyChallenge?: WeeklyChallenge | null;
  socialFeed?: SocialFeedItem[];
  achievementShowcase?: AchievementShowcase | null;
}

// ── Marks ─────────────────────────────────────────────────────────────────────
export interface StudentMark {
  id: number;
  Numbers: number;
  OutOf: number;
  MarkType: string;
  time: string;
  subject: {
    id: number;
    name: string;
    course: { id: number; name: string };
  };
}

// ── Chat ─────────────────────────────────────────────────────────────────────
export interface Chat {
  id: number;
  type: 'GROUP' | 'PRIVATE';
  name?: string | null;
  lastMessage?: { content: string; createdAt: string } | null;
  unreadCount?: number;
}

export interface ChatMessageReaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface ChatMessage {
  id: number;
  content: string;
  createdAt: string;
  senderId: number;
  senderName: string;
  senderAvatar?: string | null;
  replyTo?: { id: number; content: string; senderName?: string; senderId?: number } | null;
  reaction?: string | null;
  isDeleted?: boolean;
  isSeen?: boolean;
  seenAt?: string | null;
  isEdited?: boolean;
  reactions?: ChatMessageReaction[] | null;
}
