import apiClient from '../../../shared/services/apiClient';
import type {
  OrgProfile, OrgTeacher, OrgCourse, OrgSubject, OrgUser, OrgMark, OrgLesson,
  AssessmentComponent, AcademicYear, Term, ComputedGrade, GradeRanking,
  CalendarEvent, AttendanceRecord, AttendanceSummaryItem, TimetableSlot,
  OrgRevenue, CourseRevenue, RevenueTransaction, SchoolSettings, CertificateStatus, AttendanceStatus,
} from '../../../types/organization';

// Unwrap the standard { success, data, ... } envelope — `data` can legitimately
// be `null`, so check for the key rather than using `??`.
const unwrap = <T>(body: unknown): T =>
  (body && typeof body === 'object' && 'data' in (body as object) ? (body as { data: unknown }).data : body) as T;

const get  = async <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
  const { data } = await apiClient.get(url, { params });
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
const del   = async (url: string): Promise<void> => {
  await apiClient.delete(url);
};

// ── Name normalizer — backend returns a single `name` field; we split it ───────
function splitName<T extends Record<string, unknown>>(item: T): T {
  if (item.firstName || item.lastName) return item;
  const full = String(item.name ?? '').trim();
  const idx  = full.indexOf(' ');
  return {
    ...item,
    firstName: idx >= 0 ? full.slice(0, idx)     : full,
    lastName:  idx >= 0 ? full.slice(idx + 1)    : '',
  };
}

// ── Profile ───────────────────────────────────────────────────────────────────
export const fetchOrgProfile        = () => get<OrgProfile>('/organizations/me');
export const updateOrgProfile       = (p: Partial<OrgProfile>) => patch<OrgProfile>('/organizations/me', p);

// ── Teachers ──────────────────────────────────────────────────────────────────
export const fetchTeachers = async (): Promise<OrgTeacher[]> => {
  const data = await get<OrgTeacher[]>('/teachers');
  return data.map(t => splitName(t as unknown as Record<string, unknown>) as unknown as OrgTeacher);
};
export const createTeacher          = (p: Partial<OrgTeacher & { firstName?: string; lastName?: string; password?: string }>) => {
  const { firstName, lastName, password, ...rest } = p;
  const name = `${firstName ?? ''} ${lastName ?? ''}`.trim();
  return post<OrgTeacher & { tempPassword?: string; registrationNumber?: string }>('/teachers', { ...rest, name });
};
export const updateTeacher          = (id: number, p: Partial<OrgTeacher>) => put<OrgTeacher>(`/teachers/${id}`, p);
export const deleteTeacher          = (id: number) => del(`/teachers/${id}`);

// ── Courses ───────────────────────────────────────────────────────────────────
export const fetchCourses           = () => get<OrgCourse[]>('/courses');
export const createCourse           = (p: Partial<OrgCourse> | FormData) => post<OrgCourse>('/courses', p);
export const updateCourse           = (id: number, p: Partial<OrgCourse> | FormData) => patch<OrgCourse>(`/courses/${id}`, p);
export const deleteCourse           = (id: number) => del(`/courses/${id}`);

// ── Subjects ──────────────────────────────────────────────────────────────────
export const fetchSubjects          = (courseId: number) => get<OrgSubject[]>(`/courses/${courseId}/subjects`);
export const createSubject          = (courseId: number, p: Partial<OrgSubject>) => post<OrgSubject>(`/courses/${courseId}/subjects`, p);
export const updateSubject          = (courseId: number, subjectId: number, p: Partial<OrgSubject>) => patch<OrgSubject>(`/courses/${courseId}/subjects/${subjectId}`, p);
export const deleteSubject          = (courseId: number, subjectId: number) => del(`/courses/${courseId}/subjects/${subjectId}`);
export const fetchSubjectLessons    = (subjectId: number) => get<OrgLesson[]>(`/subjects/${subjectId}/lessons`);
export const uploadSubjectImage     = (courseId: number, fd: FormData) => post<{ imageUrl: string }>(`/courses/${courseId}/subjects/upload-image`, fd);

// ── Users (students & parents) ────────────────────────────────────────────────
export const fetchUsers = async (params: Record<string, unknown> = {}): Promise<OrgUser[]> => {
  const data = await get<OrgUser[]>('/users', params);
  return data.map(u => splitName(u as unknown as Record<string, unknown>) as unknown as OrgUser);
};
export const createUser = (p: Partial<OrgUser & { role?: string; firstName?: string; lastName?: string }>) => {
  const { firstName, lastName, ...rest } = p;
  const name = `${firstName ?? ''} ${lastName ?? ''}`.trim();
  return post<OrgUser & { tempPassword?: string; registrationNumber?: string }>('/users', { ...rest, name });
};
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

// ── Marks normalizer — backend uses raw Prisma field names ───────────────────
function normalizeOrgMark(raw: Record<string, unknown>): OrgMark {
  const student = raw.student as { user?: { name?: string } } | null | undefined;
  const subject = raw.subject as { id?: number; name?: string; course?: { id?: number; Name?: string } } | null | undefined;
  return {
    id:              raw.id as number,
    studentId:       (raw.Student_id ?? raw.studentId) as number,
    studentName:     (student?.user?.name ?? raw.studentName) as string | undefined,
    subjectId:       (subject?.id ?? raw.subjectId) as number | undefined,
    subjectName:     (subject?.name ?? raw.subjectName) as string | undefined,
    courseId:        (subject?.course?.id ?? raw.courseId) as number | undefined,
    courseName:      (subject?.course?.Name ?? raw.courseName) as string | undefined,
    score:           (raw.Numbers ?? raw.score ?? 0) as number,
    outOf:           (raw.OutOf ?? raw.outOf ?? 0) as number,
    type:            ((raw.MarkType ?? raw.type ?? '') as string),
    termId:          raw.termId as number | null | undefined,
    academicYearId:  raw.academicYearId as number | null | undefined,
    gradeLevel:      raw.gradeLevel as number | null | undefined,
    createdAt:       (raw.time ?? raw.createdAt) as string | undefined,
  };
}

// ── Marks & Assessment Components ────────────────────────────────────────────
export const fetchMarks = async (params: Record<string, unknown> = {}): Promise<OrgMark[]> => {
  const data = await get<Record<string, unknown>[]>('/marks/org', params);
  return data.map(normalizeOrgMark);
};
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
export const fetchCalendarEvents  = (params: Record<string, unknown> = {}) => get<CalendarEvent[]>('/school-calendar', params);
export const createCalendarEvent  = (p: Partial<CalendarEvent>) => post<CalendarEvent>('/school-calendar', p);
export const updateCalendarEvent  = (id: number, p: Partial<CalendarEvent>) => patch<CalendarEvent>(`/school-calendar/${id}`, p);
export const deleteCalendarEvent  = (id: number) => del(`/school-calendar/${id}`);

// ── Attendance ────────────────────────────────────────────────────────────────
export const fetchClassStudents = async (classId: number): Promise<OrgUser[]> => {
  const data = await get<OrgUser[]>(`/attendance/class/${classId}/students`);
  return data.map(u => splitName(u as unknown as Record<string, unknown>) as unknown as OrgUser);
};
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
export const fetchRevenue = async (): Promise<OrgRevenue> => {
  const raw = await get<Record<string, unknown>>('/organization-profile/revenue');
  const recentPayments = (raw.recentPayments as Record<string, unknown>[] ?? []).map((p): RevenueTransaction => {
    const course = p.course as { id?: number; Name?: string } | null;
    const student = p.student as { name?: string } | null;
    return {
      id:            p.id as number,
      studentName:   student?.name ?? undefined,
      courseName:    course?.Name ?? undefined,
      amount:        Number(p.amount ?? 0),
      date:          String(p.paidAt ?? '').slice(0, 10),
      status:        p.status as string | undefined,
      paymentMethod: p.paymentMethod as string | null | undefined,
    };
  });
  const byCourse = (raw.byCourse as CourseRevenue[] ?? []);
  return {
    totalRevenue:     Number(raw.totalRevenue ?? 0),
    totalPayments:    Number(raw.totalPayments ?? 0),
    paidCoursesCount: Number(raw.paidCoursesCount ?? 0),
    freeCoursesCount: Number(raw.freeCoursesCount ?? 0),
    recentPayments,
    byCourse,
  };
};

// ── School Settings ───────────────────────────────────────────────────────────
export const fetchSchoolSettings  = () => get<SchoolSettings>('/school-settings');
export const updateSchoolSettings = (p: Partial<SchoolSettings>) => patch<SchoolSettings>('/school-settings', p);
export const runAnnualPromotion   = () => post<void>('/school-settings/promotions/run');

// ── Reports ───────────────────────────────────────────────────────────────────
export const fetchReport = (reportPath: string, params: Record<string, unknown> = {}) =>
  get<unknown[]>(`/reports/${reportPath}`, params);
