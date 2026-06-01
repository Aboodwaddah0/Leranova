import prisma from "../utils/prisma.js";
import { generateTempPassword } from "../utils/generateUsersAccount.js";
import { hashPassword } from "../utils/hashPassword.js";
import { decryptPassword, encryptPassword } from "../utils/passwordCrypto.js";
import AppError from "../utils/appError.js";
import { ensureCourseForGradeLevel } from "./courseService.js";
import { computeGradeLevelFromDob, computeGradeLevelFromBirthYear, parseDobInput, computeAgeFromDob } from "./gradePlacementService.js";
import { getOrCreateSchoolSettings } from "./schoolSettingsService.js";
import XLSX from "xlsx";

const isSchoolStudent = (data) => {
  const role = String(data.role || '').trim().toUpperCase();
  const orgRole = String(data.orgRole || '').trim().toUpperCase();
  return role === 'STUDENT' && orgRole === 'SCHOOL';
};

const buildOrgCode = (name) => {
  const words = String(name || '').split(/[\s\-_]+/).filter(Boolean);
  const initials = words.map((w) => w.replace(/[^a-zA-Z]/g, '')[0] || '').join('').toUpperCase();
  return initials.length >= 2
    ? initials.slice(0, 5)
    : String(name || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'ORG';
};

const assignRegistrationNumber = async (userId, orgId, tx = prisma) => {
  const updated = await tx.organization.update({
    where: { id: orgId },
    data: { userSequence: { increment: 1 } },
    select: { userSequence: true, organizationCode: true, Name: true },
  });

  let prefix = updated.organizationCode;
  if (!prefix) {
    prefix = buildOrgCode(updated.Name);
    const exists = await prisma.organization.findFirst({ where: { organizationCode: prefix, id: { not: orgId } }, select: { id: true } });
    if (exists) prefix = `${prefix}${orgId}`;
    await prisma.organization.update({ where: { id: orgId }, data: { organizationCode: prefix } });
  }

  const registrationNumber = `${prefix}-${String(updated.userSequence).padStart(5, '0')}`;
  await tx.user.update({ where: { id: userId }, data: { registrationNumber } });
  return registrationNumber;
};

const normalizeNationalId = (value) => String(value || '').trim().replace(/[\s-]/g, '');

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
          specialization: data.specialization ?? null,
          bio: data.bio ?? null,
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

const createParentForNationalId = async (nationalId, orgId = null, tx = prisma, { fatherName = null } = {}) => {
  const safeNationalId = String(nationalId || "").trim();
  const parentName = fatherName ? String(fatherName).trim() : `Parent ${safeNationalId}`;
  const password = generateTempPassword(parentName);
  const passwordHashed = await hashPassword(password);
  const passwordEncrypted = encryptPassword(password);

  const createdParentUser = await tx.user.create({
    data: {
      name: parentName,
      email: null,
      passwordHashed,
      passwordEncrypted,
      mustChangePassword: true,
      role: "PARENT",
      parent: {
        create: {
          Work: null,
          nationalId: safeNationalId,
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

  let registrationNumber = null;
  if (orgId) {
    registrationNumber = await assignRegistrationNumber(createdParentUser.id, orgId, tx);
  }

  return {
    parentId: createdParentUser.id,
    nationalId: safeNationalId,
    email: null,
    password,
    registrationNumber,
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

const resolveOrCreateParentId = async ({ parentNationalId, orgId = null, fatherName = null }) => {
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

  try {
    const createdParent = await createParentForNationalId(normalized, orgId, prisma, { fatherName });
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

export const generateUsers = async (data) => {
  const createdUsers = [];
  const createdParents = [];
  const skippedUsers = [];
  const batchEmails = new Set();
  const preparedRows = [];

  for (const user of data) {
    const finalEmail = user.email ? String(user.email).trim().toLowerCase() : null;
    const finalPassword = user.password ? String(user.password) : generateTempPassword(user.name);

    if (finalEmail && batchEmails.has(finalEmail)) {
      skippedUsers.push({
        name: user.name,
        email: finalEmail,
        reason: 'Duplicate email in uploaded file',
      });
      continue;
    }

    if (finalEmail) {
      batchEmails.add(finalEmail);
    }
    preparedRows.push({
      ...user,
      finalEmail,
      finalPassword,
    });
  }

  const emailsToCheck = preparedRows.map((row) => row.finalEmail).filter(Boolean);
  const existingUsers = emailsToCheck.length
    ? await prisma.user.findMany({
      where: { email: { in: emailsToCheck } },
      select: { email: true },
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
    if (user.finalEmail && existingEmails.has(user.finalEmail)) {
      skippedUsers.push({
        name: user.name,
        email: user.finalEmail,
        reason: 'Email already exists in system',
      });
      continue;
    }

    // Pre-resolve parent from existing map (already-created parents in this batch)
    let resolvedParentId = user.parentNationalId ? parentIdByNationalId.get(String(user.parentNationalId)) : null;
    const needsNewParent = user.role === 'STUDENT' && user.parentNationalId && !resolvedParentId;

    try {
      // Resolve or create parent INSIDE the try block so that if student creation
      // fails, both operations are either committed or cleaned up together.
      let newlyCreatedParent = null;

      if (needsNewParent) {
        const existingParent = await prisma.parent.findUnique({
          where: { nationalId: String(user.parentNationalId) },
          select: { Parent_id: true },
        });

        if (existingParent) {
          resolvedParentId = existingParent.Parent_id;
          parentIdByNationalId.set(String(user.parentNationalId), resolvedParentId);
        } else {
          newlyCreatedParent = await createParentForNationalId(user.parentNationalId, user.orgId ?? null, prisma, { fatherName: user.fatherName ?? null });
          resolvedParentId = newlyCreatedParent.parentId;
          parentIdByNationalId.set(String(newlyCreatedParent.nationalId), Number(newlyCreatedParent.parentId));
        }
      }

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
          mustChangePassword: true,
          role: userPayload.role,
          age: finalAge,
          gender: userPayload.gender,
          address: userPayload.address,
          phone: userPayload.phone ?? null,
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

      // Student created successfully — register the new parent in the output list
      if (newlyCreatedParent) {
        createdParents.push(newlyCreatedParent);
      }

      const registrationNumber = ['STUDENT', 'TEACHER', 'PARENT'].includes(createdUser.role) && user.orgId
        ? await assignRegistrationNumber(createdUser.id, user.orgId)
        : null;

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
        registrationNumber,
      });
    } catch (error) {
      // Clean up any parent created in this iteration if the student failed
      if (needsNewParent && resolvedParentId) {
        const inMap = parentIdByNationalId.get(String(user.parentNationalId)) === resolvedParentId;
        if (inMap) {
          parentIdByNationalId.delete(String(user.parentNationalId));
          await prisma.user.delete({ where: { id: resolvedParentId } }).catch(() => {});
        }
      }
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
  ? await resolveOrCreateParentId({ parentNationalId: data.parentNationalId, orgId: data.orgId ?? null, fatherName: data.fatherName ?? null })
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

const tempPassword = generateTempPassword(data.name);
const hashedPassword= await hashPassword(tempPassword);
const passwordEncrypted = encryptPassword(tempPassword);
const user=await prisma.user.create({
    data:{
  name:payload.name,
   age:payload.age,
  email:payload.email,
  passwordHashed: hashedPassword,
  passwordEncrypted,
  mustChangePassword: true,
  gender:payload.gender,
  role:payload.role,
  address:payload.address,
  phone: payload.phone ?? null,
  ...buildRoleNested(payload),
  ...buildAcademyUserNested(payload),
    }
});

const registrationNumber = ['STUDENT', 'TEACHER', 'PARENT'].includes(payload.role) && payload.orgId
  ? await assignRegistrationNumber(user.id, payload.orgId)
  : null;

return {
  ...user,
  registrationNumber,
  tempPassword,
  parentLinkStatus: resolvedParentInfo?.parentLinkStatus ?? null,
};

}

export const addUserWithGeneratedCredentials = async (data) => {
  const password = generateTempPassword(data.name);
  const passwordHashed = await hashPassword(password);
  const passwordEncrypted = encryptPassword(password);
  const resolvedParentInfo = data.role === 'STUDENT' && data.parentNationalId
    ? await resolveOrCreateParentId({
      parentNationalId: data.parentNationalId,
      orgId: data.orgId ?? null,
      fatherName: data.fatherName ?? null,
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
      email: data.email ?? null,
      passwordHashed,
      passwordEncrypted,
      mustChangePassword: true,
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

  const registrationNumber = ['STUDENT', 'TEACHER', 'PARENT'].includes(payload.role) && payload.orgId
    ? await assignRegistrationNumber(createdUser.id, payload.orgId)
    : null;

  return {
    user: { ...createdUser, registrationNumber },
    credentials: { password },
    parentLinkStatus: resolvedParentInfo?.parentLinkStatus ?? null,
  };
};

const buildOrganizationUsersWhere = (orgId, orgRole, filters = {}) => {
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
  if (courseId) {
    return {
      OR: [
        { role: 'STUDENT', student: { is: { OrgId: orgId, Course_id: Number(courseId) } } },
        { role: 'TEACHER', teacher: { is: { OrgId: orgId } } },
        { role: 'PARENT', parent: { is: { student: { some: { OrgId: orgId, Course_id: Number(courseId) } } } } },
      ],
    };
  }

  return {
    OR: [
      { role: 'STUDENT', student: { is: { OrgId: orgId } } },
      { role: 'TEACHER', teacher: { is: { OrgId: orgId } } },
      { role: 'PARENT', parent: { is: { student: { some: { OrgId: orgId } } } } },
    ],
  };
};

const findOrganizationUserById = async (id, orgId, orgRole) => {
  return prisma.user.findFirst({
    where: {
      id,
      ...buildOrganizationUsersWhere(orgId, orgRole),
    },
    select: { id: true, email: true, role: true },
  });
};

export const getAllUsers = async (orgId, orgRole, filters = {}) => {
  const normalizedOrgRole = String(orgRole || '').trim().toUpperCase();

  const baseSelect = {
    id: true,
    name: true,
    email: true,
    registrationNumber: true,
    role: true,
    age: true,
    gender: true,
    address: true,
    phone: true,
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
        parent: {
          select: {
            user: {
              select: { name: true },
            },
          },
        },
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
    where: buildOrganizationUsersWhere(orgId, orgRole, filters),
    select: baseSelect,
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    registrationNumber: user.registrationNumber || null,
    role: user.role,
    age: user.age,
    gender: user.gender,
    address: user.address,
    phone: user.phone || null,
    password: user.passwordEncrypted ? decryptPassword(user.passwordEncrypted) : null,
    student: user.student || null,
    status: user.student?.AcademicStatus || user.academy_user?.AcademicStatus || null,
    academy_user: user.academy_user,
    parentName: user.student?.parent?.user?.name || null,
  }));
};

export const updateUser = async (id, data, orgId, orgRole) => {
  const user = await findOrganizationUserById(id, orgId, orgRole);
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
  if (data.password !== undefined && String(data.password).trim() !== '') {
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
  const user = await findOrganizationUserById(id, orgId, orgRole);
  if (!user) {
    throw new Error('user not found');
  }
  await prisma.user.delete({ where: { id } });
};

export const exportOrganizationUsersCredentials = async (orgId, orgRole) => {
  const users = await getAllUsers(orgId, orgRole);
  const header = ['name', 'email', 'role'];

  const rows = users.map((user) => [
    user.name || '',
    user.email || '',
    user.role || '',
  ]);

  return [header, ...rows]
    .map((row) => row.map(toCsvValue).join(CSV_DELIMITER))
    .join('\r\n');
};

export const generateSampleExcel = (role, orgType) => {
  const normalizedRole = String(role || '').trim().toUpperCase();
  const isSchool = String(orgType || '').trim().toUpperCase() === 'SCHOOL';

  let headers;
  let exampleRow;

  if (normalizedRole === 'STUDENT') {
    if (isSchool) {
      headers  = ['firstName', 'lastName', 'Role',    'email', 'age', 'gender', 'address',         'phone',        'DOB',        'ParentNationalId', 'fatherName'];
      exampleRow = ['John',    'Doe',      'STUDENT', '',      14,    'MALE',   '123 Main Street', '+1234567890', '2010-05-15', '1234567890',        'Ahmed Hassan'];
    } else {
      headers  = ['firstName', 'lastName', 'Role',    'email', 'age', 'gender',  'address',        'phone'];
      exampleRow = ['Jane',    'Smith',    'STUDENT', '',      20,    'FEMALE',  '456 Oak Avenue', '+1234567890'];
    }
  } else if (normalizedRole === 'TEACHER') {
    headers  = ['firstName', 'lastName', 'Role',    'email',              'Work',           'Specialization', 'Bio',                      'age', 'gender'];
    exampleRow = ['Ahmed',   'Hassan',   'TEACHER', 'ahmed@example.com', 'Private School', 'Mathematics',    'Experienced math teacher', 35,    'MALE'];
  } else if (normalizedRole === 'PARENT') {
    headers  = ['firstName', 'lastName', 'Role',   'email', 'Work'];
    exampleRow = ['Sara',    'Ali',      'PARENT', '',      'Engineer'];
  } else {
    throw new AppError('role must be one of: STUDENT, TEACHER, PARENT', 400);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
  XLSX.utils.book_append_sheet(wb, ws, 'Sample');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

export const linkParentToStudents = async ({ orgId, orgRole, parentId, studentIds }) => {
  const normalizedOrgRole = String(orgRole || '').trim().toUpperCase();
  if (normalizedOrgRole !== 'SCHOOL') {
    throw new AppError('Parent-student linking is only available for SCHOOL organizations', 403);
  }

  const parentUser = await findOrganizationUserById(parentId, orgId, orgRole);
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





