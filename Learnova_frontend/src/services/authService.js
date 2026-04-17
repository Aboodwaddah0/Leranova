import api from "../utils/api";
import { AUTH_ROLES } from "../utils/constants";

export const fetchPlans = async () => {
  const { data } = await api.get("/subscriptions/plans");
  return data?.data || [];
};

export const loginWithRole = async ({ role, email, password, nationalId }) => {
  if (role === AUTH_ROLES.ORGANIZATION) {
    const { data } = await api.post("/auth/organization/login", {
      Email: email,
      password,
    });
    return data?.data;
  }

  if (role === AUTH_ROLES.PARENT) {
    const { data } = await api.post("/auth/parent/login", {
      nationalId,
      password,
    });
    return data?.data;
  }

  const { data } = await api.post("/auth/user/login", {
    email,
    password,
  });
  return data?.data;
};

export const registerOrganization = async (payload) => {
  const { data } = await api.post("/auth/organization/register", payload);
  return data?.data;
};
