import { router, publicProcedure } from '../lib/trpc.js';
import { TRPCError } from '@trpc/server';
import { loginSchema, registerSchema, refreshSchema } from '../schemas/auth.schema.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Rate limiting simples em memória para rotas públicas sensíveis
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_ATTEMPTS = 20;
const attempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || rec.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  if (rec.count >= MAX_ATTEMPTS) {
    throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Muitas tentativas. Tente novamente mais tarde.' });
  }
  rec.count += 1;
}

function getBcryptRounds(): number {
  const roundsRaw = Number(process.env.BCRYPT_ROUNDS ?? '12');
  return Number.isFinite(roundsRaw) && roundsRaw >= 10 && roundsRaw <= 14 ? roundsRaw : 12;
}

function getJwtSecretOrThrow(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Configuração inválida: JWT_SECRET ausente ou fraco' });
  }
  return secret;
}

function generateAccessToken(userId: string) {
  return jwt.sign({ userId }, getJwtSecretOrThrow(), { expiresIn: '1h' });
}

function createRefreshToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias
  return { token, tokenHash, expiresAt };
}

export const authRouter = router({
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input, ctx }) => {
      const ip = ctx.req?.ip ?? 'unknown';
      checkRateLimit(ip);

      const email = input.email.trim().toLowerCase();
      const name = input.name.trim();
      const password = input.password;
      
      // Verifica se o usuário já existe
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email },
      });
      
      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Usuário com este email já existe',
        });
      }
      
      // Criptografa a senha
      const hashedPassword = await bcrypt.hash(password, getBcryptRounds());
      
      // Cria o usuário
      const user = await ctx.prisma.user.create({
        data: { email, password: hashedPassword, name },
        select: { id: true, email: true, name: true, role: true },
      });
      
      // Emite tokens
      const accessToken = generateAccessToken(user.id);
      const { token: refreshToken, tokenHash, expiresAt } = createRefreshToken();
      await ctx.prisma.refreshToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });
      
      return { token: accessToken, refreshToken, user };
    }),
    
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      const ip = ctx.req?.ip ?? 'unknown';
      checkRateLimit(ip);

      const email = input.email.trim().toLowerCase();
      const password = input.password;
      
      // Busca o usuário pelo email
      const user = await ctx.prisma.user.findUnique({
        where: { email },
      });
      
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Credenciais inválidas',
        });
      }
      
      // Verifica a senha
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Credenciais inválidas',
        });
      }
      
      // Emite tokens
      const accessToken = generateAccessToken(user.id);
      const { token: refreshToken, tokenHash, expiresAt } = createRefreshToken();
      await ctx.prisma.refreshToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });
      
      return {
        token: accessToken,
        refreshToken,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      };
    }),
    
  me: publicProcedure
    .query(({ ctx }) => {
      if (!ctx.user) {
        return null;
      }
      
      return ctx.user;
    }),
  refresh: publicProcedure
    .input(refreshSchema)
    .mutation(async ({ input, ctx }) => {
      const ip = ctx.req?.ip ?? 'unknown';
      checkRateLimit(ip);
      const { refreshToken } = input;
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      const stored = await ctx.prisma.refreshToken.findUnique({ where: { tokenHash } });
      if (!stored) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Refresh token inválido' });
      }
      if (stored.revoked) {
        // Reuse detection: token já revogado sendo reapresentado → revogar toda a família do usuário
        await ctx.prisma.refreshToken.updateMany({ where: { userId: stored.userId, revoked: false }, data: { revoked: true } });
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Refresh token revogado/reutilizado' });
      }
      if (stored.expiresAt < new Date()) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Refresh token expirado' });
      }

      // Revoga o token atual (rotação)
      await ctx.prisma.refreshToken.update({ where: { tokenHash }, data: { revoked: true } });

      // Emite novos tokens
      const accessToken = generateAccessToken(stored.userId);
      const { token: newRefreshToken, tokenHash: newHash, expiresAt } = createRefreshToken();
      await ctx.prisma.refreshToken.create({ data: { userId: stored.userId, tokenHash: newHash, expiresAt } });

      const user = await ctx.prisma.user.findUnique({ select: { id: true, email: true, name: true, role: true }, where: { id: stored.userId } });
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });

      return { token: accessToken, refreshToken: newRefreshToken, user };
    }),

  logout: publicProcedure
    .input(refreshSchema)
    .mutation(async ({ input, ctx }) => {
      const { refreshToken } = input;
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const stored = await ctx.prisma.refreshToken.findUnique({ where: { tokenHash } });
      if (!stored) return { ok: true };
      await ctx.prisma.refreshToken.update({ where: { tokenHash }, data: { revoked: true } });
      return { ok: true };
    }),
});