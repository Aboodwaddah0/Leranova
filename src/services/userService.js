import prisma from "../utils/prisma.js";
import { generateUserCredentials } from "../utils/generateUsersAccount.js";
import { hashPassword } from "../utils/hashPassword.js";

const buildRoleNested = (data) => {
  const role = String(data.role || '').toUpperCase();
  if (role === 'TEACHER') {
    return { teacher: { create: { Work: data.work ?? null } } };
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

export const generateUsers = async (data, domain) => {
  const users = [];

  for (const user of data) {
    const { email, password } = await generateUserCredentials(user.name, domain);
    const passwordHashed = await hashPassword(password);

    const createdUser = await prisma.user.create({
      data: {
        name: user.name,
        email,
        passwordHashed: passwordHashed,
        role: user.role,
        age: user.age,
        gender: user.gender,
        address: user.address,
        ...buildRoleNested(user),
      },
    });

    users.push({
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      password,
      role: createdUser.role,
      age: createdUser.age,
      gender: createdUser.gender,
      address: createdUser.address,
    });
  }

  return users;
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
    }
});

return user;

}

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




