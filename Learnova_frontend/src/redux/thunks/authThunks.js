import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchPlans,
  loginWithRole,
  registerOrganization,
} from "../../services/authService";
import { registerFcmToken, clearFcmToken } from "../../utils/fcm";

export const loginThunk = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const result = await loginWithRole(credentials);
      // Register FCM token after successful login — fire-and-forget
      registerFcmToken().catch(() => {});
      return result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const logoutThunk = createAsyncThunk(
  "auth/logout",
  async () => {
    await clearFcmToken().catch(() => {});
  },
);

export const getPlansThunk = createAsyncThunk(
  "auth/getPlans",
  async (_, { rejectWithValue }) => {
    try {
      return await fetchPlans();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const registerOrganizationThunk = createAsyncThunk(
  "auth/registerOrganization",
  async (formData, { rejectWithValue }) => {
    try {
      return await registerOrganization(formData);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);
