import api from "../utils/api";

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
  const { data } = await api.post("/courses", payload);
  return data?.data || null;
};

export const updateOrganizationCourse = async (courseId, payload) => {
  const { data } = await api.patch(`/courses/${courseId}`, payload);
  return data?.data || null;
};

export const deleteOrganizationCourse = async (courseId) => {
  const { data } = await api.delete(`/courses/${courseId}`);
  return data?.data || null;
};

export const fetchCourseSubjects = async (courseId) => {
  const { data } = await api.get(`/courses/${courseId}/subjects`);
  return data?.data || [];
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

export const fetchOrganizationUsers = async () => {
  const { data } = await api.get("/users");
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
