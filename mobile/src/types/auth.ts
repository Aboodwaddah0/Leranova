export type UserRole = 'STUDENT' | 'PARENT' | 'TEACHER' | 'ADMIN' | 'SCHOOL' | 'ACADEMY';

export type StudentMode = 'ACADEMY' | 'SCHOOL';

export interface AuthUser {
  id: number;
  name?: string;
  Name?: string;       // org users use capital-N Name
  email?: string;
  Email?: string;      // org users use capital-E Email
  role: UserRole;
  Role?: string;       // org type mirror (SCHOOL | ACADEMY)
  type?: string;       // org type (SCHOOL | ACADEMY)
  avatarUrl?: string | null;
  phone?: string | null;
  Phone?: string | null;
  organizationId?: number | null;
  // Org-specific profile fields
  Address?: string | null;
  Description?: string | null;
  Founded?: string | null;
  logoUrl?: string | null;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;       // true only while login/logout request is in-flight
  isBootstrapping: boolean; // true only while reading from SecureStore on app launch
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
