import apiClient from '../../../shared/services/apiClient';
import type {
  OrgProfile, OrgTeacher, OrgCourse, OrgSubject, OrgUser, OrgMark,
  AssessmentComponent, AcademicYear, Term, ComputedGrade, GradeRanking,
  CalendarEvent, AttendanceRecord, AttendanceSummaryItem, TimetableSlot,
  OrgRevenue, SchoolSettings, CertificateStatus, AttendanceStatus,
} from '../../../types/organization';

const get  = async <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
  const { data } = await apiClient.get(url, { params });
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
const del   = async (url: string): Promise<void> => {
  await apiClient.delete(url);
};

// ── Profile ───────────────────────────────────────────────────────────────────
export const fetchOrgProfile        = () => get<OrgProfile>('/organizations/me');
export const updateOrgProfile       = (p: Partial<OrgProfile>) => patch<OrgProfile>('/organizations/me', p);

// ── Teachers ──────────────────────────────────────────────────────────────────
export const fetchTeachers          = () => get<OrgTeacher[]>('/teachers');
export const createTeacher          = (p: Partial<OrgTeacher & { password?: string; email?: string }>) => post<OrgTeacher>('/teachers', p);
export const updateTeacher          = (id: number, p: Partial<OrgTeacher>) => put<OrgTeacher>(`/teachers/${id}`, p);
export const deleteTeacher          = (id: number) => del(`/teachers/${id}`);

// ── Courses ───────────────────────────────────────────────────────────────────
export const fetchCourses           = () => get<OrgCourse[]>('/courses');
export const createCourse           = (p: Partial<OrgCourse>) => post<OrgCourse>('/courses', p);
export const updateCourse           = (id: number, p: Partial<OrgCourse>) => patch<OrgCourse>(`/courses/${id}`, p);
export const deleteCourse           = (id: number) => del(`/courses/${id}`);

// ── Subjects ──────────────────────────────────────────────────────────────────
export const fetchSubjects          = (courseId: number) => get<OrgSubject[]>(`/courses/${courseId}/subjects`);
export const createSubject          = (courseId: number, p: Partial<OrgSubject>) => post<OrgSubject>(`/courses/${courseId}/subjects`, p);
export const updateSubject          = (courseId: number, subjectId: number, p: Partial<OrgSubject>) => patch<OrgSubject>(`/courses/${courseId}/subjects/${subjectId}`, p);
export const deleteSubject          = (courseId: number, subjectId: number) => del(`/courses/${courseId}/subjects/${subjectId}`);
export const fetchSubjectLessons    = (subjectId: number) => get<unknown[]>(`/subjects/${subjectId}/lessons`);

// ── Users (students & parents) ────────────────────────────────────────────────
export const fetchUsers = (params: Record<string, unknown> = {}) =>
  get<OrgUser[]>('/users', params);
export const createUser = (p: Partial<OrgUser & { password?: string; role?: string }>) =>
  post<{ user?: OrgUser; generatedEmail?: string; generatedPassword?: string } & OrgUser>('/users', p);
export const createUserGenerated = (p: Partial<OrgUser & { role?: string }>) =>
  post<{ user?: OrgUser; generatedEmail?: string; generatedPassword?: string }>('/users/generate-user', p);
export const updateUser  = (id: number, p: Partial<OrgUser>) => put<OrgUser>(`/users/${id}`, p);
export const deleteUser  = (id: number) => del(`/users/${id}`);
export const linkParentToStudents = (parentId: number, studentIds: number[]) =>
  patch<void>(`/users/parents/${parentId}/link-students`, { studentIds });

// ── Enrollments ───────────────────────────────────────────────────────────────
export const enrollStudent = (studentUserId: number, courseId: number, isSchool: boolean) => {
  const payload = isSchool
    ? { studentUserId, Course_id: courseId }
    : { user_Academy_id: studentUserId, Course_id: courseId };
  return post<void>('/enrollments', payload);
};
export const unenrollStudent = (studentUserId: number, courseId: number) =>
  del(`/enrollments/user/${studentUserId}/course/${courseId}`);
export const fetchStudentEnrollments = (studentUserId: number) =>
  get<{ courseId: number; courseName?: string }[]>(`/enrollments/user/${studentUserId}`);

// ── Academic Years ────────────────────────────────────────────────────────────
export const fetchAcademicYears  = () => get<AcademicYear[]>('/academic-years');
export const createAcademicYear  = (p: { name: string; startDate: string; endDate: string; numberOfTerms?: number }) => post<AcademicYear>('/academic-years', p);
export const updateAcademicYear  = (id: number, p: Partial<AcademicYear>) => patch<AcademicYear>(`/academic-years/${id}`, p);
export const deleteAcademicYear  = (id: number) => del(`/academic-years/${id}`);
export const activateYear        = (id: number) => post<AcademicYear>(`/academic-years/${id}/activate`);

// ── Terms ─────────────────────────────────────────────────────────────────────
export const fetchTerms     = (yearId: number) => get<Term[]>(`/academic-years/${yearId}/terms`);
export const createTerm     = (yearId: number, p: Partial<Term>) => post<Term>(`/academic-years/${yearId}/terms`, p);
export const updateTerm     = (yearId: number, termId: number, p: Partial<Term>) => patch<Term>(`/academic-years/${yearId}/terms/${termId}`, p);
export const activateTerm   = (yearId: number, termId: number) => post<Term>(`/academic-years/${yearId}/terms/${termId}/activate`);
export const reopenTerm     = (yearId: number, termId: number, changeReason: string) => post<Term>(`/academic-years/${yearId}/terms/${termId}/reopen`, { changeReason });

// ── Certificates ──────────────────────────────────────────────────────────────
export const fetchCertificateStatus  = (yearId: number, termId: number) => get<CertificateStatus>(`/academic-years/${yearId}/terms/${termId}/certificates/status`);
export const issueCertificates       = (yearId: number, termId: number, gradeLevel?: number) => post<void>(`/academic-years/${yearId}/terms/${termId}/certificates/issue${gradeLevel !== undefined ? `?gradeLevel=${gradeLevel}` : ''}`);
export const publishCertificates     = (yearId: number, termId: number) => post<void>(`/academic-years/${yearId}/terms/${termId}/certificates/publish`);
export const unpublishCertificates   = (yearId: number, termId: number) => post<void>(`/academic-years/${yearId}/terms/${termId}/certificates/unpublish`);

// ── Marks & Assessment Components ────────────────────────────────────────────
export const fetchMarks = (params: Record<string, unknown> = {}) =>
  get<OrgMark[]>('/marks/org', params);
export const fetchAssessmentComponents = (params: Record<string, unknown> = {}) =>
  get<AssessmentComponent[]>('/assessment-components', params);
export const createAssessmentComponent = (p: Partial<AssessmentComponent>) => post<AssessmentComponent>('/assessment-components', p);
export const updateAssessmentComponent = (id: number, p: Partial<AssessmentComponent>) => patch<AssessmentComponent>(`/assessment-components/${id}`, p);
export const deleteAssessmentComponent = (id: number) => del(`/assessment-components/${id}`);

// ── Grade Scale ───────────────────────────────────────────────────────────────
export const fetchGradeScale  = () => get<unknown>('/grade-scale');
export const upsertGradeScale = (p: unknown) => put<unknown>('/grade-scale', p);
export const deleteGradeScale = () => del('/grade-scale');

// ── Computed Grades ───────────────────────────────────────────────────────────
export const computeGrades    = (termId: number) => post<void>('/computed-grades/compute', { termId });
export const fetchComputedGrades = (params: Record<string, unknown> = {}) => get<ComputedGrade[]>('/computed-grades', params);
export const fetchGradeRankings  = (params: Record<string, unknown> = {}) => get<GradeRanking[]>('/computed-grades/rankings', params);

// ── Calendar Events ───────────────────────────────────────────────────────────
export const fetchCalendarEvents  = (params: Record<string, unknown> = {}) => get<CalendarEvent[]>('/calendar', params);
export const createCalendarEvent  = (p: Partial<CalendarEvent>) => post<CalendarEvent>('/calendar', p);
export const updateCalendarEvent  = (id: number, p: Partial<CalendarEvent>) => patch<CalendarEvent>(`/calendar/${id}`, p);
export const deleteCalendarEvent  = (id: number) => del(`/calendar/${id}`);

// ── Attendance ────────────────────────────────────────────────────────────────
export const fetchClassStudents  = (classId: number) => get<OrgUser[]>(`/attendance/class/${classId}/students`);
export const fetchClassAttendance = (classId: number, params: Record<string, unknown>) =>
  get<AttendanceRecord[]>(`/attendance/class/${classId}`, params);
export const saveAttendance = (classId: number, payload: { date: string; attendance: { studentId: number; status: AttendanceStatus; note?: string }[]; termId?: number }) =>
  post<void>(`/attendance/class/${classId}`, payload);
export const fetchAttendanceSummary = (classId: number, params: Record<string, unknown> = {}) =>
  get<AttendanceSummaryItem[]>(`/attendance/class/${classId}/summary`, params);

// ── Timetable ─────────────────────────────────────────────────────────────────
export const fetchTimetable    = (params: Record<string, unknown> = {}) => get<TimetableSlot[]>('/timetable', params);
export const createTimetable   = (p: Partial<TimetableSlot>) => post<TimetableSlot>('/timetable', p);
export const updateTimetable   = (id: number, p: Partial<TimetableSlot>) => put<TimetableSlot>(`/timetable/${id}`, p);
export const deleteTimetable   = (id: number) => del(`/timetable/${id}`);

// ── Finance ───────────────────────────────────────────────────────────────────
export const fetchRevenue = () => get<OrgRevenue>('/organization-profile/revenue');

// ── School Settings ───────────────────────────────────────────────────────────
export const fetchSchoolSettings  = () => get<SchoolSettings>('/school-settings');
export const updateSchoolSettings = (p: Partial<SchoolSettings>) => patch<SchoolSettings>('/school-settings', p);
export const runAnnualPromotion   = () => post<void>('/school-settings/promotions/run');

// ── Reports ───────────────────────────────────────────────────────────────────
export const fetchReport = (reportPath: string, params: Record<string, unknown> = {}) =>
  get<unknown[]>(`/reports/${reportPath}`, params);
