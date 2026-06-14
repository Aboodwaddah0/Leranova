import apiClient from '../../../shared/services/apiClient';
import type {
  InstructorProfile, InstructorCourse, InstructorSubject, InstructorLesson,
  LessonAttachment, AiContent, Flashcard, Mindmap, PowerSlides,
  Quiz, QuizQuestion, InstructorStudent, StudentNote, InstructorMark,
  InstructorAnalytics, InstructorChat, ChatMessage, InstructorTimetableSlot,
  AttendanceStudent, SubjectAttendanceRecord, RagStatus,
} from '../../../types/instructor';
import type { AcademicYear, Term, CalendarEvent } from '../../../types/organization';

function splitName<T extends Record<string, unknown>>(item: T): T {
  if (item.firstName || item.lastName) return item;
  const full = String(item.name ?? '').trim();
  const idx  = full.indexOf(' ');
  return {
    ...item,
    firstName: idx >= 0 ? full.slice(0, idx)  : full,
    lastName:  idx >= 0 ? full.slice(idx + 1) : '',
  };
}

const qs = (params: Record<string, unknown>) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

// Unwrap the standard { success, data, ... } envelope — `data` can legitimately
// be `null` (e.g. "no quiz yet"), so check for the key rather than using `??`.
const unwrap = <T>(body: unknown): T =>
  (body && typeof body === 'object' && 'data' in (body as object) ? (body as { data: unknown }).data : body) as T;

const get  = async <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
  const fullUrl = params && Object.keys(params).length ? `${url}?${qs(params)}` : url;
  const { data } = await apiClient.get(fullUrl);
  return unwrap<T>(data);
};
const post  = async <T>(url: string, body?: unknown): Promise<T> => {
  const { data } = await apiClient.post(url, body);
  return unwrap<T>(data);
};
const patch = async <T>(url: string, body?: unknown): Promise<T> => {
  const { data } = await apiClient.patch(url, body);
  return unwrap<T>(data);
};
const put   = async <T>(url: string, body?: unknown): Promise<T> => {
  const { data } = await apiClient.put(url, body);
  return unwrap<T>(data);
};
const del   = async (url: string): Promise<void> => { await apiClient.delete(url); };

// ── Profile ───────────────────────────────────────────────────────────────────
// Backend returns { name, organization: { name, role } } — not firstName/lastName/type
export const fetchInstructorProfile = async (): Promise<InstructorProfile> => {
  const raw = await get<Record<string, unknown>>('/teachers/me');
  const org = raw.organization as { id?: number; name?: string; role?: string } | null | undefined;
  const nameStr = String(raw.name ?? '').trim();
  const idx = nameStr.indexOf(' ');
  return {
    id:             raw.id as number,
    userId:         raw.userId as number | undefined,
    firstName:      idx >= 0 ? nameStr.slice(0, idx)  : nameStr,
    lastName:       idx >= 0 ? nameStr.slice(idx + 1) : '',
    email:          raw.email as string | undefined,
    phone:          raw.phone as string | null | undefined,
    gender:         raw.gender as string | null | undefined,
    age:            raw.age as number | null | undefined,
    address:        raw.address as string | null | undefined,
    work:           raw.work as string | null | undefined,
    specialization: raw.specialization as string | null | undefined,
    bio:            raw.bio as string | null | undefined,
    avatarUrl:      raw.avatarUrl as string | null | undefined,
    organization: org ? {
      id:   org.id as number,
      Name: org.name,
      type: org.role,   // 'SCHOOL' | 'ACADEMY'
    } : undefined,
  };
};
export const updateInstructorProfile = (p: Partial<InstructorProfile & { password?: string }>) => patch<InstructorProfile>('/teachers/me', p);

// ── Subject normalizer — backend returns Course_id (Prisma) not courseId ─────
function normalizeSubject(raw: Record<string, unknown>): InstructorSubject {
  const track = raw.track as { id?: number; Name?: string; GradeLevel?: number } | null | undefined;
  return {
    id:           raw.id as number,
    name:         (raw.name ?? '') as string,
    Description:  raw.Description as string | null | undefined,
    courseId:     (raw.Course_id ?? raw.courseId) as number | undefined,
    courseName:   (track?.Name ?? raw.courseName) as string | undefined,
    courseGradeLevel: track?.GradeLevel ?? null,
    level:        raw.level as string | null | undefined,
    imageUrl:     (raw.imageUrl ?? raw.imageURL) as string | null | undefined,
    lessonsCount: raw.lessonsCount as number | undefined,
  };
}

// ── Lesson normalizer — Prisma lesson has `name`, `Description`, `Subject_id` ─
function normalizeLesson(raw: Record<string, unknown>): InstructorLesson {
  const course = raw.course as { id?: number; name?: string; Course_id?: number } | null | undefined;
  return {
    id:                 raw.id as number,
    title:              (raw.name ?? raw.title ?? '') as string,
    description:        (raw.Description ?? raw.description) as string | null | undefined,
    subjectId:          (raw.Subject_id ?? raw.subjectId) as number,
    videoUrl:           raw.videoUrl as string | null | undefined,
    subjectName:        (course?.name ?? raw.subjectName) as string | undefined,
    courseId:           (course?.Course_id ?? raw.courseId) as number | undefined,
    createdAt:          raw.createdAt as string | undefined,
    updatedAt:          raw.updatedAt as string | undefined,
    aiContentPublished: raw.aiContentPublished as boolean | undefined,
    aiContentStatus:    raw.aiContentStatus as string | undefined,
  };
}

// ── Courses / Subjects / Lessons ──────────────────────────────────────────────
export const fetchMyCourses  = () => get<InstructorCourse[]>('/teachers/me/courses');
export const fetchMySubjects = async (): Promise<InstructorSubject[]> => {
  const data = await get<Record<string, unknown>[]>('/teachers/me/subjects');
  return data.map(normalizeSubject);
};
export const fetchMyLessons = async (params: Record<string, unknown> = {}): Promise<InstructorLesson[]> => {
  const data = await get<Record<string, unknown>[]>('/teachers/me/lessons', params);
  return data.map(normalizeLesson);
};

export const createLesson = async (subjectId: number, formData: FormData, onProgress?: (p: number) => void) => {
  const { data } = await apiClient.post(`/subjects/${subjectId}/lessons`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
      ? (e) => onProgress(Math.round(((e.loaded ?? 0) * 100) / (e.total ?? 1)))
      : undefined,
  });
  return unwrap<InstructorLesson>(data);
};

export const updateLessonMeta = (subjectId: number, lessonId: number, p: { title: string; description?: string }) =>
  patch<InstructorLesson>(`/subjects/${subjectId}/lessons/${lessonId}`, p);

export const deleteLesson = (subjectId: number, lessonId: number) =>
  del(`/subjects/${subjectId}/lessons/${lessonId}`);

export const suggestLessonMetadata = (subjectId: number, filename: string, lang = 'en') =>
  post<{ title?: string; description?: string }>(`/subjects/${subjectId}/lessons/suggest`, { filename, lang });

export const suggestLessonMetadataFromContent = (subjectId: number, lessonId: number, lang = 'en') =>
  post<{ title?: string; description?: string }>(`/subjects/${subjectId}/lessons/${lessonId}/suggest-from-content`, { lang });

// ── Attachments ───────────────────────────────────────────────────────────────
export const fetchAttachments = (lessonId: number) =>
  get<LessonAttachment[]>(`/lessons/${lessonId}/attachments`);

export const uploadAttachments = async (lessonId: number, formData: FormData, onProgress?: (p: number) => void) => {
  const { data } = await apiClient.post(`/lessons/${lessonId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
      ? (e) => onProgress(Math.round(((e.loaded ?? 0) * 100) / (e.total ?? 1)))
      : undefined,
  });
  return (Array.isArray(data?.data) ? data.data : []) as LessonAttachment[];
};

export const deleteAttachment = (lessonId: number, attachmentId: number) =>
  del(`/lessons/${lessonId}/attachments/${attachmentId}`);

export const fetchRagStatus = (lessonId: number, baseline = 0) =>
  get<RagStatus>(`/lessons/${lessonId}/attachments/rag-status`, { baseline });

export const reprocessRag = (lessonId: number) =>
  post<void>(`/lessons/${lessonId}/attachments/reprocess`);

// ── AI Content ────────────────────────────────────────────────────────────────
export const fetchAiContent = (lessonId: number, lang = 'en') =>
  get<AiContent>(`/lessons/${lessonId}/ai-content`, { lang });

export const regenerateAiContent = (lessonId: number, lang = 'en') =>
  post<AiContent>(`/lessons/${lessonId}/ai-content/regenerate`, { lang });

export const regenerateFlashcards = (lessonId: number, lang = 'en', topic = '') =>
  post<AiContent>(`/lessons/${lessonId}/ai-content/flashcards/regenerate`, { lang, topic });

export const regenerateMindmap = (lessonId: number, lang = 'en', topic = '') =>
  post<AiContent>(`/lessons/${lessonId}/ai-content/mindmap/regenerate`, { lang, topic });

export const updateFlashcards = (lessonId: number, flashcards: Flashcard[], lang = 'en') =>
  put<AiContent>(`/lessons/${lessonId}/ai-content/flashcards`, { flashcards, lang });

export const updateMindmap = (lessonId: number, mindmap: Mindmap, lang = 'en') =>
  put<AiContent>(`/lessons/${lessonId}/ai-content/mindmap`, { mindmap, lang });

export const deleteFlashcards = (lessonId: number) =>
  del(`/lessons/${lessonId}/ai-content/flashcards`);

export const deleteMindmap = (lessonId: number) =>
  del(`/lessons/${lessonId}/ai-content/mindmap`);

export const publishAiContent = (lessonId: number) =>
  patch<void>(`/lessons/${lessonId}/ai-content/publish`);

export const unpublishAiContent = (lessonId: number) =>
  patch<void>(`/lessons/${lessonId}/ai-content/unpublish`);

// ── Slides ────────────────────────────────────────────────────────────────────
export const generateSlides = (lessonId: number, p: { lang?: string; numSlides?: number; theme?: string; topic?: string }) =>
  post<PowerSlides>(`/lessons/${lessonId}/ai-content/slides/generate`, p);

export const deleteSlides = (lessonId: number) =>
  del(`/lessons/${lessonId}/ai-content/slides`);

// ── Quiz ──────────────────────────────────────────────────────────────────────
export const fetchQuiz = (subjectId: number, lessonId: number, lang = 'en') =>
  get<Quiz | null>(`/subjects/${subjectId}/lessons/${lessonId}/quiz`, { lang });

export const createQuiz = (subjectId: number, lessonId: number, p: { title: string; difficulty?: string; passingScore?: number }) =>
  post<Quiz>(`/subjects/${subjectId}/lessons/${lessonId}/quiz`, p);

export const updateQuiz = (subjectId: number, lessonId: number, quizId: number, p: Partial<Quiz>) =>
  patch<Quiz>(`/subjects/${subjectId}/lessons/${lessonId}/quiz/${quizId}`, p);

export const deleteQuiz = (subjectId: number, lessonId: number, quizId: number) =>
  del(`/subjects/${subjectId}/lessons/${lessonId}/quiz/${quizId}`);

export const generateQuizQuestions = (subjectId: number, lessonId: number, quizId: number, p: {
  numMCQ?: number; numTrueFalse?: number; numShortAnswer?: number; difficulty?: string; notes?: string; lang?: string;
}) => post<Quiz>(`/subjects/${subjectId}/lessons/${lessonId}/quiz/${quizId}/generate`, p);

export const addQuizQuestion = (subjectId: number, lessonId: number, quizId: number, p: Partial<QuizQuestion>, lang = 'en') =>
  post<QuizQuestion>(`/subjects/${subjectId}/lessons/${lessonId}/quiz/${quizId}/questions`, { ...p, lang });

export const deleteQuizQuestion = (subjectId: number, lessonId: number, quizId: number, questionId: number) =>
  del(`/subjects/${subjectId}/lessons/${lessonId}/quiz/${quizId}/questions/${questionId}`);

// ── Student normalizer — backend wraps data under {user:{name,email,...}, student:{dob,...}} ──
function normalizeInstructorStudent(raw: Record<string, unknown>): InstructorStudent {
  const u = raw.user as Record<string, unknown> | null | undefined;
  const sp = raw.student as Record<string, unknown> | null | undefined;
  const nameStr = String(u?.name ?? raw.name ?? '').trim();
  const idx = nameStr.indexOf(' ');
  return {
    id:                 raw.id as number,
    firstName:          idx >= 0 ? nameStr.slice(0, idx)  : nameStr,
    lastName:           idx >= 0 ? nameStr.slice(idx + 1) : '',
    email:              (u?.email ?? raw.email) as string | undefined,
    gender:             (u?.gender ?? raw.gender) as string | undefined,
    address:            (u?.address ?? raw.address) as string | undefined,
    phone:              (u?.phone ?? raw.phone) as string | undefined,
    dob:                (sp?.dob ?? raw.dob) as string | null | undefined,
    avatarUrl:          (u?.avatarUrl ?? raw.avatarUrl) as string | null | undefined,
    registrationNumber: (u?.registrationNumber ?? raw.registrationNumber) as string | undefined,
  };
}

// ── Students ──────────────────────────────────────────────────────────────────
export const fetchStudents = async (params: Record<string, unknown> = {}): Promise<InstructorStudent[]> => {
  const data = await get<Record<string, unknown>[]>('/teachers/me/students', params);
  return data.map(normalizeInstructorStudent);
};

// ── Notes ─────────────────────────────────────────────────────────────────────
export const fetchStudentNotes  = (studentId: number) => get<StudentNote[]>('/notes', { studentId });
export const createStudentNote  = (p: { studentId: number; title?: string; content: string }) => post<StudentNote>('/notes', p);
export const deleteStudentNote  = (noteId: number) => del(`/notes/${noteId}`);

// ── Marks ─────────────────────────────────────────────────────────────────────
export const fetchMarks        = (params: Record<string, unknown> = {}) => get<InstructorMark[]>('/marks', params);
export const createMark        = (p: Partial<InstructorMark>) => post<InstructorMark>('/marks', p);
export const updateMark        = (id: number, p: Partial<InstructorMark>) => patch<InstructorMark>(`/marks/${id}`, p);
export const deleteMark        = (id: number) => del(`/marks/${id}`);

// ── Analytics ─────────────────────────────────────────────────────────────────
export const fetchAnalytics = (subjectId?: number) =>
  get<InstructorAnalytics>('/teachers/me/analytics', subjectId ? { Subject_id: subjectId } : undefined);

// ── Comments ──────────────────────────────────────────────────────────────────
export const fetchLessonComments = (lessonId: number) =>
  get<{ id: number; content: string; authorName?: string; createdAt: string }[]>(`/lessons/${lessonId}/comments`);

// ── Chat ──────────────────────────────────────────────────────────────────────
function normalizeInstructorChat(raw: Record<string, unknown>): InstructorChat {
  const lastMsg = raw.lastMessage as { content?: string; createdAt?: string } | string | null | undefined;
  return {
    id:          raw.id as number,
    title:       (raw.title ?? raw.name) as string | undefined,
    name:        (raw.title ?? raw.className ?? raw.name) as string | undefined,
    lastMessage: typeof lastMsg === 'object' && lastMsg !== null
      ? (lastMsg.content as string | undefined)
      : (lastMsg as string | undefined),
    unreadCount: (raw.unreadCount as number | undefined) ?? 0,
    updatedAt:   (raw.lastMessageAt ?? raw.updatedAt) as string | undefined,
    type:        raw.type as string | undefined,
  };
}

function normalizeInstructorMessage(raw: Record<string, unknown>): ChatMessage {
  const sender = raw.sender as { id?: number; name?: string } | null | undefined;
  return {
    id:         raw.id as number,
    content:    (raw.content ?? raw.text ?? '') as string,
    senderId:   (raw.senderId ?? sender?.id ?? 0) as number,
    senderName: (raw.senderName ?? sender?.name) as string | undefined,
    createdAt:  (raw.createdAt ?? raw.sent_at ?? '') as string,
    type:       raw.type as string | undefined,
  };
}

export const fetchChats = async (): Promise<InstructorChat[]> => {
  const data = await get<Record<string, unknown>[]>('/chats');
  return data.map(normalizeInstructorChat);
};

export const fetchChatMessages = async (chatId: number): Promise<ChatMessage[]> => {
  const data = await get<Record<string, unknown>[]>(`/chats/${chatId}/messages`);
  return data.map(normalizeInstructorMessage);
};

export const sendChatMessage = (chatId: number, content: string) =>
  post<ChatMessage>(`/chats/${chatId}/messages`, { content, type: 'text' });

// ── Timetable ─────────────────────────────────────────────────────────────────
export const fetchMyTimetable = () => get<InstructorTimetableSlot[]>('/timetable/me');

// ── Calendar ──────────────────────────────────────────────────────────────────
export const fetchCalendar = (params: Record<string, unknown> = {}) =>
  get<CalendarEvent[]>('/school-calendar/public', params);

// ── Academic years & terms (shared) ──────────────────────────────────────────
export const fetchAcademicYears = () =>
  get<AcademicYear[]>('/academic-years');

export const fetchTerms = (yearId: number) =>
  get<Term[]>(`/academic-years/${yearId}/terms`);

// ── Attendance (subject level) ─────────────────────────────────────────────────
export const fetchSubjectStudents = (subjectId: number) =>
  get<AttendanceStudent[]>(`/attendance/subject/${subjectId}/students`);

export const fetchSubjectAttendance = (subjectId: number, params: Record<string, unknown> = {}) =>
  get<SubjectAttendanceRecord[]>(`/attendance/subject/${subjectId}`, params);

export const saveSubjectAttendance = (subjectId: number, payload: { date: string; records: SubjectAttendanceRecord[] }) =>
  post<void>(`/attendance/subject/${subjectId}`, payload);
