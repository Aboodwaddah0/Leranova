import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);

const comparePassword = (password, hashed) => bcrypt.compare(password, hashed);

export { hashPassword, comparePassword };
