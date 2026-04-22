import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { hashPassword } from '../utils/hashPassword.js';
import { encryptPassword } from '../utils/passwordCrypto.js';

const resolveRequesterOrgId = async (tokenUser) => {
  const directOrgId = Number(tokenUser?.orgId ?? tokenUser?.organizationId ?? tokenUser?.OrgId ?? tokenUser?.Org_id);

  if (Number.isInteger(directOrgId) && directOrgId > 0) {
    return directOrgId;
  }

  const userId = Number(tokenUser?.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  const role = String(tokenUser?.role ?? '').trim().toUpperCase();

  if (role === 'TEACHER') {
    const teacher = await prisma.teacher.findUnique({
      where: { Teacher_id: userId },
      select: { OrgId: true },
    });

    return teacher?.OrgId ?? null;
  }

  if (role === 'STUDENT') {
    const student = await prisma.student.findUnique({
      where: { Student_id: userId },
      select: { OrgId: true },
    });

    if (student?.OrgId) {
      return student.OrgId;
    }

    const academyUser = await prisma.academy_user.findUnique({
      where: { user_academy_id: userId },
      select: { OrgId: true },
    });

    return academyUser?.OrgId ?? null;
  }

  if (role === 'ACADEMY' || role === 'SCHOOL') {
    return userId;
  }

  return null;
};

const teacherSelect = {
  Teacher_id: true,
  OrgId: true,
  Work: true,
  specialization: true,
  bio: true,
  createdAt: true,
  subject: {
    select: {
      name: true,
    },
  },
  _count: {
    select: {
      subject: true,
    },
  },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      gender: true,
      age: true,
      address: true,
    },
  },
};

const teacherSelfSelect = {
  ...teacherSelect,
  organization: {
    select: {
      id: true,
      Name: true,
      Role: true,
      subdomain: true,
      status: true,
    },
  },
};

const teacherSubjectSelect = {
  Teacher_id: true,
  name: true,
};

const attachTeacherSubjects = (teachers, subjects = []) => {
  const grouped = subjects.reduce((acc, subject) => {
    const teacherId = Number(subject?.Teacher_id || 0);
    if (!teacherId) {
      return acc;
    }

    const bucket = acc.get(teacherId) || [];
    bucket.push(String(subject?.name || '').trim());
    acc.set(teacherId, bucket);
    return acc;
  }, new Map());

  return teachers.map((teacher) => ({
    ...teacher,
    subjects: (grouped.get(Number(teacher.Teacher_id)) || []).filter(Boolean),
  }));
};

const serializeTeacher = (teacher) => ({
  id: teacher.Teacher_id,
  userId: teacher.Teacher_id,
  organizationId: teacher.OrgId,
  name: teacher?.user?.name || '',
  email: teacher?.user?.email || '',
  work: teacher.Work,
  specialization: teacher.specialization,
  bio: teacher.bio,
  createdAt: teacher.createdAt,
  age: teacher?.user?.age ?? null,
  gender: teacher?.user?.gender ?? null,
  address: teacher?.user?.address ?? null,
  avatarUrl: null,
  subjectCount: Number(teacher?._count?.subject || 0),
  subjects: Array.isArray(teacher?.subjects)
    ? teacher.subjects
      .map((subject) => {
        if (typeof subject === 'string') return subject;
        if (subject && typeof subject === 'object') return subject.name || subject.Name || '';
        return '';
      })
      .map((value) => String(value || '').trim())
      .filter(Boolean)
    : Array.isArray(teacher?.subject)
      ? teacher.subject
        .map((subject) => String(subject?.name || '').trim())
        .filter(Boolean)
      : [],
  user: {
    id: teacher?.user?.id,
    name: teacher?.user?.name || '',
    email: teacher?.user?.email || '',
    gender: teacher?.user?.gender ?? null,
    age: teacher?.user?.age ?? null,
    address: teacher?.user?.address ?? null,
  },
});

const serializeTeacherSelfProfile = (teacher) => ({
  ...serializeTeacher(teacher),
  organization: teacher.organization
    ? {
        id: teacher.organization.id,
        name: teacher.organization.Name,
        role: teacher.organization.Role,
        subdomain: teacher.organization.subdomain,
        status: teacher.organization.status,
      }
    : null,
});

const ensureTeacherExists = async (teacherId) => {
  const teacher = await prisma.teacher.findUnique({
    where: { Teacher_id: teacherId },
    select: teacherSelfSelect,
  });

  if (!teacher) {
    throw new AppError('Teacher profile not found', 404);
  }

  return teacher;
};

const ensureTeacherBelongsToOrg = async (orgId, teacherId) => {
  const teacher = await prisma.teacher.findFirst({
    where: { Teacher_id: teacherId, OrgId: orgId },
    select: teacherSelect,
  });

  if (!teacher) {
    throw new AppError('Teacher not found or does not belong to your organization', 404);
  }

  return teacher;
};

export const createTeacher = async (orgId, data) => {
  console.info('Creating teacher', { orgId, email: data.email });

  const existingEmail = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  });

  if (existingEmail) {
    console.warn('Teacher creation rejected due to duplicate email', { orgId, email: data.email });
    throw new AppError('User email already exists', 409);
  }

  const passwordHashed = await hashPassword(data.password);
  const passwordEncrypted = encryptPassword(data.password);

  let teacher;

  try {
    teacher = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHashed,
          passwordEncrypted,
          role: 'TEACHER',
          age: data.age ?? null,
          gender: data.gender ?? null,
          address: data.address ?? null,
          academy_user: {
            create: {
              OrgId: orgId,
            },
          },
          teacher: {
            create: {
              OrgId: orgId,
              Work: data.work ?? null,
              specialization: data.specialization ?? null,
              bio: data.bio ?? null,
            },
          },
        },
        select: {
          teacher: {
            select: teacherSelect,
          },
        },
      });

      return user.teacher;
    });
  } catch (error) {
    console.error('Teacher creation failed', { orgId, email: data.email, error: error.message });
    throw error;
  }

  console.info('Teacher created successfully', { orgId, email: data.email, teacherId: teacher.Teacher_id });

  return serializeTeacher(teacher);
};

export const getTeachers = async (requester) => {
  const orgId = Number.isInteger(Number(requester)) && Number(requester) > 0
    ? Number(requester)
    : await resolveRequesterOrgId(requester);

  if (!Number.isInteger(orgId) || orgId <= 0) {
    throw new AppError('Unable to resolve organization for teacher listing', 403);
  }

  const teachers = await prisma.teacher.findMany({
    where: { OrgId: orgId },
    select: teacherSelect,
    orderBy: { Teacher_id: 'asc' },
  });

  const teacherIds = teachers.map((teacher) => teacher.Teacher_id);
  const subjects = teacherIds.length
    ? await prisma.subject.findMany({
        where: { Teacher_id: { in: teacherIds } },
        select: teacherSubjectSelect,
        orderBy: { id: 'asc' },
      })
    : [];

  return attachTeacherSubjects(teachers, subjects).map(serializeTeacher);
};

export const getTeacherById = async (orgId, teacherId) => {
  const teacher = await ensureTeacherBelongsToOrg(orgId, teacherId);
  const subjects = await prisma.subject.findMany({
    where: { Teacher_id: teacherId },
    select: teacherSubjectSelect,
    orderBy: { id: 'asc' },
  });

  return serializeTeacher({
    ...teacher,
    subjects,
  });
};

export const getTeacherByIdForRequester = async (requester, teacherId) => {
  const orgId = Number.isInteger(Number(requester)) && Number(requester) > 0
    ? Number(requester)
    : await resolveRequesterOrgId(requester);

  if (!Number.isInteger(orgId) || orgId <= 0) {
    throw new AppError('Unable to resolve organization for teacher lookup', 403);
  }

  return getTeacherById(orgId, teacherId);
};

export const updateTeacher = async (orgId, teacherId, data) => {
  await ensureTeacherBelongsToOrg(orgId, teacherId);

  const userData = {
    age: data.age ?? undefined,
    gender: data.gender ?? undefined,
    address: data.address ?? undefined,
  };

  if (data.password !== undefined) {
    userData.passwordHashed = await hashPassword(data.password);
    userData.passwordEncrypted = encryptPassword(data.password);
  }

  const teacher = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: teacherId },
      data: userData,
    });

    return tx.teacher.update({
      where: { Teacher_id: teacherId },
      data: {
        Work: data.work ?? undefined,
        specialization: data.specialization ?? undefined,
        bio: data.bio ?? undefined,
      },
      select: teacherSelect,
    });
  });

  return serializeTeacher(teacher);
};

export const deleteTeacher = async (orgId, teacherId) => {
  await ensureTeacherBelongsToOrg(orgId, teacherId);

  await prisma.user.delete({ where: { id: teacherId } });

  return { id: teacherId };
};

export const getTeacherSubjects = async (orgId, teacherId) => {
  await ensureTeacherBelongsToOrg(orgId, teacherId);

  return prisma.subject.findMany({
    where: { Teacher_id: teacherId, course: { Org_id: orgId } },
    include: {
      course: { select: { id: true, Name: true } },
    },
    orderBy: { id: 'asc' },
  });
};

export const getTeacherLessons = async (orgId, teacherId) => {
  await ensureTeacherBelongsToOrg(orgId, teacherId);

  return prisma.lesson.findMany({
    where: {
      subject: { Teacher_id: teacherId, course: { Org_id: orgId } },
    },
    include: {
      subject: { select: { id: true, name: true } },
    },
    orderBy: { id: 'asc' },
  });
};

export const getMyTeacherProfile = async (teacherId) => {
  const teacher = await ensureTeacherExists(teacherId);
  return serializeTeacherSelfProfile(teacher);
};

export const getMyTeacherCourses = async (teacherId) => {
  const teacher = await ensureTeacherExists(teacherId);

  return prisma.course.findMany({
    where: {
      Org_id: teacher.OrgId,
    },
    select: {
      id: true,
      Name: true,
      GradeLevel: true,
      Description: true,
      Start: true,
      End: true,
      isPaid: true,
      price: true,
    },
    orderBy: {
      id: 'asc',
    },
  });
};

export const getMyTeacherSubjects = async (teacherId) => {
  await ensureTeacherExists(teacherId);

  return prisma.subject.findMany({
    where: { Teacher_id: teacherId },
    include: {
      course: {
        select: {
          id: true,
          Name: true,
          GradeLevel: true,
          Description: true,
          Org_id: true,
        },
      },
    },
    orderBy: { id: 'asc' },
  });
};

export const getMyTeacherLessons = async (teacherId, filters = {}) => {
  await ensureTeacherExists(teacherId);

  return prisma.lesson.findMany({
    where: {
      ...(filters.Subject_id ? { Subject_id: filters.Subject_id } : {}),
      subject: {
        Teacher_id: teacherId,
      },
    },
    include: {
      subject: {
        select: {
          id: true,
          name: true,
          Course_id: true,
          course: {
            select: {
              id: true,
              Name: true,
              GradeLevel: true,
            },
          },
        },
      },
    },
    orderBy: { id: 'asc' },
  });
};

export const getMyTeacherStudents = async (teacherId, filters = {}) => {
  const teacher = await ensureTeacherExists(teacherId);

  const teacherSubjects = await prisma.subject.findMany({
    where: {
      Teacher_id: teacherId,
      ...(filters.Subject_id ? { id: filters.Subject_id } : {}),
      ...(filters.Course_id ? { Course_id: filters.Course_id } : {}),
    },
    select: {
      id: true,
      name: true,
      Course_id: true,
      course: {
        select: {
          id: true,
          Name: true,
        },
      },
    },
  });

  if (teacherSubjects.length === 0) {
    return [];
  }

  const courseIds = [...new Set(teacherSubjects.map((subject) => subject.Course_id))];
  const subjectsByCourse = teacherSubjects.reduce((acc, subject) => {
    const bucket = acc.get(subject.Course_id) || [];
    bucket.push({ id: subject.id, name: subject.name });
    acc.set(subject.Course_id, bucket);
    return acc;
  }, new Map());

  const courseNameById = teacherSubjects.reduce((acc, subject) => {
    if (!acc.has(subject.Course_id)) {
      acc.set(subject.Course_id, subject.course?.Name || null);
    }
    return acc;
  }, new Map());

  const enrolledUsers = await prisma.enrollment.findMany({
    where: {
      Course_id: { in: courseIds },
      academy_user: {
        OrgId: teacher.OrgId,
        user: {
          role: 'STUDENT',
        },
      },
    },
    select: {
      Course_id: true,
      academy_user: {
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              age: true,
              gender: true,
              address: true,
              student: {
                select: {
                  Student_id: true,
                  GradeLevel: true,
                  AcademicStatus: true,
                  DOB: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const courseAssignedStudents = await prisma.student.findMany({
    where: {
      OrgId: teacher.OrgId,
      Course_id: { in: courseIds },
    },
    select: {
      Course_id: true,
      Student_id: true,
      GradeLevel: true,
      AcademicStatus: true,
      DOB: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          age: true,
          gender: true,
          address: true,
        },
      },
    },
  });

  const studentsById = new Map();

  const addStudentEntry = ({ courseId, user, student }) => {
    if (!user || !student) {
      return;
    }

    const current = studentsById.get(student.Student_id) || {
      id: student.Student_id,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
        address: user.address,
      },
      student: {
        gradeLevel: student.GradeLevel,
        academicStatus: student.AcademicStatus,
        dob: student.DOB,
      },
      courses: [],
    };

    const isCourseAlreadyAdded = current.courses.some((course) => course.id === courseId);
    if (!isCourseAlreadyAdded) {
      current.courses.push({
        id: courseId,
        name: courseNameById.get(courseId) || null,
        subjects: subjectsByCourse.get(courseId) || [],
      });
    }

    studentsById.set(student.Student_id, current);
  };

  for (const enrollment of enrolledUsers) {
    const user = enrollment.academy_user?.user;
    const student = user?.student;
    addStudentEntry({
      courseId: enrollment.Course_id,
      user,
      student,
    });
  }

  for (const studentRow of courseAssignedStudents) {
    addStudentEntry({
      courseId: studentRow.Course_id,
      user: studentRow.user,
      student: {
        Student_id: studentRow.Student_id,
        GradeLevel: studentRow.GradeLevel,
        AcademicStatus: studentRow.AcademicStatus,
        DOB: studentRow.DOB,
      },
    });
  }

  const students = Array.from(studentsById.values());

  if (!filters.search) {
    return students;
  }

  const needle = String(filters.search).trim().toLowerCase();
  return students.filter((entry) => {
    const name = String(entry.user?.name || '').toLowerCase();
    const email = String(entry.user?.email || '').toLowerCase();
    return name.includes(needle) || email.includes(needle);
  });
};
