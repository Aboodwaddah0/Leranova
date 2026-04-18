import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const orgRoleKey = (orgRole) => String(orgRole || '').trim().toUpperCase();

const ensureOrganizationRole = (orgRole) => {
  const normalized = orgRoleKey(orgRole);
  if (!['ACADEMY', 'SCHOOL'].includes(normalized)) {
    throw new AppError('Organization role is not supported for enrollment', 403);
  }
  return normalized;
};

const ensureCourseBelongsToOrg = async (orgId, courseId) => {
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      Org_id: orgId,
    },
    select: { id: true, Name: true, Description: true, Org_id: true },
  });

  if (!course) {
    throw new AppError('Course not found', 404);
  }

  return course;
};

const enrollmentInclude = {
  academy_user: {
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  },
  course: { select: { id: true, Name: true, Description: true, Thumbnail: true } },
};

const mapAcademyEnrollment = (record) => ({
  enrollmentType: 'ACADEMY',
  user_Academy_id: record.user_Academy_id,
  studentUserId: null,
  user: {
    id: record.academy_user.user.id,
    name: record.academy_user.user.name,
    email: record.academy_user.user.email,
  },
  course: {
    id: record.course.id,
    Name: record.course.Name,
    Description: record.course.Description,
  },
});

const mapSchoolEnrollment = (record) => ({
  enrollmentType: 'SCHOOL',
  user_Academy_id: null,
  studentUserId: record.Student_id,
  user: {
    id: record.user.id,
    name: record.user.name,
    email: record.user.email,
  },
  course: {
    id: record.course.id,
    Name: record.course.Name,
    Description: record.course.Description,
  },
});

export const createEnrollment = async (orgId, orgRole, data) => {
  const normalizedOrgRole = ensureOrganizationRole(orgRole);
  const course = await ensureCourseBelongsToOrg(orgId, data.Course_id);

  if (normalizedOrgRole === 'ACADEMY') {
    if (!data.user_Academy_id) {
      throw new AppError('user_Academy_id is required for ACADEMY organizations', 400);
    }

    const academyUser = await prisma.academy_user.findFirst({
      where: {
        user_academy_id: data.user_Academy_id,
        OrgId: orgId,
      },
    });

    if (!academyUser) {
      throw new AppError('Academy user not found', 404);
    }

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        user_Academy_id_Course_id: {
          user_Academy_id: data.user_Academy_id,
          Course_id: data.Course_id,
        },
      },
    });

    if (existingEnrollment) {
      throw new AppError('User is already enrolled in this course', 409);
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        user_Academy_id: data.user_Academy_id,
        Course_id: data.Course_id,
      },
      include: enrollmentInclude,
    });

    return mapAcademyEnrollment(enrollment);
  }

  if (!data.studentUserId) {
    throw new AppError('studentUserId is required for SCHOOL organizations', 400);
  }

  const student = await prisma.student.findFirst({
    where: {
      Student_id: data.studentUserId,
      OrgId: orgId,
    },
  });

  if (!student) {
    throw new AppError('Student not found', 404);
  }

  if (student.Course_id) {
    throw new AppError('Student is already enrolled in a course', 409);
  }

  const updatedStudent = await prisma.student.update({
    where: { Student_id: data.studentUserId },
    data: { Course_id: course.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, Name: true, Description: true, Thumbnail: true } },
    },
  });

  return mapSchoolEnrollment(updatedStudent);
};

export const getAllEnrollments = async (orgId, orgRole) => {
  const normalizedOrgRole = ensureOrganizationRole(orgRole);

  if (normalizedOrgRole === 'ACADEMY') {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        academy_user: { OrgId: orgId },
        course: { Org_id: orgId },
      },
      include: enrollmentInclude,
    });

    return enrollments.map(mapAcademyEnrollment);
  }

  const students = await prisma.student.findMany({
    where: {
      OrgId: orgId,
      Course_id: { not: null },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, Name: true, Description: true, Thumbnail: true } },
    },
  });

  return students.map(mapSchoolEnrollment);
};

export const getEnrollmentsByCourse = async (orgId, orgRole, courseId) => {
  const normalizedOrgRole = ensureOrganizationRole(orgRole);
  await ensureCourseBelongsToOrg(orgId, courseId);

  if (normalizedOrgRole === 'ACADEMY') {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        Course_id: courseId,
        academy_user: { OrgId: orgId },
      },
      include: enrollmentInclude,
    });

    return enrollments.map(mapAcademyEnrollment);
  }

  const students = await prisma.student.findMany({
    where: {
      OrgId: orgId,
      Course_id: courseId,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, Name: true, Description: true, Thumbnail: true } },
    },
  });

  return students.map(mapSchoolEnrollment);
};

export const getEnrollmentsByUser = async (orgId, orgRole, userId) => {
  const normalizedOrgRole = ensureOrganizationRole(orgRole);

  if (normalizedOrgRole === 'ACADEMY') {
    const academyUser = await prisma.academy_user.findFirst({
      where: {
        user_academy_id: userId,
        OrgId: orgId,
      },
    });
    if (!academyUser) throw new AppError('Academy user not found', 404);

    const enrollments = await prisma.enrollment.findMany({
      where: {
        user_Academy_id: userId,
        course: { Org_id: orgId },
      },
      include: enrollmentInclude,
    });

    return enrollments.map(mapAcademyEnrollment);
  }

  const student = await prisma.student.findFirst({
    where: {
      Student_id: userId,
      OrgId: orgId,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, Name: true, Description: true, Thumbnail: true } },
    },
  });

  if (!student) {
    throw new AppError('Student not found', 404);
  }

  if (!student.Course_id || !student.course) {
    return [];
  }

  return [mapSchoolEnrollment(student)];
};

export const deleteEnrollment = async (orgId, orgRole, userId, courseId) => {
  const normalizedOrgRole = ensureOrganizationRole(orgRole);
  await ensureCourseBelongsToOrg(orgId, courseId);

  if (normalizedOrgRole === 'ACADEMY') {
    const academyUser = await prisma.academy_user.findFirst({
      where: {
        user_academy_id: userId,
        OrgId: orgId,
      },
    });

    if (!academyUser) {
      throw new AppError('Academy user not found', 404);
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        user_Academy_id_Course_id: {
          user_Academy_id: userId,
          Course_id: courseId,
        },
      },
      include: enrollmentInclude,
    });

    if (!enrollment || enrollment.academy_user.OrgId !== orgId) {
      throw new AppError('Enrollment not found', 404);
    }

    await prisma.enrollment.delete({
      where: {
        user_Academy_id_Course_id: {
          user_Academy_id: userId,
          Course_id: courseId,
        },
      },
    });

    return mapAcademyEnrollment(enrollment);
  }

  const student = await prisma.student.findFirst({
    where: {
      Student_id: userId,
      OrgId: orgId,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, Name: true, Description: true, Thumbnail: true } },
    },
  });

  if (!student) {
    throw new AppError('Student not found', 404);
  }

  if (!student.Course_id || student.Course_id !== courseId || !student.course) {
    throw new AppError('Enrollment not found', 404);
  }

  const previousEnrollment = mapSchoolEnrollment(student);

  await prisma.student.update({
    where: { Student_id: userId },
    data: { Course_id: null },
  });

  return previousEnrollment;
};

/**
 * تهيئة الالتحاق مع التعامل مع الدفع للكورسات المدفوعة
 * للطلاب الأكاديميين فقط
 * @param {number} orgId - معرف المنظمة
 * @param {number} userId - معرف الطالب الأكاديمي
 * @param {number} courseId - معرف الكورس
 * @returns {Promise<object>} النتيجة {enrolled: boolean, checkoutUrl?: string, message: string}
 */
export const initiateEnrollmentWithPayment = async (orgId, userId, courseId) => {
  const course = await ensureCourseBelongsToOrg(orgId, courseId);

  // تحقق من وجود الطالب الأكاديمي
  const academyUser = await prisma.academy_user.findFirst({
    where: {
      user_academy_id: userId,
      OrgId: orgId,
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });

  if (!academyUser) {
    throw new AppError('Academy user not found', 404);
  }

  // تحقق من عدم وجود التحاق مسبق
  const existingEnrollment = await prisma.enrollment.findUnique({
    where: {
      user_Academy_id_Course_id: {
        user_Academy_id: userId,
        Course_id: courseId,
      },
    },
  });

  if (existingEnrollment) {
    return {
      enrolled: true,
      message: 'User is already enrolled in this course',
    };
  }

  // إذا كان الكورس مجاني، التحق مباشرة
  if (!course.isPaid || !course.price || course.price === 0) {
    const enrollment = await prisma.enrollment.create({
      data: {
        user_Academy_id: userId,
        Course_id: courseId,
      },
      include: enrollmentInclude,
    });

    return {
      enrolled: true,
      message: 'Enrolled successfully (free course)',
      enrollment: mapAcademyEnrollment(enrollment),
    };
  }

  // إذا كان الكورس مدفوع، نحتاج لعملية دفع
  // ننشئ سجل دفع معلق
  const payment = await prisma.student_course_payment.upsert({
    where: {
      uq_student_course_payment: {
        user_Academy_id: userId,
        Course_id: courseId,
      },
    },
    update: {
      status: 'PENDING',
      amount: course.price,
    },
    create: {
      user_Academy_id: userId,
      Course_id: courseId,
      amount: course.price,
      paymentMethod: 'STRIPE',
      status: 'PENDING',
    },
  });

  return {
    enrolled: false,
    requiresPayment: true,
    paymentId: payment.id,
    amount: course.price,
    message: 'Course requires payment. Redirecting to checkout...',
  };
};

