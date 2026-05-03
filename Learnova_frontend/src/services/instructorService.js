import api, { buildQueryString } from "../utils/api";

export const fetchInstructorProfile = async () => {
  const { data } = await api.get("/teachers/me");
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

export const createInstructorLesson = async ({ subjectId, title, description, videoFile }) => {
  const formData = new FormData();
  formData.append("title", title);
  if (description) {
    formData.append("description", description);
  }
  if (videoFile) {
    formData.append("video", videoFile);
  }

  const { data } = await api.post(`/subjects/${subjectId}/lessons`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

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

export const fetchLessonRagStatus = async (lessonId, baseline = 0) => {
  const { data } = await api.get(`/lessons/${lessonId}/attachments/rag-status?baseline=${baseline}`);
  return data;
};

export const fetchInstructorLessonComments = async (lessonId) => {
  const { data } = await api.get(`/lessons/${lessonId}/comments`);
  return data?.data || [];
};
