import api, { buildQueryString } from "../utils/api";

export const fetchAdminDashboardMetrics = async () => {
  const { data } = await api.get("/admin/analytics/dashboard");
  return data?.data || null;
};

export const fetchAdminOrganizations = async (params = {}) => {
  const query = buildQueryString(params);
  const { data } = await api.get(`/admin/analytics/organizations${query}`);
  return data?.data || { organizations: [], total: 0, skip: 0, limit: 20 };
};

export const fetchAdminRevenue = async (params = {}) => {
  const query = buildQueryString(params);
  const { data } = await api.get(`/admin/analytics/revenue${query}`);
  return data?.data || null;
};

export const fetchAdminPlans = async () => {
  const { data } = await api.get("/admin/plans");
  return data?.data || [];
};

export const fetchAdminFeatures = async () => {
  const { data } = await api.get("/admin/features");
  return data?.data || [];
};

export const createAdminFeature = async (payload) => {
  const { data } = await api.post("/admin/features", payload);
  return data?.data || null;
};

export const assignFeatureToPlan = async (planId, payload) => {
  const { data } = await api.post(`/admin/plans/${planId}/features`, payload);
  return data?.data || null;
};

export const updatePlanFeature = async (planId, featureId, payload) => {
  const { data } = await api.patch(`/admin/plans/${planId}/features/${featureId}`, payload);
  return data?.data || null;
};

export const removePlanFeature = async (planId, featureId) => {
  const { data } = await api.delete(`/admin/plans/${planId}/features/${featureId}`);
  return data?.data || null;
};

export const updateAdminOrganization = async (organizationId, payload) => {
  const { data } = await api.patch(`/organizations/${organizationId}`, payload);
  return data?.data || null;
};

export const fetchOrganizationDetails = async (organizationId) => {
  const { data } = await api.get(`/organizations/${organizationId}`);
  return data?.data || null;
};
