import prisma from "../utils/prisma.js";
import { generateUserCredentials } from "../utils/generateUsersAccount.js";
import { hashPassword } from "../utils/hashPassword.js";
import { decryptPassword, encryptPassword } from "../utils/passwordCrypto.js";
import AppError from "../utils/appError.js";
import { ensureCourseForGradeLevel } from "./courseService.js";
import { computeGradeLevelFromDob, computeGradeLevelFromBirthYear, parseDobInput, computeAgeFromDob } from "./gradePlacementService.js";
import { getOrCreateSchoolSettings } from "./schoolSettingsService.js";

const isSchoolStudent = (data) => {
  const role = String(data.role || '').trim().toUpperCase();
  const orgRole = String(data.orgRole || '').trim().toUpperCase();
  return role === 'STUDENT' && orgRole === 'SCHOOL';
};

const normalizeNationalId = (value) => String(value || '').trim().replace(/[\s-]/g, '');

const buildDomainFromSubdomain = (subdomain) => {
  const sanitized = String(subdomain || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');

  if (!sanitized) {
    return null;
  }

  return `${sanitized}.com`;
};

const prepareSchoolPlacement = async (data, tx = prisma, isImport = false) => {
  if (!isSchoolStudent(data)) {
    return {
      dob: data.dob ? parseDobInput(data.dob) : null,
      gradeLevel: data.gradeLevel ?? null,
      courseId: data.courseId ?? null,
      academicStatus: 'ACTIVE',
    };
  }

  const dob = parseDobInput(data.dob);
  if (!dob) {
    throw new AppError('DOB is required for school student creation', 400);
  }

  const settings = await getOrCreateSchoolSettings(data.orgId, tx);
  // For imports, use birth year only to keep cohorts unified. For individual creation, use full DOB calculation.
  const gradeLevel = isImport 
    ? computeGradeLevelFromBirthYear(dob, settings)
    : computeGradeLevelFromDob(dob, settings);
  const course = await ensureCourseForGradeLevel(data.orgId, gradeLevel, tx);

  return {
    dob,
    gradeLevel,
    courseId: course.id,
    academicStatus: 'ACTIVE',
  };
};

const buildRoleNested = (data) => {
  const role = String(data.role || '').toUpperCase();
  const orgRole = String(data.orgRole || '').trim().toUpperCase();
  if (role === 'TEACHER') {
    return {
      teacher: {
        create: {
          OrgId: data.orgId,
          Work: data.work ?? null,
        },
      },
    };
  }
  if (role === 'PARENT') {
    return { parent: { create: { Work: data.work ?? null } } };
  }
  if (role ==='STUDENT' && orgRole === 'SCHOOL') {
    return {
      student: {
        create: {
          OrgId: data.orgId,
          Parent_id: data.parentId ?? null,
          Course_id: data.courseId ?? null,
          DOB: data.dob ? new Date(data.dob) : null,
          GradeLevel: data.gradeLevel ?? null,
          AcademicStatus: data.academicStatus ?? 'ACTIVE',
        },
      },
    };
  }
  return {};
};

const buildAcademyUserNested= (data)=>{
  const role = String(data.role || '').trim().toUpperCase();
  const organizationType = String(data.orgRole || '').trim().toUpperCase();

  if (role === 'STUDENT' && organizationType === 'ACADEMY') {
    // Create academy_user with optional enrollment if courseId provided
    const academyUserData = {
      OrgId: data.orgId,
      DOB: data.dob ? new Date(data.dob) : null,
    };

    // If courseId is provided AND enrollNow flag is true, create enrollment
    // This prevents accidental automatic enrollment when creating users.
    if (data.courseId && data.enrollNow === true) {
      academyUserData.enrollment = {
        create: [
          { Course_id: Number(data.courseId) }
        ]
      };
    }

    return { academy_user: { create: academyUserData } };
  }

  return {};
};

const CSV_DELIMITER = ';';

const toCsvValue = (value) => {
  const normalized = value === undefined || value === null ? "" : String(value);
  const escaped = normalized.replace(/"/g, '""');
  return `"${escaped}"`;
};

const createParentForNationalId = async (nationalId, domain) => {
  const safeNationalId = String(nationalId || "").trim();
  const parentName = `Parent ${safeNationalId}`;
  const { email, password } = await generateUserCredentials(parentName, domain);
  const passwordHashed = await hashPassword(password);
  const passwordEncrypted = encryptPassword(password);

  const createdParentUser = await prisma.user.create({
    data: {
      name: parentName,
      email,
      passwordHashed,
      passwordEncrypted,
      role: "PARENT",
      parent: {
        create: {
          Work: null,
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  await prisma.$executeRawUnsafe(
    "UPDATE parent SET nationalId = ? WHERE Parent_id = ?",
    safeNationalId,
    createdParentUser.id,
  );

  return {
    parentId: createdParentUser.id,
    nationalId: safeNationalId,
    email,
    password,
  };
};

const resolveParentIdByNationalId = async (parentNationalId) => {
  const normalized = normalizeNationalId(parentNationalId);
  if (!normalized) {
    return null;
  }

  const parent = await prisma.parent.findUnique({
    where: { nationalId: normalized },
    select: { Parent_id: true },
  });

  return parent?.Parent_id ? Number(parent.Parent_id) : null;
};

const resolveOrCreateParentId = async ({ parentNationalId, orgId, domain }) => {
  const normalized = normalizeNationalId(parentNationalId);
  if (!normalized) {
    return null;
  }

  const existingParentId = await resolveParentIdByNationalId(normalized);
  if (existingParentId) {
    return {
      parentId: existingParentId,
      parentLinkStatus: 'existing',
    };
  }

  let resolvedDomain = domain;
  if (!resolvedDomain) {
    const subdomain = await getOrganizationSubdomain(orgId);
    resolvedDomain = buildDomainFromSubdomain(subdomain);
  }

  if (!resolvedDomain) {
    throw new AppError('Unable to create parent account from national ID: organization subdomain is missing', 400);
  }

  try {
    const createdParent = await createParentForNationalId(normalized, resolvedDomain);
    return {
      parentId: Number(createdParent.parentId),
      parentLinkStatus: 'created',
    };
  } catch (_error) {
    const fallbackParentId = await resolveParentIdByNationalId(normalized);
    if (fallbackParentId) {
      return {
        parentId: fallbackParentId,
        parentLinkStatus: 'existing',
      };
    }
    throw new AppError(`Parent with nationalId ${normalized} was not found and could not be auto-created`, 400);
  }
};

export const generateUsers = async (data, domain) => {
  const createdUsers = [];
  const createdParents = [];
  const skippedUsers = [];
  const batchEmails = new Set();
  const preparedRows = [];

  for (const user of data) {
    let finalEmail = user.email ? String(user.email).trim().toLowerCase() : null;
    let finalPassword = user.password ? String(user.password) : null;

    if (!finalEmail || !finalPassword) {
      const generatedCredentials = await generateUserCredentials(user.name, domain);

      if (!finalEmail) {
        finalEmail = generatedCredentials.email;
      }

      if (!finalPassword) {
        finalPassword = generatedCredentials.password;
      }
    }

    if (batchEmails.has(finalEmail)) {
      skippedUsers.push({
        name: user.name,
        email: finalEmail,
        reason: 'Duplicate email in uploaded file',
      });
      continue;
    }

    batchEmails.add(finalEmail);
    preparedRows.push({
      ...user,
      finalEmail,
      finalPassword,
    });
  }

  const existingUsers = preparedRows.length
    ? await prisma.user.findMany({
      where: {
        email: {
          in: preparedRows.map((row) => row.finalEmail),
        },
      },
      select: {
        email: true,
      },
    })
    : [];

  const existingEmails = new Set(existingUsers.map((existingUser) => String(existingUser.email).toLowerCase()));

  const parentNationalIdsInSheet = new Set(
    preparedRows
      .filter((row) => row.role === 'STUDENT' && row.parentNationalId)
      .map((row) => String(row.parentNationalId))
  );

  const parentIdByNationalId = new Map();

  if (parentNationalIdsInSheet.size) {
    const nationalIds = [...parentNationalIdsInSheet];
    const placeholders = nationalIds.map(() => '?').join(',');
    const parentRows = await prisma.$queryRawUnsafe(
      `SELECT Parent_id, nationalId FROM parent WHERE nationalId IN (${placeholders})`,
      ...nationalIds,
    );

    for (const row of parentRows) {
      parentIdByNationalId.set(String(row.nationalId), Number(row.Parent_id));
    }
  }

  for (const user of preparedRows) {
    if (existingEmails.has(user.finalEmail)) {
      skippedUsers.push({
        name: user.name,
        email: user.finalEmail,
        reason: 'Email already exists in system',
      });
      continue;
    }

    let resolvedParentId = user.parentNationalId ? parentIdByNationalId.get(String(user.parentNationalId)) : null;

    if (user.role === 'STUDENT' && user.parentNationalId && !resolvedParentId) {
      try {
        const createdParent = await createParentForNationalId(user.parentNationalId, domain);
        resolvedParentId = createdParent.parentId;
        parentIdByNationalId.set(String(createdParent.nationalId), Number(createdParent.parentId));
        createdParents.push(createdParent);
      } catch (_error) {
        const fallbackRows = await prisma.$queryRawUnsafe(
          "SELECT Parent_id, nationalId FROM parent WHERE nationalId = ? LIMIT 1",
          String(user.parentNationalId),
        );

        const fallbackParentId = Array.isArray(fallbackRows) && fallbackRows[0]
          ? Number(fallbackRows[0].Parent_id)
          : null;

        if (!fallbackParentId) {
          skippedUsers.push({
            name: user.name,
            email: user.finalEmail,
            reason: `Parent with nationalId ${user.parentNationalId} was not found and could not be auto-created`,
          });
          continue;
        }

        resolvedParentId = fallbackParentId;
        parentIdByNationalId.set(String(user.parentNationalId), fallbackParentId);
      }
    }

    try {
      const schoolPlacement = await prepareSchoolPlacement(user, prisma, true);
      const userPayload = {
        ...user,
        parentId: resolvedParentId ?? null,
        dob: schoolPlacement.dob,
        gradeLevel: schoolPlacement.gradeLevel,
        courseId: schoolPlacement.courseId ?? user.courseId ?? null,
        academicStatus: schoolPlacement.academicStatus,
      };

      const passwordHashed = await hashPassword(user.finalPassword);
      const passwordEncrypted = encryptPassword(user.finalPassword);

      // compute age from dob if available
      const finalAge = userPayload.dob ? computeAgeFromDob(userPayload.dob) : userPayload.age ?? null;

      const createdUser = await prisma.user.create({
        data: {
          name: userPayload.name,
          email: user.finalEmail,
          passwordHashed,
          passwordEncrypted,
          role: userPayload.role,
          age: finalAge,
          gender: userPayload.gender,
          address: userPayload.address,
          ...buildRoleNested(userPayload),
          ...buildAcademyUserNested(userPayload),
        },
        include: {
          student: {
            select: {
              DOB: true,
              GradeLevel: true,
              Course_id: true,
              AcademicStatus: true,
            },
          },
          academy_user: {
            select: {
              DOB: true,
            },
          },
        },
      });

      createdUsers.push({
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        password: user.finalPassword,
        role: createdUser.role,
        age: createdUser.age,
        gender: createdUser.gender,
        address: createdUser.address,
        dob: createdUser.student?.DOB ?? createdUser.academy_user?.DOB ?? null,
        gradeLevel: createdUser.student?.GradeLevel ?? null,
        courseId: createdUser.student?.Course_id ?? null,
        academicStatus: createdUser.student?.AcademicStatus ?? null,
      });
    } catch (error) {
      skippedUsers.push({
        name: user.name,
        email: user.finalEmail,
        reason: error?.message || 'Row processing failed',
      });
    }
  }

  return {
    createdUsers,
    createdParents,
    skippedUsers,
  };
};


export const addUser=async(data)=>{
const isUserExist= await prisma.user.findUnique ({
    where:{
    email:data.email
    }
});

if (isUserExist)  { 
    throw new Error('user email already exists')
}

const resolvedParentInfo = data.role === 'STUDENT' && data.parentNationalId
  ? await resolveOrCreateParentId({
    parentNationalId: data.parentNationalId,
    orgId: data.orgId,
  })
  : null;

const resolvedParentId = resolvedParentInfo?.parentId ?? (data.parentId ?? null);

const placement = await prepareSchoolPlacement(data);
const payload = {
  ...data,
  parentId: resolvedParentId,
  dob: placement.dob,
  gradeLevel: placement.gradeLevel,
  courseId: placement.courseId ?? data.courseId ?? null,
  academicStatus: placement.academicStatus,
};

const hashedPassword= await hashPassword(data.password);
const passwordEncrypted = encryptPassword(data.password);
const user=await prisma.user.create({
    data:{
  name:payload.name,
   age:payload.age,
  email:payload.email,
  passwordHashed: hashedPassword,
  passwordEncrypted,
  gender:payload.gender,
  role:payload.role,
  address:payload.address,
  ...buildRoleNested(payload),
  ...buildAcademyUserNested(payload),
    }
});

return {
  ...user,
  parentLinkStatus: resolvedParentInfo?.parentLinkStatus ?? null,
};

}

export const addUserWithGeneratedCredentials = async (data, domain) => {
  const { email, password } = await generateUserCredentials(data.name, domain);
  const passwordHashed = await hashPassword(password);
  const passwordEncrypted = encryptPassword(password);
  const resolvedParentInfo = data.role === 'STUDENT' && data.parentNationalId
    ? await resolveOrCreateParentId({
      parentNationalId: data.parentNationalId,
      orgId: data.orgId,
      domain,
    })
    : null;

  const resolvedParentId = resolvedParentInfo?.parentId ?? (data.parentId ?? null);

  const placement = await prepareSchoolPlacement(data);
  const payload = {
    ...data,
    parentId: resolvedParentId,
    dob: placement.dob,
    gradeLevel: placement.gradeLevel,
    courseId: placement.courseId ?? data.courseId ?? null,
    academicStatus: placement.academicStatus,
  };

  const createdUser = await prisma.user.create({
    data: {
      name: payload.name,
      email,
      passwordHashed,
      passwordEncrypted,
      role: payload.role,
      age: payload.age,
      gender: payload.gender,
      address: payload.address,
      ...buildRoleNested(payload),
      ...buildAcademyUserNested(payload),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      age: true,
      gender: true,
      address: true,
      academy_user: {
        select: {
          DOB: true,
        },
      },
    },
  });

  return {
    user: createdUser,
    credentials: {
      email,
      password,
    },
    parentLinkStatus: resolvedParentInfo?.parentLinkStatus ?? null,
  };
};

const buildOrganizationUsersWhere = (orgId, orgRole, orgSubdomain = null, filters = {}) => {
  const normalizedOrgRole = String(orgRole || '').trim().toUpperCase();
  const { courseId } = filters || {};

  if (normalizedOrgRole === 'ACADEMY') {
    // For academy: if courseId provided, filter by enrollment; otherwise show all
    if (courseId) {
      return {
        OR: [
          {
            role: 'STUDENT',
            academy_user: {
              is: {
                OrgId: orgId,
                enrollment: { some: { Course_id: Number(courseId) } },
              },
            },
          },
          { role: 'TEACHER', teacher: { is: { OrgId: orgId } } },
        ],
      };
    }

    // No courseId filter: return all academy students and teachers
    return {
      OR: [
        { role: 'STUDENT', academy_user: { is: { OrgId: orgId } } },
        { role: 'TEACHER', teacher: { is: { OrgId: orgId } } },
      ],
    };
  }

  // SCHOOL logic
  const orgDomain = orgSubdomain ? `@${String(orgSubdomain).toLowerCase()}.com` : null;

  if (courseId) {
    // Filter by Course_id for school students
    return {
      OR: [
        { role: 'STUDENT', student: { is: { OrgId: orgId, Course_id: Number(courseId) } } },
        { role: 'TEACHER', teacher: { is: { OrgId: orgId } } },
        { role: 'PARENT', parent: { is: { student: { some: { OrgId: orgId, Course_id: Number(courseId) } } } } },
        ...(orgDomain ? [{ role: 'PARENT', email: { endsWith: orgDomain } }] : []),
      ],
    };
  }

  // No courseId filter: return all school users
  return {
    OR: [
      { role: 'STUDENT', student: { is: { OrgId: orgId } } },
      { role: 'TEACHER', teacher: { is: { OrgId: orgId } } },
      { role: 'PARENT', parent: { is: { student: { some: { OrgId: orgId } } } } },
      ...(orgDomain ? [{ role: 'PARENT', email: { endsWith: orgDomain } }] : []),
    ],
  };
};

const getOrganizationSubdomain = async (orgId) => {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { subdomain: true },
  });

  return org?.subdomain || null;
};

const findOrganizationUserById = async (id, orgId, orgRole, orgSubdomain) => {
  return prisma.user.findFirst({
    where: {
      id,
      ...buildOrganizationUsersWhere(orgId, orgRole, orgSubdomain),
    },
    select: { id: true, email: true },
  });
};

export const getAllUsers = async (orgId, orgRole, filters = {}) => {
  const normalizedOrgRole = String(orgRole || '').trim().toUpperCase();
  const orgSubdomain = await getOrganizationSubdomain(orgId);

  const baseSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    age: true,
    gender: true,
    address: true,
    passwordEncrypted: true,
    academy_user: {
      select: {
        DOB: true,
      },
    },
  };

  // Include student profile for SCHOOL orgs (has AcademicStatus, etc.)
  if (normalizedOrgRole === 'SCHOOL') {
    baseSelect.student = {
      select: {
        Parent_id: true,
        Course_id: true,
        AcademicStatus: true,
      },
    };
  }

  // Include academy_user.AcademicStatus for ACADEMY orgs
  if (normalizedOrgRole === 'ACADEMY') {
    baseSelect.academy_user = {
      select: {
        DOB: true,
        AcademicStatus: true,
      },
    };
  }

  const users = await prisma.user.findMany({
    where: buildOrganizationUsersWhere(orgId, orgRole, orgSubdomain, filters),
    select: baseSelect,
  });

  return users.map((user) => {
    let decryptedPassword = null;

    try {
      decryptedPassword = decryptPassword(user.passwordEncrypted);
    } catch (_error) {
      decryptedPassword = null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      age: user.age,
      gender: user.gender,
      address: user.address,
      password: decryptedPassword || '-',
      student: user.student || null,
      status: user.student?.AcademicStatus || user.academy_user?.AcademicStatus || null,
      academy_user: user.academy_user,
    };
  });
};

export const updateUser = async (id, data, orgId, orgRole) => {
  const orgSubdomain = await getOrganizationSubdomain(orgId);
  const user = await findOrganizationUserById(id, orgId, orgRole, orgSubdomain);
  if (!user) {
    throw new Error('user not found');
  }

  if (data.email && data.email !== user.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email: data.email } });
    if (emailTaken) {
      throw new Error('user email already exists');
    }
  }

  const updateData = {};
  if (data.name !== undefined)    updateData.name    = data.name;
  if (data.age !== undefined)     updateData.age     = data.age;
  if (data.email !== undefined)   updateData.email   = data.email;
  if (data.gender !== undefined)  updateData.gender  = data.gender;
  if (data.role !== undefined)    updateData.role    = data.role;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.password !== undefined) {
    updateData.passwordHashed = await hashPassword(data.password);
    updateData.passwordEncrypted = encryptPassword(data.password);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      age: true,
      gender: true,
      address: true,
    },
  });

  // Update academic status for students (school or academy)
  const ALLOWED_STATUSES = ['ACTIVE', 'INACTIVE', 'GRADUATED', 'FILED'];
  if (data.academicStatus !== undefined && user.role === 'STUDENT') {
    const nextStatus = String(data.academicStatus || '').toUpperCase();
    if (!ALLOWED_STATUSES.includes(nextStatus)) {
      throw new Error(`Invalid academic status. Allowed values: ${ALLOWED_STATUSES.join(', ')}`);
    }
    // School student
    await prisma.student.updateMany({
      where: { Student_id: id },
      data: { AcademicStatus: nextStatus },
    });
    // Academy user
    await prisma.academy_user.updateMany({
      where: { user_academy_id: id },
      data: { AcademicStatus: nextStatus },
    });
  }

  return updated;
};

export const deleteUser = async (id, orgId, orgRole) => {
  const orgSubdomain = await getOrganizationSubdomain(orgId);
  const user = await findOrganizationUserById(id, orgId, orgRole, orgSubdomain);
  if (!user) {
    throw new Error('user not found');
  }
  await prisma.user.delete({ where: { id } });
};

export const exportOrganizationUsersCredentials = async (orgId, orgRole) => {
  const users = await getAllUsers(orgId, orgRole);
  const header = ['name', 'email', 'role', 'password'];

  const rows = users.map((user) => [
    user.name || '',
    user.email || '',
    user.role || '',
    user.password || '-',
  ]);

  return [header, ...rows]
    .map((row) => row.map(toCsvValue).join(CSV_DELIMITER))
    .join('\r\n');
};

export const linkParentToStudents = async ({ orgId, orgRole, parentId, studentIds }) => {
  const normalizedOrgRole = String(orgRole || '').trim().toUpperCase();
  if (normalizedOrgRole !== 'SCHOOL') {
    throw new AppError('Parent-student linking is only available for SCHOOL organizations', 403);
  }

  const orgSubdomain = await getOrganizationSubdomain(orgId);
  const parentUser = await findOrganizationUserById(parentId, orgId, orgRole, orgSubdomain);
  if (!parentUser) {
    throw new AppError('Parent user not found in this organization', 404);
  }

  const parent = await prisma.parent.findUnique({
    where: { Parent_id: parentId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!parent?.user || String(parent.user.role || '').toUpperCase() !== 'PARENT') {
    throw new AppError('Provided user is not a parent account', 400);
  }

  const students = await prisma.student.findMany({
    where: {
      Student_id: { in: studentIds },
      OrgId: orgId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (students.length !== studentIds.length) {
    const foundIds = new Set(students.map((student) => student.Student_id));
    const missingIds = studentIds.filter((studentId) => !foundIds.has(studentId));
    throw new AppError(`Some students were not found in this organization: ${missingIds.join(', ')}`, 404);
  }

  await prisma.$transaction(
    students.map((student) => prisma.student.update({
      where: { Student_id: student.Student_id },
      data: { Parent_id: parentId },
    })),
  );

  return {
    parent: {
      id: parent.user.id,
      name: parent.user.name,
      email: parent.user.email,
    },
    linkedStudents: students.map((student) => ({
      id: student.user?.id || student.Student_id,
      name: student.user?.name || null,
      email: student.user?.email || null,
      parentId,
    })),
    linkedCount: students.length,
  };
};





