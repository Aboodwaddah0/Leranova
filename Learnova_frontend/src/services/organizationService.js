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

export const fetchOrganizationMarks = async (params = {}) => {
  const query = buildQueryString(params);
  const { data } = await api.get(`/marks/org${query}`);
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

export const downloadSampleExcel = async (role) => {
  const response = await api.get(`/users/sample-excel?role=${role}`, {
    responseType: "blob",
  });
  return response?.data || null;
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

export const promoteStudentById = async (payload) => {
  const { data } = await api.post("/school-settings/promotions/student", payload);
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

export const activateSession = async (yearId) => {
  const { data } = await api.post(`/academic-years/${yearId}/activate`);
  return data?.data || null;
};

export const deleteAcademicYear = async (yearId) => {
  await api.delete(`/academic-years/${yearId}`);
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

export const activateTermManually = async (yearId, termId) => {
  const { data } = await api.post(`/academic-years/${yearId}/terms/${termId}/activate`);
  return data?.data || null;
};

// ── Term Certificates ────────────────────────────────────────────────────────
export const generateTermCertificates = async (yearId, termId, gradeLevel) => {
  const params = gradeLevel !== undefined ? `?gradeLevel=${gradeLevel}` : '';
  const { data } = await api.post(`/academic-years/${yearId}/terms/${termId}/certificates/generate${params}`);
  return data?.data || null;
};

export const fetchTermCertificates = async (yearId, termId, gradeLevel) => {
  const params = gradeLevel !== undefined ? `?gradeLevel=${gradeLevel}` : '';
  const { data } = await api.get(`/academic-years/${yearId}/terms/${termId}/certificates${params}`);
  return data?.data || null;
};

export const issueCertificates = async (yearId, termId, gradeLevel) => {
  const params = gradeLevel !== undefined ? `?gradeLevel=${gradeLevel}` : '';
  const { data } = await api.post(`/academic-years/${yearId}/terms/${termId}/certificates/issue${params}`);
  return data?.data || null;
};

export const publishCertificates = async (yearId, termId) => {
  const { data } = await api.post(`/academic-years/${yearId}/terms/${termId}/certificates/publish`);
  return data?.data || null;
};

export const fetchCertificateStatus = async (yearId, termId) => {
  const { data } = await api.get(`/academic-years/${yearId}/terms/${termId}/certificates/status`);
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

// ── Assessment Components ────────────────────────────────────────────────────
export const fetchAssessmentComponents = async (params = {}) => {
  const query = buildQueryString(params);
  const { data } = await api.get(`/assessment-components${query}`);
  return data?.data || [];
};

export const createAssessmentComponent = async (payload) => {
  const { data } = await api.post('/assessment-components', payload);
  return data?.data || null;
};

export const updateAssessmentComponent = async (id, payload) => {
  const { data } = await api.patch(`/assessment-components/${id}`, payload);
  return data?.data || null;
};

export const deleteAssessmentComponent = async (id) => {
  await api.delete(`/assessment-components/${id}`);
};

// ── Grade Scale ──────────────────────────────────────────────────────────────
export const fetchGradeScale = async () => {
  const { data } = await api.get('/grade-scale');
  return data?.data || null;
};

export const upsertGradeScale = async (payload) => {
  const { data } = await api.put('/grade-scale', payload);
  return data?.data || null;
};

export const deleteGradeScale = async () => {
  await api.delete('/grade-scale');
};

// ── Computed Grades ──────────────────────────────────────────────────────────
export const computeGrades = async (termId) => {
  const { data } = await api.post('/computed-grades/compute', { termId });
  return data?.data || null;
};

export const fetchComputedGrades = async (params = {}) => {
  const query = buildQueryString(params);
  const { data } = await api.get(`/computed-grades${query}`);
  return data?.data || [];
};

export const fetchGradeRankings = async (params = {}) => {
  const query = buildQueryString(params);
  const { data } = await api.get(`/computed-grades/rankings${query}`);
  return data?.data || [];
};

// ── Timetable ────────────────────────────────────────────────────────────────

export const fetchTimetable = async (params = {}) => {
  const query = buildQueryString(params);
  const { data } = await api.get(`/timetable${query}`);
  return data?.data || [];
};

export const createTimetableSlot = async (payload) => {
  const { data } = await api.post('/timetable', payload);
  return data?.data || null;
};

export const updateTimetableSlot = async (id, payload) => {
  const { data } = await api.put(`/timetable/${id}`, payload);
  return data?.data || null;
};

export const unpublishCertificates = async (yearId, termId) => {
  const { data } = await api.post(`/academic-years/${yearId}/terms/${termId}/certificates/unpublish`);
  return data?.data || null;
};

export const deleteTimetableSlot = async (id) => {
  await api.delete(`/timetable/${id}`);
};

// ── Reports ──────────────────────────────────────────────────────────────────
const buildReportQuery = (params = {}) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

export const fetchReport = async (reportPath, params = {}) => {
  const qs = buildReportQuery(params);
  const { data } = await api.get(`/reports/${reportPath}${qs ? `?${qs}` : ""}`);
  return data?.data || null;
};

// ── Billing ──────────────────────────────────────────────────────────────────
export const fetchOrganizationSubscription = async (orgId) => {
  const { data } = await api.get(`/subscriptions/organizations/${orgId}`);
  return data?.data || null;
};

export const initiateBillingCheckout = async (orgId, planId) => {
  const { data } = await api.post(`/subscriptions/organizations/${orgId}/checkout`, { planId });
  return data?.data || null;
};
