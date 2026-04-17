import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;

const getKey = () => {
  const raw = String(process.env.PASSWORD_ENCRYPTION_KEY || "").trim();
  if (raw) {
    const key = Buffer.from(raw, "base64");
    if (key.length !== 32) {
      throw new Error("PASSWORD_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
    }

    return key;
  }

  const legacySecret = String(process.env.JWT_SECRET || "").trim();
  if (!legacySecret) {
    throw new Error("PASSWORD_ENCRYPTION_KEY is missing and JWT_SECRET fallback is unavailable");
  }

  return crypto.createHash("sha256").update(legacySecret, "utf8").digest();
};

export const encryptPassword = (plainPassword) => {
  const value = String(plainPassword || "");
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey();

  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
};

export const decryptPassword = (encryptedValue) => {
  if (!encryptedValue) {
    return null;
  }

  const parts = String(encryptedValue).split(":");
  if (parts.length !== 3) {
    throw new Error("Encrypted password format is invalid");
  }

  const [ivPart, tagPart, cipherPart] = parts;
  const iv = Buffer.from(ivPart, "base64");
  const tag = Buffer.from(tagPart, "base64");
  const encrypted = Buffer.from(cipherPart, "base64");

  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
};
