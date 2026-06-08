import apiClient from '../../../shared/services/apiClient';
import type {
  InstructorProfile, InstructorCourse, InstructorSubject, InstructorLesson,
  LessonAttachment, AiContent, Flashcard, Mindmap, PowerSlides,
  Quiz, QuizQuestion, InstructorStudent, StudentNote, InstructorMark,
  InstructorAnalytics, InstructorChat, ChatMessage, InstructorTimetableSlot,
  AttendanceStudent, SubjectAttendanceRecord, RagStatus,
} from '../../../types/instructor';
import type { AcademicYear, Term, CalendarEvent } from '../../../types/organization';

const qs = (params: Record<string, unknown>) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

const get  = async <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
  const fullUrl = params && Object.keys(params).length ? `${url}?${qs(params)}` : url;
  const { data } = await apiClient.get(fullUrl);
  return (data?.data ?? data) as T;
};
const post  = async <T>(url: string, body?: unknown): Promise<T> => {
  const { data } = await apiClient.post(url, body);
  return (data?.data ?? data) as T;
};
const patch = async <T>(url: string, body?: unknown): Promise<T> => {
  const { data } = await apiClient.patch(url, body);
  return (data?.data ?? data) as T;
};
const put   = async <T>(url: string, body?: unknown): Promise<T> => {
  const { data } = await apiClient.put(url, body);
  return (data?.data ?? data) as T;
};
const del   = async (url: string): Promise<void> => { await apiClient.delete(url); };

// ── Profile ───────────────────────────────────────────────────────────────────
export const fetchInstructorProfile  = () => get<InstructorProfile>('/teachers/me');
export const updateInstructorProfile = (p: Partial<InstructorProfile & { password?: string }>) => patch<InstructorProfile>('/teachers/me', p);

// ── Courses / Subjects / Lessons ──────────────────────────────────────────────
export const fetchMyCourses   = () => get<InstructorCourse[]>('/teachers/me/courses');
export const fetchMySubjects  = () => get<InstructorSubject[]>('/teachers/me/subjects');
export const fetchMyLessons   = (params: Record<string, unknown> = {}) =>
  get<InstructorLesson[]>('/teachers/me/lessons', params);

export const createLesson = async (subjectId: number, formData: FormData, onProgress?: (p: number) => void) => {
  const { data } = await apiClient.post(`/subjects/${subjectId}/lessons`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
      ? (e) => onProgress(Math.round(((e.loaded ?? 0) * 100) / (e.total ?? 1)))
      : undefined,
  });
  return (data?.data ?? data) as InstructorLesson;
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

// ── Students ──────────────────────────────────────────────────────────────────
export const fetchStudents = (params: Record<string, unknown> = {}) =>
  get<InstructorStudent[]>('/teachers/me/students', params);

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
export const fetchAnalytics = () => get<InstructorAnalytics>('/teachers/me/analytics');

// ── Comments ──────────────────────────────────────────────────────────────────
export const fetchLessonComments = (lessonId: number) =>
  get<{ id: number; content: string; authorName?: string; createdAt: string }[]>(`/lessons/${lessonId}/comments`);

// ── Chat ──────────────────────────────────────────────────────────────────────
export const fetchChats        = () => get<InstructorChat[]>('/chats');
export const fetchChatMessages = (chatId: number) => get<ChatMessage[]>(`/chats/${chatId}/messages`);
export const sendChatMessage   = (chatId: number, content: string) =>
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
