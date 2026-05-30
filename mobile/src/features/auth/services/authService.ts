import apiClient from '../../../shared/services/apiClient';
import type { LoginPayload, LoginResponse, AuthUser } from '../../../types/auth';

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const identifier = payload.email.trim();

    // Registration number → user login
    if (!isEmail(identifier)) {
      const { data } = await apiClient.post('/auth/user/login', {
        registrationNumber: identifier,
        password: payload.password,
      });
      return data?.data as LoginResponse;
    }

    // Email → user login first, fallback to org login
    try {
      const { data } = await apiClient.post('/auth/user/login', {
        email: identifier,
        password: payload.password,
      });
      return data?.data as LoginResponse;
    } catch {
      const { data } = await apiClient.post('/auth/organization/login', {
        Email: identifier,
        password: payload.password,
      });
      return data?.data as LoginResponse;
    }
  },

  async getMe(): Promise<AuthUser | null> {
    try {
      const { data } = await apiClient.get('/auth/me');
      return (data?.data ?? data) as AuthUser;
    } catch {
      return null;
    }
  },
};
