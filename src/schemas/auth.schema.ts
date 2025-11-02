import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres')
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'A senha deve conter letras e números'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres')
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'A senha deve conter letras e números'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10, 'Refresh token inválido'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;