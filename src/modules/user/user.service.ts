import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { TRPCError } from '@trpc/server';

export async function list() {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, createdAt: true },
  });
}

export type CreateUserInput = { name: string; email: string; password: string };
export async function create(input: CreateUserInput) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  if (existingUser) {
    throw new TRPCError({ code: 'CONFLICT', message: 'Usuário já existe' });
  }

  const roundsRaw = Number(process.env.BCRYPT_ROUNDS ?? '12');
  const rounds = Number.isFinite(roundsRaw) && roundsRaw >= 10 && roundsRaw <= 14 ? roundsRaw : 12;
  const hashedPassword = await bcrypt.hash(input.password, rounds);

  try {
    return await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
      select: { id: true, name: true, email: true, createdAt: true },
    });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      throw new TRPCError({ code: 'CONFLICT', message: 'Email já cadastrado' });
    }
    throw err;
  }
}

export type ChangePasswordInput = { oldPassword: string; newPassword: string };
export async function changePassword(userId: string, input: ChangePasswordInput) {
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
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
  return user;
}

export type UpdateMeInput = { name?: string; email?: string };
export async function updateMe(userId: string, input: UpdateMeInput) {
  const data: any = {};
  if (typeof input.name !== 'undefined') data.name = input.name.trim();
  if (typeof input.email !== 'undefined') data.email = input.email.trim().toLowerCase();

  if (!('name' in data) && !('email' in data)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nada para atualizar' });
  }

  if (data.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing && existing.id !== userId) {
      throw new TRPCError({ code: 'CONFLICT', message: 'Email já cadastrado' });
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
}
