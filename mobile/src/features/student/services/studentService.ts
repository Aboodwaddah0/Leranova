/**
 * Student service — mirrors src/services/studentService.js from the web app.
 * All API endpoints remain identical; only the http client and storage differ.
 */
import apiClient, { unwrap, ensureArray } from '../../../shared/services/apiClient';
import type {
  StudentContext, Course, Subject, AcademyTrackData, Lesson, Comment,
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

      // Build the base track list first
      const baseTracks = tracks.map((t) => ({
        id:          Number(t.id),
        name:        String(t.name ?? ''),
        description: String(t.description ?? ''),
        category:    'Track' as const,
        progress:    0,
        status:      'ACTIVE' as const,
        priceStatus: 'PAID'   as const,
        cover:       String(t.thumbnail ?? ''),
        teacher:     null as null,
      }));

      // ── Enrich with real lesson-level completion data ──────────────────────
      // Mirrors web exactly (StudentDashboardPage.jsx lines 144-160):
      //   fetchCourseSubjects(trackId) → fetchSubjectLessons(subjectId)
      //   → count lesson.isCompleted from backend → compute real %
      const enriched = await Promise.all(
        baseTracks.map(async (track) => {
          try {
            const subjects = await fetchCourseSubjects(track.id);

            // Fetch lessons per subject, keeping subject ID alongside each lesson
            const lessonsBySubject = await Promise.all(
              subjects.map(async (s) => {
                const lessons = await fetchSubjectLessons(s.id);
                // Guarantee subjectId is set (backend sets it, but guard in case)
                return lessons.map((l) => ({ ...l, subjectId: l.subjectId ?? s.id }));
              }),
            );

            const allLessons = lessonsBySubject.flat();
            const total      = allLessons.length;
            const completed  = allLessons.filter((l) => Boolean(l?.isCompleted)).length;
            const progress   = total > 0 ? Math.round((completed / total) * 100) : 0;

            // Smart-resume lesson:
            //   - 0% → first lesson
            //   - in-progress → first lesson where isCompleted = false
            //   - 100% → last lesson (for review)
            const rawResume = total > 0
              ? (allLessons.find((l) => !l.isCompleted) ?? allLessons[total - 1])
              : null;

            const resumeLesson = rawResume
              ? {
                  id:        rawResume.id,
                  title:     rawResume.title || rawResume.name || '',
                  subjectId: (rawResume.subjectId as number),
                }
              : undefined;

            return {
              ...track,
              progress,
              subjectCount:     subjects.length,
              lessonCount:      total > 0 ? total     : undefined,
              completedLessons: total > 0 ? completed : undefined,
              // resumeLesson only used when there is exactly 1 subject
              resumeLesson:     subjects.length === 1 ? resumeLesson : undefined,
            };
          } catch {
            return track;  // on error, keep base track with progress = 0
          }
        }),
      );

      return enriched;
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

/** Academy-specific: returns ALL subjects for a track including unsubscribed paid ones */
export async function fetchAcademyTrackSubjects(trackId: number): Promise<AcademyTrackData> {
  const res = await apiClient.get(`/student/academy/tracks/${trackId}/subjects`);
  const data = unwrap<AcademyTrackData>(res);
  return data ?? { track: { id: trackId, name: '' }, subjects: [] };
}

/** Subscribe to an academy subject (free or redirect to Stripe) */
export async function subscribeAcademyMaterial(subjectId: number): Promise<{
  requiresPayment: boolean;
  checkoutUrl?: string;
  checkoutSessionId?: string;
  status?: string;
} | null> {
  const res = await apiClient.post(`/student/academy/subjects/${subjectId}/subscribe`, {
    paymentMethod: 'STRIPE',
  });
  return unwrap(res);
}

/** Verify a completed Stripe checkout session for a subject subscription */
export async function verifyAcademyCheckoutSession(sessionId: string): Promise<{
  verified: boolean;
  subjectId?: number;
  subjectName?: string;
  status?: string;
} | null> {
  const res = await apiClient.get('/student/academy/checkout/verify', {
    params: { session_id: sessionId },
  });
  return unwrap(res);
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
/** Backend returns flat { userId, userName } — reshape to nested { user: { id, name } } */
function normalizeComment(raw: unknown): Comment {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    id:        Number(r.id        ?? 0),
    content:   String(r.content   ?? ''),
    createdAt: String(r.createdAt ?? r.time ?? ''),
    user: {
      id:        Number(r.userId   ?? 0),
      name:      String(r.userName ?? 'Member'),
      avatarUrl: (r.userAvatar     ?? null) as string | null,
    },
  };
}

export async function fetchLessonComments(lessonId: number): Promise<Comment[]> {
  const res = await apiClient.get(`/lessons/${lessonId}/comments`);
  return ensureArray<Record<string, unknown>>(unwrap(res)).map(normalizeComment);
}

export async function createLessonComment(lessonId: number, content: string): Promise<Comment> {
  const res = await apiClient.post(`/lessons/${lessonId}/comments`, { content: content.trim() });
  return normalizeComment(unwrap<Record<string, unknown>>(res));
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
  try {
    const res = await apiClient.get(`/lessons/${lessonId}/quiz`, { params: { lang } });
    const raw = unwrap<Record<string, unknown>>(res);
    if (!raw) return null;
    // Normalize: backend returns "isPublished", QuizTab checks "published"
    // Also stringify question IDs to match QuizQuestion { id: string }
    return {
      ...raw,
      published: raw.published ?? raw.isPublished,
      questions: ensureArray<Record<string, unknown>>(raw.questions as unknown[])
        .map((q) => ({ ...q, id: String(q.id) })),
    };
  } catch {
    return null;
  }
}

/**
 * Submit quiz — answers is a plain indexed array (same format the web sends):
 *   MCQ / TRUE_FALSE → option index (number)
 *   SHORT_ANSWER     → text string
 * Returns the raw backend payload { attempt, questions (with correctAnswer), reward }.
 */
export async function submitStudentQuizAttempt(
  lessonId: number,
  answers:  unknown[],
  lang = 'ar',
): Promise<Record<string, unknown> | null> {
  try {
    const res = await apiClient.post(`/lessons/${lessonId}/quiz/attempt`, { answers, lang });
    return unwrap<Record<string, unknown>>(res);
  } catch {
    return null;
  }
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

// ── School: Attendance & Calendar ────────────────────────────────────────────
export async function fetchMyAttendance(): Promise<import('../../../types/student').StudentAttendanceRecord[]> {
  try {
    const res = await apiClient.get('/attendance/me');
    return ensureArray(unwrap(res));
  } catch {
    return [];
  }
}

export async function fetchMyCalendar(params?: { from?: string; to?: string }): Promise<import('../../../types/student').StudentCalendarEvent[]> {
  try {
    const res = await apiClient.get('/school-calendar/public', { params });
    return ensureArray(unwrap(res));
  } catch {
    return [];
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

/**
 * Normalises a raw API message payload into a flat `ChatMessage`.
 *
 * The backend serializer (`serializeStudentChatMessage`) returns the sender as a
 * nested object `sender: { id, name, email }` but the `ChatMessage` TypeScript
 * interface (and every piece of UI code) expects a flat `senderName` string.
 * This function bridges that gap and must be applied to every message that
 * comes in from the REST API **or** via Socket.io events.
 */
export function normalizeMessage(raw: Record<string, unknown>): ChatMessage {
  const sender = raw.sender as { id?: number; name?: string; email?: string } | null | undefined;
  return {
    ...(raw as ChatMessage),
    senderName:   String(raw.senderName   ?? sender?.name   ?? ''),
    senderAvatar: (raw.senderAvatar       ?? null)           as string | null,
  };
}

export async function fetchStudentChats(): Promise<Chat[]> {
  const res = await apiClient.get('/chats');
  return ensureArray<Chat>(unwrap(res));
}

export async function fetchStudentChatMessages(chatId: number, limit = 100): Promise<ChatMessage[]> {
  const res = await apiClient.get(`/chats/${chatId}/messages`, { params: { limit } });
  const arr = ensureArray<Record<string, unknown>>(unwrap(res));
  return arr.map(normalizeMessage);
}

export async function sendStudentChatMessage(chatId: number, content: string, replyToMessageId?: number): Promise<ChatMessage> {
  const payload: Record<string, unknown> = { content };
  if (replyToMessageId) payload.replyToMessageId = replyToMessageId;
  const res = await apiClient.post(`/chats/${chatId}/messages`, payload);
  return normalizeMessage(unwrap<Record<string, unknown>>(res));
}

export async function deleteStudentChatMessage(messageId: number): Promise<void> {
  await apiClient.delete(`/chats/messages/${messageId}`);
}

export async function editStudentChatMessage(messageId: number, content: string): Promise<ChatMessage> {
  const res = await apiClient.patch(`/chats/messages/${messageId}`, { content });
  return normalizeMessage(unwrap<Record<string, unknown>>(res));
}

export async function reactStudentChatMessage(
  messageId: number,
  emoji: string,
): Promise<ChatMessage> {
  // Backend: PATCH /chats/messages/:id/reaction  body: { reaction: string }
  // Response: { data: { action, message: <serialized ChatMessage> } }
  const res  = await apiClient.patch(`/chats/messages/${messageId}/reaction`, { reaction: emoji });
  const data = unwrap<Record<string, unknown>>(res);
  // unwrap gives us { action, message: {...} } — extract the nested message object
  const raw  = (data?.message ?? data) as Record<string, unknown>;
  return normalizeMessage(raw);
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
