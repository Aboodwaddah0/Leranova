import api from "../utils/api";

const DUMMY_COURSES = [
  {
    id: 901,
    name: "Fullstack Web Bootcamp",
    description: "Build production-ready web apps with React, Node.js, and deployment workflows.",
    thumbnail:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
    price: 49,
  },
  {
    id: 902,
    name: "UI Engineering Foundations",
    description: "Design systems, reusable components, and maintainable frontend architecture.",
    thumbnail:
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80",
    price: 39,
  },
  {
    id: 903,
    name: "Backend API Mastery",
    description: "Build secure APIs, data models, and integrations for real-world LMS products.",
    thumbnail:
      "https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=1200&q=80",
    price: 59,
  },
];

const DUMMY_SUBJECTS = {
  901: [
    { id: 1101, name: "React Fundamentals", courseId: 901 },
    { id: 1102, name: "Node API Basics", courseId: 901 },
  ],
  902: [
    { id: 1201, name: "Design Tokens", courseId: 902 },
    { id: 1202, name: "Component Patterns", courseId: 902 },
  ],
  903: [
    { id: 1301, name: "API Security", courseId: 903 },
    { id: 1302, name: "Database Modeling", courseId: 903 },
  ],
};

const DUMMY_LESSONS = {
  1101: [
    { id: 2101, name: "JSX and Component Thinking", subjectId: 1101, courseId: 901 },
    { id: 2102, name: "State and Effects", subjectId: 1101, courseId: 901 },
  ],
  1102: [
    { id: 2103, name: "Express Routing", subjectId: 1102, courseId: 901 },
    { id: 2104, name: "Service Layer Patterns", subjectId: 1102, courseId: 901 },
  ],
  1201: [
    { id: 2201, name: "Color and Spacing Tokens", subjectId: 1201, courseId: 902 },
    { id: 2202, name: "Typography Systems", subjectId: 1201, courseId: 902 },
  ],
  1202: [
    { id: 2203, name: "Card Components", subjectId: 1202, courseId: 902 },
    { id: 2204, name: "Form Accessibility", subjectId: 1202, courseId: 902 },
  ],
  1301: [
    { id: 2301, name: "Auth and JWT", subjectId: 1301, courseId: 903 },
    { id: 2302, name: "Rate Limiting", subjectId: 1301, courseId: 903 },
  ],
  1302: [
    { id: 2303, name: "Schema Design", subjectId: 1302, courseId: 903 },
    { id: 2304, name: "Indexing Strategies", subjectId: 1302, courseId: 903 },
  ],
};

const DUMMY_LESSON_DETAILS = {
  2101: {
    id: 2101,
    name: "JSX and Component Thinking",
    subjectId: 1101,
    courseId: 901,
    videoUrl: "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
  },
  2102: {
    id: 2102,
    name: "State and Effects",
    subjectId: 1101,
    courseId: 901,
    videoUrl: "https://samplelib.com/lib/preview/mp4/sample-10s.mp4",
  },
};

const DUMMY_ATTACHMENTS = {
  2101: [
    { id: "a1", name: "jsx-cheatsheet.pdf", type: "PDF" },
    { id: "a2", name: "component-patterns.docx", type: "DOCX" },
  ],
  2102: [{ id: "a3", name: "effects-guide.pdf", type: "PDF" }],
};

const normalizeCourse = (course) => ({
  id: course.id,
  name: course.Name || course.name,
  description: course.Description || course.description || "",
  thumbnail: course.Thumbnail || course.thumbnail || "",
  price: Number(course.price || 0),
});

export const fetchMyStudentMarks = async () => {
  try {
    const { data } = await api.get("/marks/me");
    return data?.data || [];
  } catch {
    return [];
  }
};

export const fetchStudentCourseCatalog = async () => {
  try {
    const { data } = await api.get("/courses");
    const list = data?.data || [];
    if (!Array.isArray(list) || !list.length) {
      return DUMMY_COURSES;
    }

    return list.map(normalizeCourse);
  } catch {
    return DUMMY_COURSES;
  }
};

export const fetchMyStudentPurchases = async () => {
  try {
    const { data } = await api.get("/payment/student/purchases");
    return data?.data || [];
  } catch {
    return [];
  }
};

export const fetchCoursePaymentStatus = async (courseId) => {
  try {
    const { data } = await api.get(`/payment/courses/${courseId}/payment-status`);
    return data?.data || null;
  } catch {
    return null;
  }
};

export const startCourseCheckout = async (course) => {
  await new Promise((resolve) => setTimeout(resolve, 400));

  return {
    success: true,
    checkoutUrl: "https://checkout.stripe.com/pay/cs_test_placeholder",
    courseId: course?.id,
  };
};

export const fetchCourseSubjects = async (courseId) => {
  const id = Number(courseId);

  try {
    const { data } = await api.get(`/courses/${id}/subjects`);
    const list = data?.data || [];
    if (Array.isArray(list) && list.length) {
      return list.map((subject) => ({
        id: subject.id,
        name: subject.name || subject.Name,
        courseId: subject.Course_id || id,
      }));
    }
  } catch {
    // Fallback below.
  }

  return DUMMY_SUBJECTS[id] || [];
};

export const fetchSubjectLessons = async (subjectId) => {
  const id = Number(subjectId);

  try {
    const { data } = await api.get(`/subjects/${id}/lessons`);
    const list = data?.data || [];
    if (Array.isArray(list) && list.length) {
      return list.map((lesson) => ({
        id: lesson.id,
        name: lesson.name || lesson.title,
        subjectId: lesson.Subject_id || id,
      }));
    }
  } catch {
    // Fallback below.
  }

  return DUMMY_LESSONS[id] || [];
};

export const fetchLessonDetails = async (lessonId, subjectId) => {
  const id = Number(lessonId);
  const parentSubjectId = Number(subjectId);

  const fallback = DUMMY_LESSON_DETAILS[id]
    || (DUMMY_LESSONS[parentSubjectId] || []).find((lesson) => lesson.id === id)
    || {
      id,
      name: `Lesson #${id}`,
      subjectId: parentSubjectId || null,
      videoUrl: "",
    };

  return fallback;
};

export const fetchLessonAttachments = async (lessonId) => {
  const id = Number(lessonId);
  return DUMMY_ATTACHMENTS[id] || [];
};

export const fetchStudentProfile = async (user) => {
  return {
    name: user?.name || "",
    email: user?.email || "",
  };
};

export const updateStudentProfile = async (payload) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return payload;
};

export const askStudentTutor = async ({ question, courseId, subjectId, lessonId }) => {
  const payload = {
    question,
    course_id: Number(courseId),
  };

  if (subjectId) {
    payload.subject_id = Number(subjectId);
  }

  if (lessonId) {
    payload.lesson_id = Number(lessonId);
  }

  const { data } = await api.post("/chatbot/ask", payload);
  return data?.data || null;
};

export const fetchLessonComments = async (lessonId) => {
  try {
    const { data } = await api.get(`/lessons/${lessonId}/comments`);
    return data?.data || [];
  } catch {
    return [];
  }
};

export const createLessonComment = async (lessonId, content) => {
  try {
    const { data } = await api.post(`/lessons/${lessonId}/comments`, { content });
    return data?.data || null;
  } catch {
    return {
      id: `local-${Date.now()}`,
      content,
      user: { name: "You" },
    };
  }
};