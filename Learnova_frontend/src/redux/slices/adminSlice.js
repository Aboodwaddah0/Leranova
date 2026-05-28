import { createSlice } from "@reduxjs/toolkit";
import {
  fetchDashboardMetricsThunk,
  fetchOrganizationsThunk,
  fetchRevenueThunk,
  fetchPlansThunk,
} from "../thunks/adminThunks";

const initialState = {
  metrics: null,
  organizations: [],
  revenue: null,
  plans: [],
  loading: false,
  error: null,
  organizationFilters: {
    status: "",
    search: "",
    skip: 0,
    limit: 20,
  },
};

const setLoading = (state) => {
  state.loading = true;
  state.error = null;
};

const setFailure = (state, action) => {
  state.loading = false;
  state.error = action.payload || "Request failed";
};

const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    setOrganizationFilters(state, action) {
      state.organizationFilters = {
        ...state.organizationFilters,
        ...action.payload,
      };
    },
    clearAdminState(state) {
      state.metrics = null;
      state.organizations = [];
      state.revenue = null;
      state.plans = [];
      state.loading = false;
      state.error = null;
      state.organizationFilters = initialState.organizationFilters;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardMetricsThunk.pending, setLoading)
      .addCase(fetchDashboardMetricsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.metrics = action.payload;
      })
      .addCase(fetchDashboardMetricsThunk.rejected, setFailure)
      .addCase(fetchOrganizationsThunk.pending, setLoading)
      .addCase(fetchOrganizationsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.organizations = action.payload?.organizations || [];
      })
      .addCase(fetchOrganizationsThunk.rejected, setFailure)
      .addCase(fetchRevenueThunk.pending, setLoading)
      .addCase(fetchRevenueThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.revenue = action.payload;
      })
      .addCase(fetchRevenueThunk.rejected, setFailure)
      .addCase(fetchPlansThunk.pending, setLoading)
      .addCase(fetchPlansThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.plans = action.payload;
      })
      .addCase(fetchPlansThunk.rejected, setFailure);
  },
});

export const { setOrganizationFilters, clearAdminState } = adminSlice.actions;
export default adminSlice.reducer;
