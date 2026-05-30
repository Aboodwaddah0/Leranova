/**
 * Student service — mirrors src/services/studentService.js from the web app.
 * All API endpoints remain identical; only the http client and storage differ.
 */
import apiClient, { unwrap, ensureArray } from '../../../shared/services/apiClient';
import type {
  StudentContext, Course, Subject, Lesson, Comment,
  LessonAiContent, Teacher, StudentProfile, GamificationStats,
  StudentMark, Chat, ChatMessage, QuizAttemptAnswer, QuizResult,
  MissionsData, AchievementsData, AIMentor, ActivityFeedData, SocialData,
} from '../../../types/student';

// ── Context ───────────────────────────────────────────────────────────────────
export async function fetchStudentContext(): Promise<StudentContext | null> {
  try {
    const res = await apiClient.get('/student/me/context');
    return unwrap<StudentContext>(res);
  } catch {
    return null;
  }
}

// ── Courses ───────────────────────────────────────────────────────────────────
export async function fetchStudentCourseCatalog(): Promise<Course[]> {
  try {
    const context = await fetchStudentContext();

    if (context?.mode === 'ACADEMY') {
      const res = await apiClient.get('/student/academy/tracks');
      const tracks = ensureArray<Record<string, unknown>>(unwrap(res));
      return tracks.map((t) => ({
        id:          Number(t.id),
        name:        String(t.name ?? ''),
        description: String(t.description ?? ''),
        category:    'Track',
        progress:    t.subjectCount
          ? Math.round((Number(t.subscribedSubjectCount ?? 0) / Number(t.subjectCount ?? 1)) * 100)
          : 0,
        status:      'ACTIVE',
        priceStatus: 'PAID',
        cover:       String(t.thumbnail ?? ''),
        teacher:     null,
      }));
    }

    if (context?.mode === 'SCHOOL') {
      const data = await fetchSchoolMySubjects();
      const subjects = ensureArray<Record<string, unknown>>(data?.subjects ?? []);
      return subjects.map((s) => ({
        id:          Number(s.id),
        name:        String(s.name ?? ''),
        description: String(s.description ?? ''),
        category:    'Subject',
        progress:    0,
        status:      'ACTIVE',
        priceStatus: 'FREE',
        cover:       String(s.cover ?? ''),
        teacher:     null,
      }));
    }

    return [];
  } catch {
    return [];
  }
}

export async function fetchCourseSubjects(courseId: number): Promise<Subject[]> {
  const res = await apiClient.get(`/courses/${courseId}/subjects`);
  return ensureArray<Subject>(unwrap(res));
}

export async function fetchSubjectLessons(subjectId: number): Promise<Lesson[]> {
  const res = await apiClient.get(`/subjects/${subjectId}/lessons`);
  return ensureArray<Lesson>(unwrap(res));
}

export async function fetchLessonDetails(lessonId: number): Promise<Lesson | null> {
  try {
    const res = await apiClient.get(`/lessons/${lessonId}`);
    return unwrap<Lesson>(res);
  } catch {
    return null;
  }
}

export async function updateStudentLessonProgress(lessonId: number, isCompleted: boolean): Promise<void> {
  await apiClient.put(`/lessons/progress/${lessonId}`, { isCompleted });
}

// ── Comments ─────────────────────────────────────────────────────────────────
export async function fetchLessonComments(lessonId: number): Promise<Comment[]> {
  const res = await apiClient.get(`/lessons/${lessonId}/comments`);
  return ensureArray<Comment>(unwrap(res));
}

export async function createLessonComment(lessonId: number, content: string): Promise<Comment> {
  const res = await apiClient.post(`/lessons/${lessonId}/comments`, { content: content.trim() });
  return unwrap<Comment>(res);
}

// ── AI Content (Flashcards + Mindmap) ────────────────────────────────────────
export async function fetchLessonAiContent(lessonId: number, lang = 'ar'): Promise<LessonAiContent | null> {
  try {
    const res = await apiClient.get(`/lessons/${lessonId}/ai-content`, { params: { lang } });
    return unwrap<LessonAiContent>(res);
  } catch {
    return null;
  }
}

export async function regenerateLessonFlashcards(lessonId: number, lang = 'ar'): Promise<LessonAiContent | null> {
  const res = await apiClient.post(`/lessons/${lessonId}/ai-content/flashcards/regenerate`, { lang });
  return unwrap<LessonAiContent>(res);
}

// ── Quiz ─────────────────────────────────────────────────────────────────────
export async function fetchStudentLessonQuiz(lessonId: number, lang = 'ar') {
  const res = await apiClient.get(`/lessons/${lessonId}/quiz`, { params: { lang } });
  return unwrap(res);
}

export async function submitStudentQuizAttempt(lessonId: number, answers: QuizAttemptAnswer[], lang = 'ar'): Promise<QuizResult | null> {
  const res = await apiClient.post(`/lessons/${lessonId}/quiz/attempt`, { answers, lang });
  return unwrap<QuizResult>(res);
}

// ── AI Chatbot ────────────────────────────────────────────────────────────────
export async function askStudentTutor(payload: {
  question: string;
  courseId?: number;
  subjectId?: number;
  lessonId?: number;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<{ answer: string }> {
  const body: Record<string, unknown> = { question: payload.question };
  if (payload.courseId)  body.course_id  = payload.courseId;
  if (payload.subjectId) body.subject_id = payload.subjectId;
  if (payload.lessonId)  body.lesson_id  = payload.lessonId;
  if (payload.history?.length) {
    body.history = payload.history.slice(-16);
  }
  const res = await apiClient.post('/chatbot/ask', body);
  return unwrap(res);
}

// ── Teachers ─────────────────────────────────────────────────────────────────
export async function fetchStudentTeachers(search = ''): Promise<Teacher[]> {
  try {
    const res = await apiClient.get('/teachers', { params: search ? { search } : undefined });
    return ensureArray<Teacher>(unwrap(res));
  } catch {
    return [];
  }
}

export async function fetchStudentTeacherById(teacherId: number): Promise<Teacher | null> {
  try {
    const res = await apiClient.get(`/teachers/${teacherId}`);
    return unwrap<Teacher>(res);
  } catch {
    return null;
  }
}

// ── Profile ───────────────────────────────────────────────────────────────────
export async function fetchStudentProfile(): Promise<StudentProfile | null> {
  try {
    const res = await apiClient.get('/auth/me');
    return unwrap<StudentProfile>(res);
  } catch {
    return null;
  }
}

export async function updateStudentProfile(data: Partial<StudentProfile>): Promise<StudentProfile | null> {
  try {
    const res = await apiClient.patch('/auth/me', data);
    return unwrap<StudentProfile>(res);
  } catch {
    return null;
  }
}

export async function changeStudentPassword(newPassword: string): Promise<void> {
  await apiClient.patch('/auth/change-password', { newPassword });
}

// ── Gamification ─────────────────────────────────────────────────────────────
export async function fetchGamificationStats(): Promise<GamificationStats> {
  try {
    const res = await apiClient.get('/student/gamification/me');
    return unwrap<GamificationStats>(res) ?? { totalXp: 0, level: 1, currentStreak: 0, longestStreak: 0 };
  } catch {
    return { totalXp: 0, level: 1, currentStreak: 0, longestStreak: 0 };
  }
}

export async function fetchGamificationLeaderboard() {
  try {
    const res = await apiClient.get('/student/gamification/leaderboard');
    return unwrap(res);
  } catch {
    return { leaderboard: [], currentStudentId: null, currentRank: null };
  }
}

export async function fetchAchievements(): Promise<AchievementsData> {
  try {
    const res = await apiClient.get('/student/gamification/achievements');
    return unwrap<AchievementsData>(res) ?? { unlocked: [], locked: [], latestUnlocked: null };
  } catch {
    return { unlocked: [], locked: [], latestUnlocked: null };
  }
}

export async function fetchMissions(): Promise<MissionsData> {
  try {
    const res = await apiClient.get('/student/gamification/missions');
    return unwrap<MissionsData>(res) ?? { daily: [], weekly: [] };
  } catch {
    return { daily: [], weekly: [] };
  }
}

export async function fetchAdaptiveMissions(): Promise<MissionsData | null> {
  try {
    const res = await apiClient.get('/student/gamification/missions/adaptive');
    return unwrap<MissionsData>(res);
  } catch {
    return null;
  }
}

export async function fetchAIMentor(): Promise<AIMentor | null> {
  try {
    const res = await apiClient.get('/student/gamification/mentor');
    return unwrap<AIMentor>(res);
  } catch {
    return null;
  }
}

export async function fetchActivityFeed(): Promise<ActivityFeedData | null> {
  try {
    const res = await apiClient.get('/student/gamification/activity');
    return unwrap<ActivityFeedData>(res);
  } catch {
    return null;
  }
}

// ── Marks ─────────────────────────────────────────────────────────────────────
export async function fetchMyStudentMarks(): Promise<StudentMark[]> {
  try {
    const res = await apiClient.get('/marks/me');
    return ensureArray<StudentMark>(unwrap(res));
  } catch {
    return [];
  }
}

// ── Chat ─────────────────────────────────────────────────────────────────────
export async function fetchStudentChats(): Promise<Chat[]> {
  const res = await apiClient.get('/chats');
  return ensureArray<Chat>(unwrap(res));
}

export async function fetchStudentChatMessages(chatId: number, limit = 100): Promise<ChatMessage[]> {
  const res = await apiClient.get(`/chats/${chatId}/messages`, { params: { limit } });
  return ensureArray<ChatMessage>(unwrap(res));
}

export async function sendStudentChatMessage(chatId: number, content: string, replyToMessageId?: number): Promise<ChatMessage> {
  const payload: Record<string, unknown> = { content };
  if (replyToMessageId) payload.replyToMessageId = replyToMessageId;
  const res = await apiClient.post(`/chats/${chatId}/messages`, payload);
  return unwrap<ChatMessage>(res);
}

export async function deleteStudentChatMessage(messageId: number): Promise<void> {
  await apiClient.delete(`/chats/messages/${messageId}`);
}

export async function editStudentChatMessage(messageId: number, content: string): Promise<ChatMessage> {
  const res = await apiClient.patch(`/chats/messages/${messageId}`, { content });
  return unwrap<ChatMessage>(res);
}

export async function reactStudentChatMessage(
  messageId: number,
  emoji: string,
): Promise<ChatMessage> {
  const res = await apiClient.post(`/chats/messages/${messageId}/react`, { emoji });
  // API may return { message: {...} } or the ChatMessage object directly
  const data = unwrap<Record<string, unknown>>(res);
  return ((data?.message ?? data) as ChatMessage);
}

// ── Social / Competition ──────────────────────────────────────────────────────
export async function fetchStudentSocial(): Promise<SocialData | null> {
  try {
    const res = await apiClient.get('/student/gamification/social');
    return unwrap<SocialData>(res);
  } catch {
    return null;
  }
}

// ── School mode ───────────────────────────────────────────────────────────────
export async function fetchSchoolMySubjects() {
  try {
    const res = await apiClient.get('/student/school/subjects');
    return unwrap(res);
  } catch {
    return { class: null, subjects: [] };
  }
}
