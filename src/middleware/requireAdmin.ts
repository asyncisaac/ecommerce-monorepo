import type { RequestHandler } from 'express';
import { getCaller } from '../lib/getCaller.js';
import { AppError } from './errorHandler.js';

export const requireAdmin: RequestHandler = async (req, res, next) => {
  try {
    if (!req.trpc) {
      req.trpc = await getCaller(req, res);
    }

    if (!req.trpc.ctx.user) {
      throw new AppError('Não autorizado', 401);
    }

    if (req.trpc.ctx.user.role !== 'ADMIN') {
      throw new AppError('Apenas administradores', 403);
    }

    return next();
  } catch (err) {
    return next(err);
  }
};
