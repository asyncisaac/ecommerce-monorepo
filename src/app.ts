import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers/index.js';
import { createContext } from './lib/trpc.js';

const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET ausente ou fraco (mínimo 16 caracteres)');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL ausente');
  }
} else {
  process.env.JWT_SECRET ||= 'dev_jwt_secret_min_32_chars_1234567890';
  process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@localhost:5432/ecommerce?schema=public';
}

export function createApp() {
  const app = express();

  const allowedOrigins = (process.env.CORS_ORIGIN?.split(',').map(o => o.trim()).filter(Boolean)) ?? ['http://localhost:3000'];
  const allowedSuffixes = (process.env.CORS_ALLOW_SUFFIXES?.split(',').map(s => s.trim()).filter(Boolean)) ?? ['.vercel.app', '.netlify.app'];
  app.use(cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      try {
        const host = new URL(origin).hostname;
        if (allowedSuffixes.some(sfx => host.endsWith(sfx.replace(/^\./, '')))) {
          return callback(null, true);
        }
      } catch (_) {
      }
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  }));
  app.use(helmet());
  app.use((pinoHttp as any)({
    autoLogging: true,
    genReqId(req: any) {
      const hdr = req.headers?.['x-request-id'];
      return (typeof hdr === 'string' && hdr.trim().length > 0) ? hdr.trim() : randomUUID();
    },
  }));
  app.use((req, res, next) => {
    const id = (req as any).id ?? (req.headers['x-request-id'] as string | undefined);
    if (id) res.setHeader('x-request-id', String(id));
    next();
  });
  app.use(express.json());
  app.use(cookieParser());

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const refreshLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const logoutLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const changePasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
  });

  const noopLimiter: import('express').RequestHandler = (_req, _res, next) => next();
  const useLimiter = (limiter: import('express').RequestHandler) => (process.env.NODE_ENV === 'test' ? noopLimiter : limiter);

  function getCookieOptions() {
    const secure = String(process.env.COOKIE_SECURE ?? 'false') === 'true';
    const domain = process.env.COOKIE_DOMAIN;
    return {
      httpOnly: true as const,
      sameSite: 'strict' as const,
      secure,
      ...(domain ? { domain } : {}),
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    };
  }

  app.get('/', (req, res) => {
    res.json({
      status: 'ok',
      message: 'Backend tRPC está rodando',
      trpcEndpoint: '/trpc',
      docs: 'Use um cliente tRPC (frontend) ou ferramentas como curl/Postman para chamar os procedimentos em /trpc',
    });
  });
  app.get('/healthz', (req, res) => res.send('ok'));

  app.use('/trpc', createExpressMiddleware({ router: appRouter, createContext }));

  app.post('/api/auth/register', useLimiter(registerLimiter), async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.register(req.body);
      if (result.refreshToken) {
        res.cookie('refreshToken', result.refreshToken, getCookieOptions());
      }
      req.log?.info({ event: 'auth_register_success', requestId: (req as any).id, userId: result.user?.id, ip: req.ip, ua: req.headers['user-agent'] }, 'register success');
      res.json(result);
    } catch (e: any) {
      req.log?.warn({ event: 'auth_register_failure', requestId: (req as any).id, ip: req.ip, ua: req.headers['user-agent'], error: e?.message }, 'register failed');
      res.status(400).json({ error: e?.message ?? 'Erro ao registrar' });
    }
  });

  app.post('/api/auth/login', useLimiter(loginLimiter), async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.login(req.body);
      if (result.refreshToken) {
        res.cookie('refreshToken', result.refreshToken, getCookieOptions());
      }
      req.log?.info({ event: 'auth_login_success', requestId: (req as any).id, userId: result.user?.id, ip: req.ip, ua: req.headers['user-agent'] }, 'login success');
      res.json(result);
    } catch (e: any) {
      req.log?.warn({ event: 'auth_login_failure', requestId: (req as any).id, ip: req.ip, ua: req.headers['user-agent'], error: e?.message }, 'login failed');
      res.status(401).json({ error: e?.message ?? 'Credenciais inválidas' });
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.me();
      res.json(result);
    } catch (e: any) {
      res.status(401).json({ error: e?.message ?? 'Não autorizado' });
    }
  });

  app.get('/api/user/me', async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.user.me();
      res.json(result);
    } catch (e: any) {
      res.status(401).json({ error: e?.message ?? 'Não autorizado' });
    }
  });

  app.put('/api/user/me', async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      if (!ctx.user) return res.status(401).json({ error: 'Não autorizado' });
      const caller = appRouter.createCaller(ctx);
      const result = await caller.user.updateMe(req.body);
      res.json(result);
    } catch (e: any) {
      const msg = e?.message ?? 'Erro ao atualizar perfil';
      const status = /cadastrado|inválido|obrigatório/i.test(msg) ? 400 : 500;
      res.status(status).json({ error: msg });
    }
  });

  app.post('/api/auth/refresh', useLimiter(refreshLimiter), async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      const caller = appRouter.createCaller(ctx);
      const refreshToken = (req.body?.refreshToken as string | undefined) ?? (req.cookies?.refreshToken as string | undefined);
      if (!refreshToken) return res.status(401).json({ error: 'Refresh token ausente' });
      const result = await caller.auth.refresh({ refreshToken });
      if (result.refreshToken) {
        res.cookie('refreshToken', result.refreshToken, getCookieOptions());
      }
      req.log?.info({ event: 'auth_refresh_success', requestId: (req as any).id, userId: result.user?.id, ip: req.ip, ua: req.headers['user-agent'] }, 'refresh success');
      res.json(result);
    } catch (e: any) {
      req.log?.warn({ event: 'auth_refresh_failure', requestId: (req as any).id, ip: req.ip, ua: req.headers['user-agent'], error: e?.message }, 'refresh failed');
      res.status(401).json({ error: e?.message ?? 'Refresh inválido' });
    }
  });

  app.post('/api/auth/logout', useLimiter(logoutLimiter), async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      const caller = appRouter.createCaller(ctx);
      const refreshToken = (req.body?.refreshToken as string | undefined) ?? (req.cookies?.refreshToken as string | undefined);
      if (!refreshToken) {
        res.clearCookie('refreshToken', getCookieOptions());
        req.log?.info({ event: 'auth_logout', requestId: (req as any).id, ip: req.ip, ua: req.headers['user-agent'], note: 'no refresh token provided' }, 'logout');
        return res.json({ ok: true });
      }
      const result = await caller.auth.logout({ refreshToken });
      res.clearCookie('refreshToken', getCookieOptions());
      req.log?.info({ event: 'auth_logout', requestId: (req as any).id, ip: req.ip, ua: req.headers['user-agent'] }, 'logout');
      res.json(result);
    } catch (e: any) {
      req.log?.warn({ event: 'auth_logout_failure', ip: req.ip, ua: req.headers['user-agent'], error: e?.message }, 'logout failed');
      res.status(400).json({ error: e?.message ?? 'Erro ao sair' });
    }
  });

  app.get('/api/products', async (req, res) => {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      type SortOption = 'priceAsc' | 'priceDesc' | 'recent';
      const sortRaw = typeof req.query.sort === 'string' ? req.query.sort : undefined;
      const isSortOption = (v: any): v is SortOption => v === 'priceAsc' || v === 'priceDesc' || v === 'recent';
      const sort: SortOption | undefined = isSortOption(sortRaw) ? sortRaw : undefined;
      const minPriceRaw = req.query.minPrice;
      const maxPriceRaw = req.query.maxPrice;
      const minPrice = typeof minPriceRaw === 'string' ? Number(minPriceRaw) : undefined;
      const maxPrice = typeof maxPriceRaw === 'string' ? Number(maxPriceRaw) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const page = req.query.page ? Number(req.query.page) : 1;
      const ctx = await createContext({ req, res } as any);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.product.list({ category, q, sort, minPrice: isNaN(minPrice as any) ? undefined : minPrice, maxPrice: isNaN(maxPrice as any) ? undefined : maxPrice, limit, page });
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e?.message ?? 'Erro ao listar produtos' });
    }
  });

  app.get('/api/cart', async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.cart.getCart();
      res.json(result);
    } catch (e: any) {
      res.status(401).json({ error: e?.message ?? 'Não autorizado' });
    }
  });

  app.get('/api/cart/summary', async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.cart.summary();
      res.json(result);
    } catch (e: any) {
      res.status(401).json({ error: e?.message ?? 'Não autorizado' });
    }
  });

  app.post('/api/cart/items', async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.cart.addItem(req.body);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e?.message ?? 'Erro ao adicionar item' });
    }
  });

  app.delete('/api/cart/items/:itemId', async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.cart.removeItem({ itemId: String(req.params.itemId) });
      res.json(result);
    } catch (e: any) {
      const status = /não encontrado/i.test(e?.message ?? '') ? 404 : 400;
      res.status(status).json({ error: e?.message ?? 'Erro ao remover item' });
    }
  });

  app.patch('/api/cart/items/:itemId', async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.cart.updateQuantity({ itemId: String(req.params.itemId), quantity: Number(req.body.quantity) });
      res.json(result);
    } catch (e: any) {
      const status = /não encontrado/i.test(e?.message ?? '') ? 404 : 400;
      res.status(status).json({ error: e?.message ?? 'Erro ao atualizar quantidade' });
    }
  });

  app.delete('/api/cart', async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.cart.clearCart();
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e?.message ?? 'Erro ao limpar carrinho' });
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.product.byId({ id: String(req.params.id) });
      res.json(result);
    } catch (e: any) {
      res.status(404).json({ error: e?.message ?? 'Produto não encontrado' });
    }
  });

  app.get('/api/categories', async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.product.categories();
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e?.message ?? 'Erro ao listar categorias' });
    }
  });

  app.post('/api/admin/categories', async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      if (!ctx.user) return res.status(401).json({ error: 'Não autorizado' });
      if (ctx.user.role !== 'ADMIN') return res.status(403).json({ error: 'Apenas administradores' });
      const caller = appRouter.createCaller(ctx);
      const result = await caller.product.adminCreateCategory(req.body);
      res.status(201).json(result);
    } catch (e: any) {
      const message = e?.message || 'Erro ao criar categoria';
      const status = /existe|vinculados/i.test(message) ? 409 : 400;
      res.status(status).json({ error: message });
    }
  });

  app.patch('/api/admin/categories/:id', async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      if (!ctx.user) return res.status(401).json({ error: 'Não autorizado' });
      if (ctx.user.role !== 'ADMIN') return res.status(403).json({ error: 'Apenas administradores' });
      const caller = appRouter.createCaller(ctx);
      const result = await caller.product.adminUpdateCategory({ id: String(req.params.id), ...req.body });
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e?.message ?? 'Erro ao atualizar categoria' });
    }
  });

  app.delete('/api/admin/categories/:id', async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      if (!ctx.user) return res.status(401).json({ error: 'Não autorizado' });
      if (ctx.user.role !== 'ADMIN') return res.status(403).json({ error: 'Apenas administradores' });
      const caller = appRouter.createCaller(ctx);
      const result = await caller.product.adminDeleteCategory({ id: String(req.params.id) });
      res.json(result);
    } catch (e: any) {
      const message = e?.message || 'Erro ao remover categoria';
      const status = /vinculados/i.test(message) ? 409 : 400;
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/checkout', async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.order.checkout();
      res.status(201).json(result);
    } catch (e: any) {
      const message = e?.message || 'Erro ao realizar checkout';
      const status = /estoque/i.test(message) ? 409 : 400;
      res.status(status).json({ error: message });
    }
  });

  app.get('/api/orders', async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.order.list();
      res.json(result);
    } catch (e: any) {
      res.status(401).json({ error: e?.message ?? 'Não autorizado' });
    }
  });

  app.get('/api/orders/:id', async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.order.byId({ id: String(req.params.id) });
      res.json(result);
    } catch (e: any) {
      res.status(404).json({ error: e?.message ?? 'Ordem não encontrada' });
    }
  });

  app.post('/api/admin/products', async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      if (!ctx.user) return res.status(401).json({ error: 'Não autorizado' });
      if (ctx.user.role !== 'ADMIN') return res.status(403).json({ error: 'Apenas administradores' });
      const caller = appRouter.createCaller(ctx);
      const result = await caller.product.adminCreateProduct(req.body);
      res.status(201).json(result);
    } catch (e: any) {
      const message = e?.message || 'Erro ao criar produto';
      const status = /vinculado|existe/i.test(message) ? 409 : 400;
      res.status(status).json({ error: message });
    }
  });

  app.patch('/api/admin/products/:id', async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      if (!ctx.user) return res.status(401).json({ error: 'Não autorizado' });
      if (ctx.user.role !== 'ADMIN') return res.status(403).json({ error: 'Apenas administradores' });
      const caller = appRouter.createCaller(ctx);
      const result = await caller.product.adminUpdateProduct({ id: String(req.params.id), ...req.body });
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e?.message ?? 'Erro ao atualizar produto' });
    }
  });

  app.delete('/api/admin/products/:id', async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      if (!ctx.user) return res.status(401).json({ error: 'Não autorizado' });
      if (ctx.user.role !== 'ADMIN') return res.status(403).json({ error: 'Apenas administradores' });
      const caller = appRouter.createCaller(ctx);
      const result = await caller.product.adminDeleteProduct({ id: String(req.params.id) });
      res.json(result);
    } catch (e: any) {
      const message = e?.message || 'Erro ao remover produto';
      const status = /vinculado/i.test(message) ? 409 : 400;
      res.status(status).json({ error: message });
    }
  });

  app.get('/api/users', async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      if (!ctx.user) return res.status(401).json({ error: 'Não autorizado' });
      if (ctx.user.role !== 'ADMIN') return res.status(403).json({ error: 'Apenas administradores' });
      const caller = appRouter.createCaller(ctx);
      const result = await caller.user.list();
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e?.message ?? 'Erro ao listar usuários' });
    }
  });

  app.post('/api/users', async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      if (!ctx.user) return res.status(401).json({ error: 'Não autorizado' });
      if (ctx.user.role !== 'ADMIN') return res.status(403).json({ error: 'Apenas administradores' });
      const caller = appRouter.createCaller(ctx);
      const result = await caller.user.create(req.body);
      res.status(201).json(result);
    } catch (e: any) {
      const message = e?.message || '';
      const status = /existe/i.test(message) ? 409 : 400;
      res.status(status).json({ error: message || 'Erro ao criar usuário' });
    }
  });

  app.put('/api/user/password', useLimiter(changePasswordLimiter), async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      if (!ctx.user) return res.status(401).json({ error: 'Não autorizado' });
      const caller = appRouter.createCaller(ctx);
      const result = await caller.user.changePassword(req.body);
      req.log?.info({ event: 'user_change_password', requestId: (req as any).id, userId: ctx.user.id, ip: req.ip, ua: req.headers['user-agent'] }, 'password changed');
      res.json(result);
    } catch (e: any) {
      const msg = e?.message ?? 'Erro ao alterar senha';
      const status = /obrigatória|incorreta|inválida|caracteres|letras e números/i.test(msg) ? 400 : 500;
      req.log?.warn({ event: 'user_change_password_failure', requestId: (req as any).id, ip: req.ip, ua: req.headers['user-agent'], error: msg }, 'password change failed');
      res.status(status).json({ error: msg });
    }
  });

  return app;
}
