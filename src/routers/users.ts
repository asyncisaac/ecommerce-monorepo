import { router, adminProcedure, protectedProcedure } from '../lib/trpc.js';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import { TRPCError } from '@trpc/server';

export const userRouter = router({
  list: adminProcedure.query(async () => {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, createdAt: true } // Não retorna senha
    });
    return users;
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
      // Normaliza campos
      const email = input.email.trim().toLowerCase();
      const name = input.name.trim();

      // Verifica se usuário já existe
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      if (existingUser) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Usuário já existe' });
      }

      // Usa rounds configuráveis via env, com fallback seguro
      const roundsRaw = Number(process.env.BCRYPT_ROUNDS ?? '12');
      const rounds = Number.isFinite(roundsRaw) && roundsRaw >= 10 && roundsRaw <= 14 ? roundsRaw : 12;
      const hashedPassword = await bcrypt.hash(input.password, rounds);

      try {
        const user = await prisma.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
          },
          select: { id: true, name: true, email: true, createdAt: true } // Não retorna senha
        });
        return user;
      } catch (err: any) {
        // Trata violação de unique constraint (email)
        if (err?.code === 'P2002') {
          throw new TRPCError({ code: 'CONFLICT', message: 'Email já cadastrado' });
        }
        throw err;
      }
    }),

  changePassword: protectedProcedure
    .input(z.object({
      oldPassword: z.string().min(1, "Senha atual é obrigatória"),
      newPassword: z.string()
        .min(8, "Senha deve ter pelo menos 8 caracteres")
        .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, "Senha deve conter letras e números"),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, password: true },
      });
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });

      const matches = await bcrypt.compare(input.oldPassword, user.password);
      if (!matches) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Senha atual incorreta' });

      const roundsRaw = Number(process.env.BCRYPT_ROUNDS ?? '12');
      const rounds = Number.isFinite(roundsRaw) && roundsRaw >= 10 && roundsRaw <= 14 ? roundsRaw : 12;
      const newHash = await bcrypt.hash(input.newPassword, rounds);

      await prisma.user.update({
        where: { id: userId },
        data: { password: newHash },
      });

      return { ok: true };
    }),

  // Perfil do usuário autenticado
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    });
    if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
    return user;
  }),

  updateMe: protectedProcedure
    .input(z.object({
      name: z.string().min(1, 'Nome é obrigatório').optional(),
      email: z.string().email('Email inválido').optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const data: any = {};
      if (typeof input.name !== 'undefined') data.name = input.name.trim();
      if (typeof input.email !== 'undefined') data.email = input.email.trim().toLowerCase();

      if (!('name' in data) && !('email' in data)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nada para atualizar' });
      }

      if (data.email) {
        const existing = await prisma.user.findUnique({ where: { email: data.email } });
        if (existing && existing.id !== ctx.user.id) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Email já cadastrado' });
        }
      }

      const updated = await prisma.user.update({
        where: { id: ctx.user.id },
        data,
        select: { id: true, email: true, name: true, role: true, createdAt: true }
      });

      return updated;
    }),
});
