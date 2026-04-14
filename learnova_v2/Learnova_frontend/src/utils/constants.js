export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api";

export const AUTH_ROLES = {
  ADMIN: "ADMIN",
  ORGANIZATION: "ORGANIZATION",
  STUDENT: "STUDENT",
  INSTRUCTOR: "INSTRUCTOR",
  PARENT: "PARENT",
};

export const ORG_TYPES = {
  ACADEMY: "ACADEMY",
  SCHOOL: "SCHOOL",
};

export const STORAGE_KEYS = {
  TOKEN: "learnova_token",
  ROLE: "learnova_role",
  USER: "learnova_user",
};
