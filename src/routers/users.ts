import { router, adminProcedure, protectedProcedure } from '../lib/trpc.js';
import { z } from 'zod';
import * as userService from '../modules/user/user.service.js';

export const userRouter = router({
  list: adminProcedure.query(async () => {
    return userService.list();
  }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1, "Nome é obrigatório"),
      email: z.string().email("Email inválido"),
      // Mais rígida: pelo menos 8 caracteres, com letras e números
      password: z.string()
        .min(8, "Senha deve ter pelo menos 8 caracteres")
        .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, "Senha deve conter letras e números"),
    }))
    .mutation(async ({ input }) => {
      return userService.create(input);
    }),

  changePassword: protectedProcedure
    .input(z.object({
      oldPassword: z.string().min(1, "Senha atual é obrigatória"),
      newPassword: z.string()
        .min(8, "Senha deve ter pelo menos 8 caracteres")
        .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, "Senha deve conter letras e números"),
    }))
    .mutation(async ({ ctx, input }) => {
      return userService.changePassword(ctx.user.id, input);
    }),

  // Perfil do usuário autenticado
  me: protectedProcedure.query(async ({ ctx }) => {
    return userService.me(ctx.user.id);
  }),

  updateMe: protectedProcedure
    .input(z.object({
      name: z.string().min(1, 'Nome é obrigatório').optional(),
      email: z.string().email('Email inválido').optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return userService.updateMe(ctx.user.id, input);
    }),
});
