import prisma from "../utils/prisma.js";
import { generateUserCredentials } from "../utils/generateUsersAccount.js";
import { hashPassword } from "../utils/hashPassword.js";

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

export const generateUsers = async (data, domain) => {
  const createdUsers = [];
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

  for (const user of preparedRows) {
    if (existingEmails.has(user.finalEmail)) {
      skippedUsers.push({
        name: user.name,
        email: user.finalEmail,
        reason: 'Email already exists in system',
      });
      continue;
    }

    const passwordHashed = await hashPassword(user.finalPassword);

    const createdUser = await prisma.user.create({
      data: {
        name: user.name,
        email: user.finalEmail,
        passwordHashed,
        role: user.role,
        age: user.age,
        gender: user.gender,
        address: user.address,
        ...buildRoleNested(user),
        ...buildAcademyUserNested(user),
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
    });
  }

  return {
    createdUsers,
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

const hashedPassword= await hashPassword(data.password);
const user=await prisma.user.create({
    data:{
  name:data.name,
   age:data.age,
  email:data.email,
  passwordHashed: hashedPassword,
  gender:data.gender,
  role:data.role,
  address:data.address,
  ...buildRoleNested(data),
  ...buildAcademyUserNested(data),
    }
});

return user;

}

export const addUserWithGeneratedCredentials = async (data, domain) => {
  const { email, password } = await generateUserCredentials(data.name, domain);
  const passwordHashed = await hashPassword(password);

  const createdUser = await prisma.user.create({
    data: {
      name: data.name,
      email,
      passwordHashed,
      role: data.role,
      age: data.age,
      gender: data.gender,
      address: data.address,
      ...buildRoleNested(data),
      ...buildAcademyUserNested(data),
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

export const getAllUsers = async () => {
  const users = await prisma.user.findMany({
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
  return users;
};

export const updateUser = async (id, data) => {
  const user = await prisma.user.findUnique({ where: { id } });
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

export const deleteUser = async (id) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new Error('user not found');
  }
  await prisma.user.delete({ where: { id } });
};





