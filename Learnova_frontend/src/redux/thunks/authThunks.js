import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchPlans,
  loginWithRole,
  registerOrganization,
} from "../../services/authService";

export const loginThunk = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      return await loginWithRole(credentials);
    } catch (error) {
      return rejectWithValue(error.message);
    }
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
