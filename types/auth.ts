export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';

export interface User {
  id: string;
  fullName: string;
  accountName: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AuthSession {
  accessToken: string;
  user: User;
}

export interface AccessTokenResponse {
  accessToken: string;
}

export interface LoginSessionInfo {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: string;
  createdAt: string;
  current: boolean;
}

export interface LoginPayload {
  accountName: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  fullName: string;
  confirmPassword: string;
}

export interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
  timestamp: string;
}

export interface ApiErrorEnvelope {
  success: false;
  statusCode: number;
  message: string;
  errors?: string[];
  path: string;
  timestamp: string;
}
