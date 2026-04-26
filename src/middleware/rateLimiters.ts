import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

export const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

export const logoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

export const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const noopLimiter: RequestHandler = (_req, _res, next) => next();

export const useLimiter = (limiter: RequestHandler): RequestHandler =>
  (process.env.NODE_ENV === 'test' ? noopLimiter : limiter);
