import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getCaller } from '../lib/getCaller.js';
import { getCookieOptions } from '../config/cookies.js';
import { AppError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  changePasswordLimiter,
  loginLimiter,
  logoutLimiter,
  refreshLimiter,
  registerLimiter,
  useLimiter,
} from '../middleware/rateLimiters.js';

export function createAuthRouter() {
  const router = Router();

  router.post('/auth/register', useLimiter(registerLimiter), asyncHandler(async (req, res) => {
    const { caller } = await getCaller(req, res);
    const result = await caller.auth.register(req.body);

    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, getCookieOptions());
    }

    req.log?.info({
      event: 'auth_register_success',
      requestId: (req as any).id,
      userId: result.user?.id,
      ip: req.ip,
      ua: req.headers['user-agent'],
    }, 'register success');

    res.json(result);
  }));

  router.post('/auth/login', useLimiter(loginLimiter), asyncHandler(async (req, res) => {
    const { caller } = await getCaller(req, res);
    const result = await caller.auth.login(req.body);

    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, getCookieOptions());
    }

    req.log?.info({
      event: 'auth_login_success',
      requestId: (req as any).id,
      userId: result.user?.id,
      ip: req.ip,
      ua: req.headers['user-agent'],
    }, 'login success');

    res.json(result);
  }));

  router.get('/auth/me', requireAuth, asyncHandler(async (req, res) => {
    const result = await req.trpc!.caller.auth.me();
    res.json(result);
  }));

  router.post('/auth/refresh', useLimiter(refreshLimiter), asyncHandler(async (req, res) => {
    const { caller } = await getCaller(req, res);

    const refreshToken =
      (req.body?.refreshToken as string | undefined) ??
      (req.cookies?.refreshToken as string | undefined);

    if (!refreshToken) {
      throw new AppError('Refresh token ausente', 401);
    }

    const result = await caller.auth.refresh({ refreshToken });

    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, getCookieOptions());
    }

    req.log?.info({
      event: 'auth_refresh_success',
      requestId: (req as any).id,
      userId: result.user?.id,
      ip: req.ip,
      ua: req.headers['user-agent'],
    }, 'refresh success');

    res.json(result);
  }));

  router.post('/auth/logout', useLimiter(logoutLimiter), asyncHandler(async (req, res) => {
    const { caller } = await getCaller(req, res);

    const refreshToken =
      (req.body?.refreshToken as string | undefined) ??
      (req.cookies?.refreshToken as string | undefined);

    if (!refreshToken) {
      res.clearCookie('refreshToken', getCookieOptions());
      req.log?.info({
        event: 'auth_logout',
        requestId: (req as any).id,
        ip: req.ip,
        ua: req.headers['user-agent'],
        note: 'no refresh token provided',
      }, 'logout');
      return res.json({ ok: true });
    }

    const result = await caller.auth.logout({ refreshToken });
    res.clearCookie('refreshToken', getCookieOptions());

    req.log?.info({
      event: 'auth_logout',
      requestId: (req as any).id,
      ip: req.ip,
      ua: req.headers['user-agent'],
    }, 'logout');

    return res.json(result);
  }));

  router.get('/user/me', requireAuth, asyncHandler(async (req, res) => {
    const result = await req.trpc!.caller.user.me();
    res.json(result);
  }));

  router.put('/user/me', requireAuth, asyncHandler(async (req, res) => {
    const result = await req.trpc!.caller.user.updateMe(req.body);
    res.json(result);
  }));

  router.put('/user/password', useLimiter(changePasswordLimiter), requireAuth, asyncHandler(async (req, res) => {
    const result = await req.trpc!.caller.user.changePassword(req.body);

    req.log?.info({
      event: 'user_change_password',
      requestId: (req as any).id,
      userId: req.trpc!.ctx.user!.id,
      ip: req.ip,
      ua: req.headers['user-agent'],
    }, 'password changed');

    res.json(result);
  }));

  return router;
}
