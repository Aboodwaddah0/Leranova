export type UserRole = 'STUDENT' | 'PARENT' | 'TEACHER' | 'ADMIN';

export type StudentMode = 'ACADEMY' | 'SCHOOL';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
  phone?: string | null;
  organizationId?: number | null;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
}
