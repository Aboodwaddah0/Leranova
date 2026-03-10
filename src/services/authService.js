import prisma from '../utils/prisma.js';
import { hashPassword, comparePassword } from '../utils/hashPassword.js';
import generateToken from '../utils/generateToken.js';
import AppError from '../utils/appError.js';

const register = async ({ Name, age, Gender, Email, Password, Address, Role }) => {
  const existing = await prisma.user.findUnique({ where: { Email } });
  if (existing) throw new AppError('Email already in use', 409);

  const Password_Hashed = await hashPassword(Password);
  const user = await prisma.user.create({
    data: { Name, age, Gender, Email, Password_Hashed, Address, Role },
  });

  const { Password_Hashed: _, ...safeUser } = user;
  return safeUser;
};

const login = async ({ Email, Password }) => {
  const user = await prisma.user.findUnique({ where: { Email } });
  if (!user) throw new AppError('Invalid credentials', 401);

  const valid = await comparePassword(Password, user.Password_Hashed);
  if (!valid) throw new AppError('Invalid credentials', 401);

  const token = generateToken({ id: user.id, role: user.Role });
  return { token, role: user.Role, id: user.id };
};

const loginOrg = async ({ Email, Password }) => {
  const org = await prisma.organization.findUnique({ where: { Email } });
  if (!org) throw new AppError('Invalid credentials', 401);

  const valid = await comparePassword(Password, org.Password_Hashed);
  if (!valid) throw new AppError('Invalid credentials', 401);

  const token = generateToken({ id: org.id, role: org.Role });
  return { token, role: org.Role, id: org.id };
};

export { register, login, loginOrg };
