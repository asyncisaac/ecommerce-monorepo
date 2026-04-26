import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { type CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { prisma } from './prisma.js';
import jwt from 'jsonwebtoken';

// Interface para o usuário decodificado do JWT
interface JWTPayload {
  userId: string;
  iat: number;
  exp: number;
}

// Contexto para as requisições
export const createContext = async (opts: CreateExpressContextOptions) => {
  const authHeader = opts.req.headers['authorization'];
  let user: any = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice('Bearer '.length);
      const secret = process.env.JWT_SECRET;
      if (!secret || secret.length < 16) {
        // Exigir JWT_SECRET adequado (mínimo de 16 caracteres)
        throw new Error('JWT_SECRET ausente ou fraco');
      }
      const payload: any = jwt.verify(token, secret);
      user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
      });
    } catch (e) {
      user = null;
    }
  }
  const requestId = (opts.req as any).id ?? opts.req.headers['x-request-id'];
  return { prisma, user, req: opts.req, res: opts.res, requestId: requestId ? String(requestId) : undefined };
};

// Inicialização do tRPC
const t = initTRPC.context<typeof createContext>().create({
  transformer: superjson,
});

// Procedimentos base
export const router = t.router;
export const publicProcedure = t.procedure;

// Middleware para verificar autenticação
const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Você precisa estar autenticado',
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Middleware para verificar se o usuário é admin
const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Você precisa estar autenticado',
    });
  }
  
  if (ctx.user.role !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Acesso restrito a administradores',
    });
  }
  
  return next({
    ctx,
  });
});

export const protectedProcedure = t.procedure.use(isAuthenticated);
export const adminProcedure = t.procedure.use(isAdmin);
export const middleware = t.middleware;
