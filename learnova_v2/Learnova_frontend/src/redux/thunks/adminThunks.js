import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchAdminDashboardMetrics,
  fetchAdminOrganizations,
  fetchAdminRevenue,
  fetchAdminPlans,
} from "../../services/adminService";

export const fetchDashboardMetricsThunk = createAsyncThunk(
  "admin/fetchDashboardMetrics",
  async (_, { rejectWithValue }) => {
    try {
      return await fetchAdminDashboardMetrics();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchOrganizationsThunk = createAsyncThunk(
  "admin/fetchOrganizations",
  async (params = {}, { rejectWithValue }) => {
    try {
      return await fetchAdminOrganizations(params);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchRevenueThunk = createAsyncThunk(
  "admin/fetchRevenue",
  async (params = {}, { rejectWithValue }) => {
    try {
      return await fetchAdminRevenue(params);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchPlansThunk = createAsyncThunk(
  "admin/fetchPlans",
  async (_, { rejectWithValue }) => {
    try {
      return await fetchAdminPlans();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);
