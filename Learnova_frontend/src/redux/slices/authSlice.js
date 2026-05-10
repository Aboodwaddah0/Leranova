import { createSlice } from "@reduxjs/toolkit";
import { STORAGE_KEYS } from "../../utils/constants";
import {
  getPlansThunk,
  loginThunk,
  registerOrganizationThunk,
} from "../thunks/authThunks";

const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
const storedRole = localStorage.getItem(STORAGE_KEYS.ROLE);
const storedUser = localStorage.getItem(STORAGE_KEYS.USER);

const initialState = {
  token: storedToken || null,
  role: storedRole || null,
  user: storedUser ? JSON.parse(storedUser) : null,
  isAuthenticated: Boolean(storedToken),
  loading: false,
  error: null,
  plans: [],
  pendingCheckout: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthSession(state, action) {
      const { token, user, role } = action.payload || {};

      state.token = token || null;
      state.user = user || null;
      state.role = role || null;
      state.isAuthenticated = Boolean(token);
      state.error = null;

      if (token) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      } else {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
      }

      if (role) {
        localStorage.setItem(STORAGE_KEYS.ROLE, role);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ROLE);
      }

      if (user) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    },
    setAuthRole(state, action) {
      state.role = action.payload;
      localStorage.setItem(STORAGE_KEYS.ROLE, action.payload);
    },
    logout(state) {
      state.token = null;
      state.role = null;
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.ROLE);
      localStorage.removeItem(STORAGE_KEYS.USER);
    },
    clearAuthError(state) {
      state.error = null;
    },
    clearPendingCheckout(state) {
      state.pendingCheckout = null;
    },
    updateAuthUser(state, action) {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(state.user));
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false;

        const token = action.payload?.token;
        const user =
          action.payload?.user ||
          action.payload?.parent ||
          action.payload?.organization ||
          action.payload;

        state.token = token;
        state.user = user;
        state.isAuthenticated = Boolean(token);

        if (token) {
          localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        }

        if (state.role) {
          localStorage.setItem(STORAGE_KEYS.ROLE, state.role);
        }

        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Login failed";
      })
      .addCase(getPlansThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getPlansThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.plans = action.payload;
      })
      .addCase(getPlansThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch plans";
      })
      .addCase(registerOrganizationThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerOrganizationThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.pendingCheckout = action.payload?.checkout || null;
      })
      .addCase(registerOrganizationThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Organization registration failed";
      });
  },
});

export const { setAuthSession, setAuthRole, logout, clearAuthError, clearPendingCheckout, updateAuthUser } =
  authSlice.actions;
export default authSlice.reducer;
