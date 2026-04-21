import api from '../utils/api';
import { STORAGE_KEYS } from '../utils/constants';

const fallbackCourses = [
  {
    id: 101,
    name: 'UI Design Masterclass',
    description: 'Build polished interfaces with a strong visual system and practical layouts.',
    category: 'Design',
    progress: 75,
    status: 'ACTIVE',
    priceStatus: 'PAID',
    cover: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?auto=format&fit=crop&w=1200&q=80',
    teacher: { name: 'Prof. Elena Sterling', title: 'Lead Design Instructor' },
  },
  {
    id: 102,
    name: 'React Application Architecture',
    description: 'Organize components, state, and routing for scalable frontends.',
    category: 'Development',
    progress: 45,
    status: 'ACTIVE',
    priceStatus: 'PENDING',
    cover: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80',
    teacher: { name: 'Eng. Sarah Nassar', title: 'Frontend Mentor' },
  },
  {
    id: 103,
    name: 'Data Thinking for Students',
    description: 'Understand charts, assessment data, and decision making from scores.',
    category: 'Analytics',
    progress: 92,
    status: 'ACTIVE',
    priceStatus: 'PAID',
    cover: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    teacher: { name: 'Dr. Omar Khalil', title: 'Analytics Instructor' },
  },
];

const fallbackSubjects = [
  {
    id: 201,
    courseId: 101,
    name: 'Design Foundations',
    description: 'Typography, spacing, visual hierarchy, and clean component structure.',
    teacher: { name: 'Prof. Elena Sterling', title: 'Lead Design Instructor' },
  },
  {
    id: 202,
    courseId: 101,
    name: 'Interactive Prototypes',
    description: 'Create responsive prototypes and polished micro-interactions.',
    teacher: { name: 'Prof. Elena Sterling', title: 'Lead Design Instructor' },
  },
  {
    id: 203,
    courseId: 102,
    name: 'Routing and Layout Shells',
    description: 'Build reusable layouts and route-aware application shells.',
    teacher: { name: 'Eng. Sarah Nassar', title: 'Frontend Mentor' },
  },
  {
    id: 204,
    courseId: 103,
    name: 'Understanding Trends',
    description: 'Read progress data and make informed learning decisions.',
    teacher: { name: 'Dr. Omar Khalil', title: 'Analytics Instructor' },
  },
];

const fallbackLessons = [
  {
    id: 301,
    subjectId: 201,
    title: 'Grid Systems and Structure',
    duration: '12:45',
    videoUrl: '',
    content: 'Learn how to use grid columns, spacing rules, and hierarchy to support readability.',
  },
  {
    id: 302,
    subjectId: 201,
    title: 'Color and Contrast',
    duration: '18:00',
    videoUrl: '',
    content: 'Combine accessible color contrast with a deliberate visual rhythm.',
  },
  {
    id: 303,
    subjectId: 202,
    title: 'Motion Layers',
    duration: '16:20',
    videoUrl: '',
    content: 'Animate transitions so the UI feels expressive without becoming distracting.',
  },
  {
    id: 304,
    subjectId: 203,
    title: 'Building the Shell',
    duration: '20:10',
    videoUrl: '',
    content: 'Create a stable sidebar and header shell that scales across views.',
  },
  {
    id: 305,
    subjectId: 204,
    title: 'Weekly Progress Analysis',
    duration: '09:30',
    videoUrl: '',
    content: 'Read the chart, compare sessions, and spot the best time to review.',
  },
];

const fallbackMarks = [
  {
    id: 401,
    Numbers: 18,
    OutOf: 20,
    MarkType: 'Quiz',
    time: new Date().toISOString(),
    subject: {
      id: 201,
      name: 'Design Foundations',
      course: { id: 101, Name: 'UI Design Masterclass', name: 'UI Design Masterclass' },
    },
  },
  {
    id: 402,
    Numbers: 14,
    OutOf: 20,
    MarkType: 'Assignment',
    time: new Date(Date.now() - 86400000).toISOString(),
    subject: {
      id: 203,
      name: 'Routing and Layout Shells',
      course: { id: 102, Name: 'React Application Architecture', name: 'React Application Architecture' },
    },
  },
  {
    id: 403,
    Numbers: 19,
    OutOf: 20,
    MarkType: 'Quiz',
    time: new Date(Date.now() - 2 * 86400000).toISOString(),
    subject: {
      id: 204,
      name: 'Understanding Trends',
      course: { id: 103, Name: 'Data Thinking for Students', name: 'Data Thinking for Students' },
    },
  },
];

const fallbackPurchases = [
  { course: { id: 101, Name: 'UI Design Masterclass', name: 'UI Design Masterclass' }, status: 'PAID' },
  { course: { id: 102, Name: 'React Application Architecture', name: 'React Application Architecture' }, status: 'PENDING' },
  { course: { id: 103, Name: 'Data Thinking for Students', name: 'Data Thinking for Students' }, status: 'PAID' },
];

const fallbackCommentsByLesson = new Map([
  [
    301,
    [
      {
        id: 901,
        content: 'The spacing breakdown here is very clear.',
        user: { name: 'Teacher Amina' },
        createdAt: new Date().toISOString(),
      },
    ],
  ],
  [
    303,
    [
      {
        id: 902,
        content: 'Motion is what makes the interface feel premium.',
        user: { name: 'Student Omar' },
        createdAt: new Date().toISOString(),
      },
    ],
  ],
]);

const fallbackProfile = {
  id: 1,
  fullName: 'Academy Student',
  email: 'academy_student@learnova.com',
  phone: '+962 7 0000 0000',
  avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
};

const readStoredUser = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeStoredUser = (profile) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(profile));
  } catch {
    // Ignore storage issues and keep the in-memory fallback.
  }
};

const unwrap = (response, fallbackValue) => response?.data?.data ?? response?.data ?? fallbackValue;

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.courses)) return value.courses;
  if (Array.isArray(value?.marks)) return value.marks;
  if (Array.isArray(value?.purchases)) return value.purchases;
  return [];
};

const normalizeCourseName = (course) => course?.name || course?.Name || `Course ${course?.id || ''}`;

const buildCourseRecord = (course, paymentStatus = 'PAID') => ({
  id: course.id,
  name: normalizeCourseName(course),
  description: course.description || course.Description || '',
  category: course.category || 'Academy',
  progress: Number(course.progress || 0),
  status: paymentStatus === 'PAID' ? 'ACTIVE' : 'PENDING',
  priceStatus: paymentStatus,
  cover: course.cover || course.thumbnail || '',
  teacher: course.teacher || null,
});

const decorateCoursesWithPayments = (courses = [], purchases = []) => {
  const paymentMap = new Map(
    purchases
      .map((purchase) => [Number(purchase.course?.id || purchase.courseId), String(purchase.status || 'PAID').toUpperCase()])
      .filter(([id]) => Number.isFinite(id)),
  );

  return courses.map((course) => buildCourseRecord(course, paymentMap.get(Number(course.id)) || course.priceStatus || 'PAID'));
};

const collectCoursesFromSubjects = (subjects = []) => {
  const courseMap = new Map();

  subjects.forEach((subject) => {
    const course = subject.course || {};
    const courseId = Number(course.id || course.Course_id || subject.courseId);
    if (!courseId) return;

    if (!courseMap.has(courseId)) {
      courseMap.set(courseId, {
        id: courseId,
        name: normalizeCourseName(course),
        description: course.description || course.Description || '',
        category: course.category || 'Academy',
        progress: 0,
        cover: course.cover || course.thumbnail || '',
        teacher: subject.teacher || null,
      });
    }
  });

  return Array.from(courseMap.values());
};

const subjectLookup = () => {
  const map = new Map();
  fallbackSubjects.forEach((subject) => map.set(subject.id, subject));
  return map;
};

const lessonsForSubject = (subjectId) => fallbackLessons.filter((lesson) => Number(lesson.subjectId) === Number(subjectId));

const findLesson = (lessonId) => fallbackLessons.find((lesson) => Number(lesson.id) === Number(lessonId));

const subjectForLesson = (lessonId) => {
  const lesson = findLesson(lessonId);
  return lesson ? fallbackSubjects.find((subject) => Number(subject.id) === Number(lesson.subjectId)) : null;
};

const storeComments = (lessonId, comments) => {
  fallbackCommentsByLesson.set(Number(lessonId), comments);
};

const toNormalizedAttachment = (attachment = {}) => ({
  id: attachment.id,
  name: attachment.name || attachment.originalName || null,
  url: attachment.url || attachment.fileUrl || '',
  fileType: attachment.fileType || attachment.type || 'other',
  mimeType: attachment.mimeType || null,
  createdAt: attachment.createdAt || null,
  originalName: attachment.originalName || null,
});

const toNormalizedLesson = (lesson = {}) => {
  const attachments = ensureArray(lesson.attachments).map(toNormalizedAttachment);
  const videoAttachment = attachments.find((item) => String(item.fileType || item.type || '').toUpperCase() === 'VIDEO');

  return {
    ...lesson,
    id: Number(lesson.id),
    subjectId: Number(lesson.subjectId || lesson.Subject_id || lesson.subject_id || 0) || null,
    title: lesson.title || lesson.name || '',
    name: lesson.name || lesson.title || '',
    description: lesson.description || lesson.Description || '',
    videoUrl: lesson.videoUrl || videoAttachment?.url || '',
    attachments,
  };
};

const resolveLessonContextFromApi = async (lessonId) => {
  const numericLessonId = Number(lessonId);
  if (!Number.isFinite(numericLessonId) || numericLessonId <= 0) {
    return null;
  }

  const courses = await fetchStudentCourseCatalog();
  for (const course of courses || []) {
    const subjects = await fetchCourseSubjects(course.id);
    for (const subject of subjects || []) {
      const lessons = await fetchSubjectLessons(subject.id);
      const matchedLesson = (lessons || []).find((item) => Number(item?.id) === numericLessonId);

      if (matchedLesson) {
        return {
          lesson: matchedLesson,
          subject: {
            ...subject,
            id: Number(subject.id),
            name: subject.name || subject.Name || 'Subject',
          },
          course: {
            ...course,
            id: Number(course.id),
            name: course.name || course.Name || 'Course',
          },
        };
      }
    }
  }

  return null;
};

export async function fetchStudentContext() {
  try {
    const response = await api.get('/student/me/context');
    return unwrap(response, null);
  } catch (error) {
    console.error('fetchStudentContext error:', error);
    return null;
  }
}

export async function fetchSchoolMySubjects() {
  try {
    const response = await api.get('/student/school/subjects');
    const data = unwrap(response, null);
    return data || { class: null, subjects: [] };
  } catch (error) {
    console.error('fetchSchoolMySubjects error:', error);
    return { class: null, subjects: [] };
  }
}

export async function fetchAcademyTracks() {
  try {
    const response = await api.get('/student/academy/tracks');
    const data = unwrap(response, []);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('fetchAcademyTracks error:', error);
    return [];
  }
}

export async function fetchAcademyTrackSubjects(trackId) {
  const numericTrackId = Number(trackId);
  if (!Number.isFinite(numericTrackId) || numericTrackId <= 0) {
    return { track: null, subjects: [] };
  }

  try {
    const response = await api.get(`/student/academy/tracks/${numericTrackId}/subjects`);
    const data = unwrap(response, null);
    return data || { track: null, subjects: [] };
  } catch (error) {
    console.error('fetchAcademyTrackSubjects error:', error);
    return { track: null, subjects: [] };
  }
}

export async function fetchAcademySubscriptions() {
  try {
    const response = await api.get('/student/academy/subscriptions');
    const data = unwrap(response, []);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('fetchAcademySubscriptions error:', error);
    return [];
  }
}

export async function subscribeAcademyMaterial(subjectId, paymentMethod = 'STRIPE') {
  const numericSubjectId = Number(subjectId);
  if (!Number.isFinite(numericSubjectId) || numericSubjectId <= 0) {
    throw new Error('Invalid subject id.');
  }

  const response = await api.post(`/student/academy/subjects/${numericSubjectId}/subscribe`, {
    paymentMethod,
  });

  return unwrap(response, null);
}

export async function verifyAcademyCheckoutSession(sessionId) {
  const normalized = String(sessionId || '').trim();
  if (!normalized) {
    throw new Error('Missing checkout session id.');
  }

  const response = await api.get('/student/academy/checkout/verify', {
    params: {
      session_id: normalized,
    },
  });

  return unwrap(response, null);
}

export async function fetchMyStudentMarks() {
  try {
    const response = await api.get('/marks/me');
    console.log('Marks API:', response);
    const payload = unwrap(response, []);
    const normalized = ensureArray(payload);
    if (!Array.isArray(normalized)) {
      console.error('Marks API shape invalid:', payload);
      return [];
    }
    return normalized;
  } catch (error) {
    console.error('fetchMyStudentMarks error:', error);
    return [];
  }
}

export async function fetchMyStudentPurchases() {
  try {
    const response = await api.get('/payment/student/purchases');
    console.log('Purchases API:', response);
    const payload = unwrap(response, []);
    const normalized = ensureArray(payload);
    if (!Array.isArray(normalized)) {
      console.error('Purchases API shape invalid:', payload);
      return [];
    }
    return normalized;
  } catch (error) {
    console.error('fetchMyStudentPurchases error:', error);
    return [];
  }
}

export async function fetchCoursePaymentStatus(courseId) {
  try {
    const response = await api.get(`/payment/courses/${courseId}/payment-status`);
    return unwrap(response, { courseId, status: 'PAID' });
  } catch {
    const purchase = fallbackPurchases.find((item) => Number(item.course?.id) === Number(courseId));
    return {
      courseId,
      status: String(purchase?.status || 'PAID').toUpperCase(),
    };
  }
}

export async function fetchStudentCourseCatalog() {
  try {
    const context = await fetchStudentContext();

    if (context?.mode === 'ACADEMY') {
      const tracks = await fetchAcademyTracks();
      return (tracks || []).map((track) => ({
        id: Number(track.id),
        name: track.name,
        description: track.description || '',
        category: 'Track',
        progress: track.subjectCount
          ? Math.round((Number(track.subscribedSubjectCount || 0) / Number(track.subjectCount || 1)) * 100)
          : 0,
        status: 'ACTIVE',
        priceStatus: 'PAID',
        cover: track.thumbnail || '',
      }));
    }

    if (context?.mode === 'SCHOOL') {
      return [
        {
          id: Number(context?.class?.id || context?.classCourseId || 0),
          name: context?.class?.name || context?.className || 'Class',
          description: context?.class?.gradeLevel ? `Grade ${context.class.gradeLevel}` : 'Assigned class',
          category: 'Class',
          progress: 0,
          status: 'ACTIVE',
          priceStatus: 'PAID',
          cover: '',
        },
      ].filter((course) => course.id > 0);
    }

    return [];
  } catch (error) {
    console.error('fetchStudentCourseCatalog error:', error);
    return [];
  }
}

export async function fetchCourseSubjects(courseId) {
  try {
    const response = await api.get(`/courses/${courseId}/subjects`);
    const data = unwrap(response, []);
    if (Array.isArray(data) && data.length) {
      return data;
    }
  } catch {
    // Use fallback data below.
  }

  return fallbackSubjects.filter((subject) => Number(subject.courseId) === Number(courseId));
}

export async function fetchSubjectLessons(subjectId) {
  try {
    const response = await api.get(`/subjects/${subjectId}/lessons`);
    const data = unwrap(response, []);
    console.log('[LESSONS][FRONTEND] GET /subjects/:subjectId/lessons', {
      subjectId: Number(subjectId),
      status: response?.status,
      total: Array.isArray(data) ? data.length : 0,
      progress: response?.data?.progress || null,
    });

    if (Array.isArray(data) && data.length) {
      return data.map(toNormalizedLesson);
    }

    return [];
  } catch (error) {
    console.error('[LESSONS][FRONTEND] Failed to fetch subject lessons', {
      subjectId: Number(subjectId),
      status: error?.response?.status,
      message: error?.response?.data?.message || error?.message,
    });
    // Bubble errors so pages do not silently display stale empty state.
    throw new Error('Failed to fetch subject lessons.');
  }
}

export async function updateStudentLessonProgress(lessonId, isCompleted) {
  const response = await api.put(`/lessons/progress/${lessonId}`, {
    isCompleted: Boolean(isCompleted),
  });

  return unwrap(response, null);
}

export async function fetchStudentSubjectProgress(subjectId) {
  const response = await api.get(`/lessons/progress/subject/${subjectId}`);
  return unwrap(response, null);
}

export async function fetchLessonDetails(lessonId) {
  try {
    const lessonContext = await resolveLessonContextFromApi(lessonId);
    if (lessonContext) {
      const attachmentsResponse = await api.get(`/lessons/${lessonId}/assets`);
      const attachmentsRaw = ensureArray(unwrap(attachmentsResponse, []));
      const attachments = attachmentsRaw.map(toNormalizedAttachment);
      const videoAttachment = attachments.find((item) => String(item.fileType || '').toUpperCase() === 'VIDEO');

      return {
        ...lessonContext.lesson,
        id: Number(lessonContext.lesson.id),
        title: lessonContext.lesson.title || lessonContext.lesson.name || 'Lesson',
        name: lessonContext.lesson.title || lessonContext.lesson.name || 'Lesson',
        description: lessonContext.lesson.description || lessonContext.lesson.content || '',
        content: lessonContext.lesson.description || lessonContext.lesson.content || '',
        subject: lessonContext.subject,
        course: lessonContext.course,
        subjectId: Number(lessonContext.subject.id),
        courseId: Number(lessonContext.course.id),
        videoUrl: videoAttachment?.url || lessonContext.lesson.videoUrl || '',
        attachments,
      };
    }
  } catch {
    // Use fallback data below.
  }

  const lesson = findLesson(lessonId);
  const subject = lesson ? subjectForLesson(lessonId) : null;

  return lesson
    ? {
        ...lesson,
        title: lesson.title,
        name: lesson.title,
        subject,
        course: subject?.course || fallbackCourses.find((course) => Number(course.id) === Number(subject?.courseId)),
        attachments: [
          {
            id: `${lesson.id}-notes`,
            name: `${lesson.title} notes.pdf`,
            url: '#',
          },
        ],
      }
    : null;
}

export async function fetchLessonComments(lessonId) {
  try {
    console.log('[COMMENTS] Fetch request', {
      endpoint: `/lessons/${lessonId}/comments`,
      method: 'GET',
      baseUrl: api.defaults.baseURL,
      hasAuthHeader: Boolean(window?.localStorage?.getItem(STORAGE_KEYS.TOKEN)),
      lesson_id: Number(lessonId),
    });
    const response = await api.get(`/lessons/${lessonId}/comments`);
    const data = unwrap(response, []);
    if (Array.isArray(data)) {
      console.log('[COMMENTS] Fetch response', {
        status: response?.status,
        count: data.length,
      });
      return data;
    }
    console.error('[COMMENTS] Fetch invalid response shape', { data });
    throw new Error('Invalid comments response shape.');
  } catch (error) {
    console.error('[COMMENTS] Fetch failed', {
      status: error?.response?.status,
      endpoint: `/lessons/${lessonId}/comments`,
      method: 'GET',
      message: error?.response?.data?.message || error?.message,
      error: error?.response?.data?.error || null,
      details: error?.response?.data?.details || null,
    });
    throw error;
  }
}

export async function createLessonComment(lessonId, input) {
  const content = typeof input === 'string' ? input : input?.content || '';
  const user = readStoredUser();
  const userId = Number(user?.id || user?.userId || user?.User_id || 0) || null;
  const lessonIdNumber = Number(lessonId);

  if (!Number.isFinite(lessonIdNumber) || lessonIdNumber <= 0) {
    throw new Error('Invalid lesson id for comment submission.');
  }

  if (!content.trim()) {
    throw new Error('Comment content is required.');
  }

  const requestBody = { content: content.trim() };

  try {
    console.log('[COMMENTS] Submit request', {
      endpoint: `/lessons/${lessonIdNumber}/comments`,
      method: 'POST',
      baseUrl: api.defaults.baseURL,
      headers: {
        hasContentType: Boolean(api.defaults?.headers?.['Content-Type'] || api.defaults?.headers?.common?.['Content-Type']),
        hasAuthHeader: Boolean(window?.localStorage?.getItem(STORAGE_KEYS.TOKEN)),
      },
      payload: {
        lesson_id: lessonIdNumber,
        user_id: userId,
        content: requestBody.content,
      },
      requestBody,
    });

    const response = await api.post(`/lessons/${lessonIdNumber}/comments`, requestBody);
    const created = unwrap(response, null);

    console.log('[COMMENTS] Submit response', {
      status: response?.status,
      createdCommentId: created?.id || null,
      createdLessonId: created?.lessonId || null,
      createdUserId: created?.userId || null,
    });

    if (!created?.id) {
      throw new Error('Comment was not created on server. Missing comment id in response.');
    }

    return created;
  } catch (error) {
    console.error('[COMMENTS] Submit failed', {
      status: error?.response?.status,
      endpoint: `/lessons/${lessonIdNumber}/comments`,
      method: 'POST',
      payload: {
        lesson_id: lessonIdNumber,
        user_id: userId,
        content: requestBody.content,
      },
      message: error?.response?.data?.message || error?.message,
      error: error?.response?.data?.error || null,
      details: error?.response?.data?.details || null,
    });
    throw error;
  }
}

export async function fetchAcademyTeachersForCourses(courseIds = []) {
  const normalizedIds = new Set(courseIds.map((value) => Number(value)).filter(Number.isFinite));
  const teachers = [];
  const seen = new Set();

  fallbackSubjects.forEach((subject) => {
    if (normalizedIds.size && !normalizedIds.has(Number(subject.courseId))) {
      return;
    }

    const teacher = subject.teacher;
    if (!teacher) return;

    const key = `${teacher.name}-${teacher.title}`;
    if (seen.has(key)) return;
    seen.add(key);
    teachers.push({
      id: key,
      name: teacher.name,
      title: teacher.title,
      courseId: subject.courseId,
      subjectId: subject.id,
    });
  });

  return teachers.length ? teachers : [{ id: 'fallback-teacher', name: 'Academy Mentor', title: 'Instructor', courseId: null, subjectId: null }];
}

export async function askStudentTutor({ question, courseId, subjectId, lessonId, history = [] }) {
  const normalizedCourseId = Number(courseId);
  const normalizedSubjectId = Number(subjectId);
  const normalizedLessonId = Number(lessonId);
  const isValidId = (value) => Number.isInteger(value) && value > 0;

  const payload = {
    question,
    ...(isValidId(normalizedCourseId) ? { course_id: normalizedCourseId } : {}),
    ...(isValidId(normalizedSubjectId) ? { subject_id: normalizedSubjectId } : {}),
    ...(isValidId(normalizedLessonId) ? { lesson_id: normalizedLessonId } : {}),
    ...(Array.isArray(history) && history.length
      ? {
        history: history
          .filter((entry) => entry && (entry.role === 'user' || entry.role === 'assistant'))
          .map((entry) => ({ role: entry.role, content: String(entry.content || '').trim() }))
          .filter((entry) => entry.content)
          .slice(-16),
      }
      : {}),
  };

  const response = await api.post('/chatbot/ask', payload);
  const data = unwrap(response, null);

  if (!data) {
    throw new Error('Empty assistant response from server.');
  }

  return data;
}

export async function fetchStudentChats() {
  const response = await api.get('/chats');
  const data = unwrap(response, []);
  return Array.isArray(data) ? data : [];
}

const normalizeTeacherRecord = (teacher = {}) => ({
  id: Number(teacher?.id || teacher?.Teacher_id || teacher?.userId || 0),
  userId: Number(teacher?.userId || teacher?.user?.id || teacher?.Teacher_id || teacher?.id || 0),
  name: teacher?.name || teacher?.user?.name || '',
  email: teacher?.email || teacher?.user?.email || '',
  work: teacher?.work || teacher?.Work || '',
  specialization: teacher?.specialization || '',
  bio: teacher?.bio || '',
  createdAt: teacher?.createdAt || null,
  age: teacher?.age ?? teacher?.user?.age ?? null,
  gender: teacher?.gender ?? teacher?.user?.gender ?? null,
  address: teacher?.address ?? teacher?.user?.address ?? null,
  avatarUrl: teacher?.avatarUrl || teacher?.avatar || null,
  subjectCount: Number(teacher?.subjectCount || teacher?._count?.subject || 0),
});

export async function fetchStudentTeachers(search = '') {
  try {
    const response = await api.get('/teachers', {
      params: search ? { search } : undefined,
    });
    const data = unwrap(response, []);
    return Array.isArray(data) ? data.map(normalizeTeacherRecord) : [];
  } catch (error) {
    console.error('fetchStudentTeachers error:', error);
    return [];
  }
}

export async function fetchStudentTeacherById(teacherId) {
  const numericTeacherId = Number(teacherId);
  if (!Number.isFinite(numericTeacherId) || numericTeacherId <= 0) {
    return null;
  }

  try {
    const response = await api.get(`/teachers/${numericTeacherId}`);
    const data = unwrap(response, null);
    return data ? normalizeTeacherRecord(data) : null;
  } catch (error) {
    console.error('fetchStudentTeacherById error:', error);
    return null;
  }
}

export async function fetchStudentChatMessages(chatId) {
  const response = await api.get(`/chats/${chatId}/messages`);
  const data = unwrap(response, []);
  return Array.isArray(data) ? data : [];
}

export async function sendStudentChatMessage(chatId, content, replyToMessageId = null) {
  const payload = {
    content,
    ...(Number.isInteger(Number(replyToMessageId)) && Number(replyToMessageId) > 0
      ? { replyToMessageId: Number(replyToMessageId) }
      : {}),
  };
  const response = await api.post(`/chats/${chatId}/messages`, payload);
  return unwrap(response, null);
}

export async function deleteStudentChatMessage(chatId, messageId) {
  try {
    await api.delete(`/chats/messages/${messageId}`);
  } catch {
    // Backward-compatible fallback endpoint.
    await api.delete(`/chats/${chatId}/messages/${messageId}`);
  }
  return true;
}

export async function editStudentChatMessage(messageId, content) {
  const payload = {
    content: String(content || '').trim(),
  };
  const response = await api.patch(`/chats/messages/${messageId}`, payload);
  return unwrap(response, null);
}

export async function clearStudentChat(chatId) {
  await api.delete(`/chats/${chatId}/clear`);
  return true;
}

export async function fetchStudentProfile() {
  const stored = readStoredUser();

  try {
    const response = await api.get('/auth/me');
    const data = unwrap(response, null);

    if (data && typeof data === 'object') {
      const normalized = {
        ...fallbackProfile,
        ...data,
        fullName: data?.fullName || data?.name || stored?.fullName || stored?.name || fallbackProfile.fullName,
        email: data?.email || stored?.email || fallbackProfile.email,
        phone: data?.phone || stored?.phone || fallbackProfile.phone,
        avatarUrl: data?.avatarUrl || data?.avatar || stored?.avatarUrl || stored?.avatar || fallbackProfile.avatarUrl,
      };

      writeStoredUser(normalized);
      return normalized;
    }
  } catch {
    // Keep local profile fallback for environments without /auth/me.
  }

  return {
    ...fallbackProfile,
    fullName: stored?.fullName || stored?.name || fallbackProfile.fullName,
    email: stored?.email || fallbackProfile.email,
    phone: stored?.phone || fallbackProfile.phone,
    avatarUrl: stored?.avatarUrl || stored?.avatar || fallbackProfile.avatarUrl,
  };
}

export async function updateStudentProfile(payload = {}) {
  const safePayload = Object.fromEntries(
    Object.entries(payload || {}).filter(([, value]) => value !== undefined),
  );

  if (!Object.keys(safePayload).length) {
    return fetchStudentProfile();
  }

  try {
    const response = await api.patch('/auth/me', safePayload);
    const updated = unwrap(response, null);

    if (updated && typeof updated === 'object') {
      const nextProfile = {
        ...(await fetchStudentProfile()),
        ...updated,
        ...safePayload,
        fullName: updated?.fullName || updated?.name || safePayload.fullName,
      };

      writeStoredUser(nextProfile);
      return nextProfile;
    }
  } catch {
    // Preserve the old local update behavior when backend PATCH is unavailable.
  }

  const current = await fetchStudentProfile();
  const nextProfile = {
    ...current,
    ...safePayload,
  };

  writeStoredUser(nextProfile);
  return nextProfile;
}

export async function changeStudentPassword({ newPassword }) {
  const payload = {
    newPassword,
  };

  const response = await api.patch('/auth/change-password', payload);
  return unwrap(response, { success: true });
}

export function decorateStudentCourses(courses = [], purchases = []) {
  return decorateCoursesWithPayments(courses, purchases);
}

export function getFallbackStudentCourseCatalog() {
  return decorateCoursesWithPayments(fallbackCourses, fallbackPurchases);
}

export function getFallbackStudentPurchases() {
  return fallbackPurchases;
}

export function getFallbackStudentMarks() {
  return fallbackMarks;
}

export function getFallbackLessons() {
  return fallbackLessons;
}
