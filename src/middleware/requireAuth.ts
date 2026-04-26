import type { RequestHandler } from 'express';
import { getCaller } from '../lib/getCaller.js';
import { AppError } from './errorHandler.js';

export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    if (!req.trpc) {
      req.trpc = await getCaller(req, res);
    }

    if (!req.trpc.ctx.user) {
      throw new AppError('Não autorizado', 401);
    }

    return next();
  } catch (err) {
    return next(err);
  }
};
