import api, { buildQueryString } from "../utils/api";

const isFormData = (payload) => typeof FormData !== "undefined" && payload instanceof FormData;

export const fetchMyOrganizationProfile = async () => {
  try {
    const { data } = await api.get("/organizations/me");
    return data?.data || null;
  } catch (error) {
    if (error?.message?.toLowerCase().includes("access denied")) {
      throw new Error("Organization access denied. Please log in with an organization account (ACADEMY or SCHOOL).");
    }

    throw error;
  }
};

export const updateMyOrganizationProfile = async (payload) => {
  try {
    const { data } = await api.patch("/organizations/me", payload);
    return data?.data || null;
  } catch (error) {
    if (error?.message?.toLowerCase().includes("access denied")) {
      throw new Error("Organization access denied. Please log in with an organization account (ACADEMY or SCHOOL).");
    }

    throw error;
  }
};

export const fetchOrganizationTeachers = async () => {
  const { data } = await api.get("/teachers");
  return data?.data || [];
};

export const createOrganizationTeacher = async (payload) => {
  const { data } = await api.post("/teachers", payload);
  return data?.data || null;
};

export const updateOrganizationTeacher = async (teacherId, payload) => {
  const { data } = await api.put(`/teachers/${teacherId}`, payload);
  return data?.data || null;
};

export const deleteOrganizationTeacher = async (teacherId) => {
  const { data } = await api.delete(`/teachers/${teacherId}`);
  return data?.data || null;
};

export const fetchOrganizationCourses = async () => {
  const { data } = await api.get("/courses");
  return data?.data || [];
};

export const createOrganizationCourse = async (payload) => {
  try {
    const { data } = await api.post("/courses", payload);
    return data?.data || null;
  } catch (error) {
    const message = String(error?.response?.data?.message || error?.message || "").toLowerCase();

    if (!isFormData(payload) && (message.includes('"ispaid" is not allowed') || message.includes('"price" is not allowed'))) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.isPaid;
      delete fallbackPayload.price;

      const { data } = await api.post("/courses", fallbackPayload);
      return data?.data || null;
    }

    throw error;
  }
};

export const updateOrganizationCourse = async (courseId, payload) => {
  try {
    const { data } = await api.patch(`/courses/${courseId}`, payload);
    return data?.data || null;
  } catch (error) {
    const message = String(error?.response?.data?.message || error?.message || "").toLowerCase();

    if (!isFormData(payload) && (message.includes('"ispaid" is not allowed') || message.includes('"price" is not allowed'))) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.isPaid;
      delete fallbackPayload.price;

      const { data } = await api.patch(`/courses/${courseId}`, fallbackPayload);
      return data?.data || null;
    }

    throw error;
  }
};

export const deleteOrganizationCourse = async (courseId) => {
  const { data } = await api.delete(`/courses/${courseId}`);
  return data?.data || null;
};

export const fetchCourseSubjects = async (courseId) => {
  const { data } = await api.get(`/courses/${courseId}/subjects`);
  return data?.data || [];
};

export const fetchOrganizationRevenue = async () => {
  const { data } = await api.get("/organization-profile/revenue");
  return data?.data || null;
};

export const createCourseSubject = async (courseId, payload) => {
  const { data } = await api.post(`/courses/${courseId}/subjects`, payload);
  return data?.data || null;
};

export const updateCourseSubject = async (courseId, subjectId, payload) => {
  const { data } = await api.patch(`/courses/${courseId}/subjects/${subjectId}`, payload);
  return data?.data || null;
};

export const deleteCourseSubject = async (courseId, subjectId) => {
  const { data } = await api.delete(`/courses/${courseId}/subjects/${subjectId}`);
  return data?.data || null;
};

export const fetchSubjectLessonsForOrg = async (subjectId) => {
  const { data } = await api.get(`/subjects/${subjectId}/lessons`);
  return data?.data || [];
};

export const fetchOrganizationUsers = async (params = {}) => {
  const query = buildQueryString(params);
  const { data } = await api.get(`/users${query}`);
  return data?.data || [];
};

export const createOrganizationUser = async (payload) => {
  const { data } = await api.post("/users", payload);
  return data?.data || null;
};

export const createOrganizationUserWithGeneratedCredentials = async (payload) => {
  const { data } = await api.post("/users/generate-user", payload);
  return data || null;
};

export const updateOrganizationUser = async (userId, payload) => {
  const { data } = await api.put(`/users/${userId}`, payload);
  return data?.data || null;
};

export const deleteOrganizationUser = async (userId) => {
  const { data } = await api.delete(`/users/${userId}`);
  return data?.data || null;
};

export const linkParentToStudents = async (parentId, payload) => {
  const { data } = await api.patch(`/users/parents/${parentId}/link-students`, payload);
  return data?.data || null;
};

export const importUsersFromExcel = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post("/users/generate-users", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data || null;
};

export const downloadOrganizationCredentialsCsv = async () => {
  const response = await api.get('/users/export-credentials', {
    responseType: 'blob',
  });

  return response?.data || null;
};

export const fetchSchoolSettings = async () => {
  const { data } = await api.get("/school-settings");
  return data?.data || null;
};

export const updateSchoolSettings = async (payload) => {
  const { data } = await api.patch("/school-settings", payload);
  return data?.data || null;
};

export const runAnnualPromotion = async (payload = {}) => {
  const { data } = await api.post("/school-settings/promotions/run", payload);
  return data?.data || null;
};

export const addStudentToCourse = async (studentUserId, courseId, isSchool = false) => {
  const payload = isSchool
    ? { studentUserId, Course_id: courseId }
    : { user_Academy_id: studentUserId, Course_id: courseId };
  const { data } = await api.post("/enrollments", payload);
  return data?.data || null;
};

export const removeStudentFromCourse = async (studentUserId, courseId) => {
  const { data } = await api.delete(`/enrollments/user/${studentUserId}/course/${courseId}`);
  return data?.data || null;
};

export const fetchStudentCourses = async (studentUserId) => {
  const { data } = await api.get(`/enrollments/user/${studentUserId}`);
  return data?.data || [];
};

// ── Academic Years ──────────────────────────────────────────────────────────
export const fetchAcademicYears = async () => {
  const { data } = await api.get("/academic-years");
  return data?.data || [];
};

export const createAcademicYear = async (payload) => {
  const { data } = await api.post("/academic-years", payload);
  return data?.data || null;
};

export const updateAcademicYear = async (yearId, payload) => {
  const { data } = await api.patch(`/academic-years/${yearId}`, payload);
  return data?.data || null;
};

// ── Terms ───────────────────────────────────────────────────────────────────
export const fetchTerms = async (yearId) => {
  const { data } = await api.get(`/academic-years/${yearId}/terms`);
  return data?.data || [];
};

export const createTerm = async (yearId, payload) => {
  const { data } = await api.post(`/academic-years/${yearId}/terms`, payload);
  return data?.data || null;
};

export const updateTerm = async (yearId, termId, payload) => {
  const { data } = await api.patch(`/academic-years/${yearId}/terms/${termId}`, payload);
  return data?.data || null;
};

export const reopenTerm = async (yearId, termId, changeReason) => {
  const { data } = await api.post(`/academic-years/${yearId}/terms/${termId}/reopen`, { changeReason });
  return data?.data || null;
};
