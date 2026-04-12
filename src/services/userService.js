import prisma from "../utils/prisma.js";
import { generateUserCredentials } from "../utils/generateUsersAccount.js";
import { hashPassword } from "../utils/hashPassword.js";
import AppError from "../utils/appError.js";
import { ensureCourseForGradeLevel } from "./courseService.js";
import { computeGradeLevelFromDob, parseDobInput } from "./gradePlacementService.js";
import { getOrCreateSchoolSettings } from "./schoolSettingsService.js";

const isSchoolStudent = (data) => {
  const role = String(data.role || '').trim().toUpperCase();
  const orgRole = String(data.orgRole || '').trim().toUpperCase();
  return role === 'STUDENT' && orgRole === 'SCHOOL';
};

const prepareSchoolPlacement = async (data, tx = prisma) => {
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
  const gradeLevel = computeGradeLevelFromDob(dob, settings);
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
  if (role ==='STUDENT') {
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
    return { academy_user: { create: { OrgId: data.orgId } } };
  }

  return {};
};

const createParentForNationalId = async (nationalId, domain) => {
  const safeNationalId = String(nationalId || "").trim();
  const parentName = `Parent ${safeNationalId}`;
  const { email, password } = await generateUserCredentials(parentName, domain);
  const passwordHashed = await hashPassword(password);

  const createdParentUser = await prisma.user.create({
    data: {
      name: parentName,
      email,
      passwordHashed,
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
      const schoolPlacement = await prepareSchoolPlacement(user);
      const userPayload = {
        ...user,
        parentId: resolvedParentId ?? null,
        dob: schoolPlacement.dob,
        gradeLevel: schoolPlacement.gradeLevel,
        courseId: schoolPlacement.courseId ?? user.courseId ?? null,
        academicStatus: schoolPlacement.academicStatus,
      };

      const passwordHashed = await hashPassword(user.finalPassword);

      const createdUser = await prisma.user.create({
        data: {
          name: userPayload.name,
          email: user.finalEmail,
          passwordHashed,
          role: userPayload.role,
          age: userPayload.age,
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
        dob: createdUser.student?.DOB ?? null,
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

const placement = await prepareSchoolPlacement(data);
const payload = {
  ...data,
  dob: placement.dob,
  gradeLevel: placement.gradeLevel,
  courseId: placement.courseId ?? data.courseId ?? null,
  academicStatus: placement.academicStatus,
};

const hashedPassword= await hashPassword(data.password);
const user=await prisma.user.create({
    data:{
  name:payload.name,
   age:payload.age,
  email:payload.email,
  passwordHashed: hashedPassword,
  gender:payload.gender,
  role:payload.role,
  address:payload.address,
  ...buildRoleNested(payload),
  ...buildAcademyUserNested(payload),
    }
});

return user;

}

export const addUserWithGeneratedCredentials = async (data, domain) => {
  const { email, password } = await generateUserCredentials(data.name, domain);
  const passwordHashed = await hashPassword(password);
  const placement = await prepareSchoolPlacement(data);
  const payload = {
    ...data,
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
    },
  });

  return {
    user: createdUser,
    credentials: {
      email,
      password,
    },
  };
};

const buildOrganizationUsersWhere = (orgId, orgRole, orgSubdomain = null) => {
  const normalizedOrgRole = String(orgRole || '').trim().toUpperCase();

  if (normalizedOrgRole === 'ACADEMY') {
    return {
      OR: [
        { role: 'STUDENT', academy_user: { is: { OrgId: orgId } } },
        { role: 'TEACHER', teacher: { is: { OrgId: orgId } } },
      ],
    };
  }

  const orgDomain = orgSubdomain ? `@${String(orgSubdomain).toLowerCase()}.com` : null;

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

export const getAllUsers = async (orgId, orgRole) => {
  const orgSubdomain = await getOrganizationSubdomain(orgId);
  const users = await prisma.user.findMany({
    where: buildOrganizationUsersWhere(orgId, orgRole, orgSubdomain),
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      age: true,
      gender: true,
      address: true,
      student: {
        select: {
          Parent_id: true,
        },
      },
    },
  });
  return users;
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





