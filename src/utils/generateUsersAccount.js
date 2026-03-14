import crypto from "crypto";
import prisma from "../utils/prisma.js";
import slugifyName from "./slugifyName.js";

const generateUniqueEmail = async (name, domain) => {
  const base = slugifyName(name);
  let counter = 0;

  while (true) {
    const email =
      counter === 0
        ? `${base}@${domain}`
        : `${base}${counter}@${domain}`;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!existingUser) {
      return email;
    }

    counter++;
  }
};

const generatePassword = (name) => {
  const base = slugifyName(name).slice(0, 4);
  const random = crypto.randomBytes(3).toString("hex");
  const number = Math.floor(100 + Math.random() * 900);

  return `${base}${random}@${number}`;
};

export const generateUserCredentials = async (name, domain) => {
  const email = await generateUniqueEmail(name, domain);
  const password = generatePassword(name);

  return {
    email,
    password,
  };
};