import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { AuthState, AuthUser, LoginPayload } from '../types/auth';
import { StorageService } from '../shared/services/storage';
import { authService } from '../features/auth/services/authService';
import { registerFcmToken, clearFcmToken } from '../shared/utils/fcm';

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,        // login/logout spinner — does NOT unmount Auth stack
  isBootstrapping: true,   // app launch: reading token from SecureStore
  isAuthenticated: false,
};

export const bootstrapAuth = createAsyncThunk('auth/bootstrap', async () => {
  const [token, user] = await Promise.all([
    StorageService.getToken(),
    StorageService.getUser(),
  ]);
  if (token && user) {
    // Re-register FCM token on every launch — tokens can rotate, and this
    // also covers sessions that started before push notifications existed.
    registerFcmToken().catch(() => {});
  }
  return { token, user };
});

export const login = createAsyncThunk('auth/login', async (payload: LoginPayload, { rejectWithValue }) => {
  try {
    const result = await authService.login(payload);
    await StorageService.setToken(result.token);
    await StorageService.setUser(result.user);
    // Register FCM token after login — fire-and-forget
    registerFcmToken().catch(() => {});
    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    return rejectWithValue(message);
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await clearFcmToken().catch(() => {});
  await StorageService.clear();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    updateUser(state, action: { payload: Partial<AuthUser> }) {
      if (!state.user) return;
      Object.assign(state.user, action.payload);
      StorageService.setUser(state.user as unknown as AuthUser);
    },
  },
  extraReducers: (builder) => {
    // Bootstrap — only touches isBootstrapping, never isLoading
    builder.addCase(bootstrapAuth.fulfilled, (state, action) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = !!action.payload.token && !!action.payload.user;
      state.isBootstrapping = false;
    });
    builder.addCase(bootstrapAuth.rejected, (state) => {
      state.isBootstrapping = false;
    });

    // Login — only touches isLoading; Auth stack stays mounted the entire time
    builder.addCase(login.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isLoading = false;
    });
    builder.addCase(login.rejected, (state) => {
      state.isLoading = false;
    });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    });
  },
});

export const { updateUser } = authSlice.actions;
export default authSlice.reducer;
