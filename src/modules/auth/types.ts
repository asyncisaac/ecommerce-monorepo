import type { UserRole } from '@prisma/client';
// Data Transfer Objects
export interface RegisterUserData {
  email: string;
  password: string;
  name: string;
}

export interface LoginUserData {
  email: string;
  password: string;
}

// Response Interfaces
export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: Date;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: UserResponse;
    token: string;
  };
  error?: string;
}

// JWT Payload
export interface UserPayload {
  id: string;
  email: string;
  role: UserRole;
}

// Error Types
export interface ValidationError {
  field: string;
  message: string;
}

export interface BusinessError {
  code: string;
  message: string;
  details?: unknown;
}
