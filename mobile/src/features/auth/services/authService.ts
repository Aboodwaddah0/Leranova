import apiClient from '../../../shared/services/apiClient';
import type { LoginPayload, LoginResponse, AuthUser, UserRole } from '../../../types/auth';

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

function normalizeOrgResponse(raw: { organization: Record<string, unknown>; token: string }): LoginResponse {
  const org = raw.organization;
  const user: AuthUser = {
    id: org.id as number,
    Name: org.Name as string,
    Email: org.Email as string,
    role: (org.Role as UserRole) ?? 'ACADEMY',
    Role: org.Role as string,
    Phone: (org.Phone as string) ?? null,
    Address: (org.Address as string) ?? null,
    Description: (org.Description as string) ?? null,
    Founded: (org.Founded as string) ?? null,
  };
  return { user, token: raw.token };
}

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

    // Email → try org login first (org admins always use email), fall back to user login
    try {
      const { data } = await apiClient.post('/auth/organization/login', {
        Email: identifier,
        password: payload.password,
      });
      return normalizeOrgResponse(data?.data as { organization: Record<string, unknown>; token: string });
    } catch {
      const { data } = await apiClient.post('/auth/user/login', {
        email: identifier,
        password: payload.password,
      });
      return data?.data as LoginResponse;
    }
  },

  async getMe(): Promise<AuthUser | null> {
    try {
      const { data } = await apiClient.get('/auth/me');
      return (data && typeof data === 'object' && 'data' in data ? data.data : data) as AuthUser;
    } catch {
      return null;
    }
  },

  async forgotPasswordCode(email: string, accountType?: string): Promise<void> {
    await apiClient.post('/auth/forgot-password/code', { email, accountType });
  },

  async resetPasswordWithCode(token: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/reset-password/code', { token, newPassword });
  },
};
