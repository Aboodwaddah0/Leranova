import api, { buildQueryString } from "../utils/api";

export const fetchInstructorProfile = async () => {
  const { data } = await api.get("/teachers/me");
  return data?.data || null;
};

export const updateMyInstructorProfile = async (payload) => {
  const { data } = await api.patch("/teachers/me", payload);
  return data?.data || null;
};

export const fetchInstructorCourses = async () => {
  const { data } = await api.get("/teachers/me/courses");
  return data?.data || [];
};

export const fetchInstructorSubjects = async () => {
  const { data } = await api.get("/teachers/me/subjects");
  return data?.data || [];
};

export const fetchInstructorLessons = async (params = {}) => {
  const query = buildQueryString(params);
  const { data } = await api.get(`/teachers/me/lessons${query}`);
  return data?.data || [];
};

export const fetchInstructorStudents = async (params = {}) => {
  const query = buildQueryString(params);
  const { data } = await api.get(`/teachers/me/students${query}`);
  return data?.data || [];
};

export const fetchInstructorMarks = async (params = {}) => {
  const query = buildQueryString(params);
  const { data } = await api.get(`/marks${query}`);
  return data?.data || [];
};

export const createInstructorMark = async (payload) => {
  const { data } = await api.post("/marks", payload);
  return data?.data || null;
};

export const updateInstructorMark = async (markId, payload) => {
  const { data } = await api.patch(`/marks/${markId}`, payload);
  return data?.data || null;
};

export const deleteInstructorMark = async (markId) => {
  const { data } = await api.delete(`/marks/${markId}`);
  return data?.data || null;
};

export const createInstructorSubject = async (courseId, payload) => {
  const { data } = await api.post(`/courses/${courseId}/subjects`, payload);
  return data?.data || null;
};

export const deleteInstructorSubject = async (courseId, subjectId) => {
  const { data } = await api.delete(`/courses/${courseId}/subjects/${subjectId}`);
  return data?.data || null;
};

export const createInstructorLesson = async ({ subjectId, title, description, videoFile, onProgress }) => {
  const formData = new FormData();
  formData.append("title", title);
  if (description) formData.append("description", description);
  if (videoFile) formData.append("video", videoFile);

  const { data } = await api.post(`/subjects/${subjectId}/lessons`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress
      ? (e) => onProgress(Math.round((e.loaded * 100) / (e.total || 1)))
      : undefined,
  });

  return data?.data || null;
};

export const updateInstructorLessonMeta = async (subjectId, lessonId, { title, description }) => {
  const { data } = await api.patch(`/subjects/${subjectId}/lessons/${lessonId}`, { title, description });
  return data?.data || null;
};

export const suggestLessonMetadata = async (subjectId, filename, lang = 'ar') => {
  const { data } = await api.post(`/subjects/${subjectId}/lessons/suggest`, { filename, lang });
  return data?.data || null;
};

export const deleteInstructorLesson = async (subjectId, lessonId) => {
  const { data } = await api.delete(`/subjects/${subjectId}/lessons/${lessonId}`);
  return data?.data || null;
};

export const uploadInstructorLessonAttachments = async ({ lessonId, files, onProgress }) => {
  const formData = new FormData();
  const fileArray = Array.isArray(files) ? files : [files];
  fileArray.forEach((file) => formData.append("files", file));

  const { data } = await api.post(`/lessons/${lessonId}/attachments`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress
      ? (e) => onProgress(Math.round((e.loaded * 100) / (e.total || 1)))
      : undefined,
  });

  return Array.isArray(data?.data) ? data.data : [];
};

export const deleteInstructorLessonAttachment = async ({ lessonId, attachmentId }) => {
  const { data } = await api.delete(`/lessons/${lessonId}/attachments/${attachmentId}`);
  return data;
};

export const fetchInstructorLessonAttachments = async (lessonId) => {
  const { data } = await api.get(`/lessons/${lessonId}/attachments`);
  return data?.data || [];
};

export const reprocessLessonRag = async (lessonId) => {
  const { data } = await api.post(`/lessons/${lessonId}/attachments/reprocess`);
  return data;
};

export const fetchLessonRagStatus = async (lessonId, baseline = 0) => {
  const { data } = await api.get(`/lessons/${lessonId}/attachments/rag-status?baseline=${baseline}`);
  return data;
};

// ── AI Content (flashcards & mindmap) ────────────────────────────────────────
export const fetchLessonAiContentInstructor = async (lessonId, lang = 'ar') => {
  const { data } = await api.get(`/lessons/${lessonId}/ai-content`, { params: { lang } });
  return data?.data ?? null;
};

export const generateLessonAiContentInstructor = async (lessonId, lang = 'ar') => {
  const { data } = await api.post(`/lessons/${lessonId}/ai-content/regenerate`, { lang });
  return data?.data ?? null;
};

export const updateLessonFlashcards = async (lessonId, flashcards, lang = 'ar') => {
  const { data } = await api.put(`/lessons/${lessonId}/ai-content/flashcards`, { flashcards, lang });
  return data?.data ?? null;
};

export const updateLessonMindmap = async (lessonId, mindmap, lang = 'ar') => {
  const { data } = await api.put(`/lessons/${lessonId}/ai-content/mindmap`, { mindmap, lang });
  return data?.data ?? null;
};

export const publishLessonAiContent = async (lessonId) => {
  const { data } = await api.patch(`/lessons/${lessonId}/ai-content/publish`);
  return data?.data ?? null;
};

export const unpublishLessonAiContent = async (lessonId) => {
  const { data } = await api.patch(`/lessons/${lessonId}/ai-content/unpublish`);
  return data?.data ?? null;
};

export const fetchInstructorLessonComments = async (lessonId) => {
  const { data } = await api.get(`/lessons/${lessonId}/comments`);
  return data?.data || [];
};

// ── Quiz management ─────────────────────────────────────────────────────────
export const fetchLessonQuiz = async (subjectId, lessonId, lang = 'ar') => {
  const { data } = await api.get(`/subjects/${subjectId}/lessons/${lessonId}/quiz`, { params: { lang } });
  return data?.data ?? null;
};

export const createLessonQuiz = async (subjectId, lessonId, payload) => {
  const { data } = await api.post(`/subjects/${subjectId}/lessons/${lessonId}/quiz`, payload);
  return data?.data ?? null;
};

export const updateLessonQuiz = async (subjectId, lessonId, quizId, payload) => {
  const { data } = await api.patch(`/subjects/${subjectId}/lessons/${lessonId}/quiz/${quizId}`, payload);
  return data?.data ?? null;
};

export const deleteLessonQuiz = async (subjectId, lessonId, quizId) => {
  await api.delete(`/subjects/${subjectId}/lessons/${lessonId}/quiz/${quizId}`);
};

export const generateLessonQuizQuestions = async (subjectId, lessonId, quizId, payload) => {
  const { data } = await api.post(`/subjects/${subjectId}/lessons/${lessonId}/quiz/${quizId}/generate`, payload);
  return data?.data ?? null;
};

export const addLessonQuizQuestion = async (subjectId, lessonId, quizId, payload, lang = 'ar') => {
  const { data } = await api.post(`/subjects/${subjectId}/lessons/${lessonId}/quiz/${quizId}/questions`, { ...payload, lang });
  return data?.data ?? null;
};

export const deleteLessonQuizQuestion = async (subjectId, lessonId, quizId, questionId) => {
  await api.delete(`/subjects/${subjectId}/lessons/${lessonId}/quiz/${quizId}/questions/${questionId}`);
};

export const fetchStudentNotes = async (studentId) => {
  const { data } = await api.get('/notes', { params: { studentId } });
  return data?.data || [];
};

export const createStudentNote = async ({ studentId, title, content }) => {
  const { data } = await api.post('/notes', { studentId, title, content });
  return data?.data || null;
};

export const deleteStudentNote = async (noteId) => {
  await api.delete(`/notes/${noteId}`);
};
