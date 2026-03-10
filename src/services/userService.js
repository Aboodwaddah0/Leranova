import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const getAllUsers = async () => {
  return prisma.user.findMany({
    select: { id: true, Name: true, age: true, Gender: true, Email: true, Address: true, Role: true },
  });
};

const getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(id) },
    select: { id: true, Name: true, age: true, Gender: true, Email: true, Address: true, Role: true },
  });
  if (!user) throw new AppError('User not found', 404);
  return user;
};

const updateUser = async (id, data) => {
  const user = await prisma.user.findUnique({ where: { id: Number(id) } });
  if (!user) throw new AppError('User not found', 404);

  return prisma.user.update({
    where: { id: Number(id) },
    data,
    select: { id: true, Name: true, age: true, Gender: true, Email: true, Address: true, Role: true },
  });
};

const deleteUser = async (id) => {
  const user = await prisma.user.findUnique({ where: { id: Number(id) } });
  if (!user) throw new AppError('User not found', 404);

  await prisma.user.delete({ where: { id: Number(id) } });
};

export { getAllUsers, getUserById, updateUser, deleteUser };
