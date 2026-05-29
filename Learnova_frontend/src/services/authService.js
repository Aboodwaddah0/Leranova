import api from "../utils/api";
import { AUTH_ROLES } from "../utils/constants";

export const fetchPlans = async () => {
  const { data } = await api.get("/subscriptions/plans");
  return data?.data || [];
};

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

export const loginWithRole = async ({ email, password }) => {
  const identifier = String(email || "").trim();

  // Registration number → user login only
  if (!isEmail(identifier)) {
    const { data } = await api.post("/auth/user/login", { registrationNumber: identifier, password });
    return data?.data;
  }

  // Email → try user login first, fall back to org login
  try {
    const { data } = await api.post("/auth/user/login", { email: identifier, password });
    return data?.data;
  } catch (_) {
    const { data } = await api.post("/auth/organization/login", { Email: identifier, password });
    return data?.data;
  }
};

export const registerOrganization = async (payload) => {
  const { data } = await api.post("/auth/organization/register", payload);
  return data?.data;
};
