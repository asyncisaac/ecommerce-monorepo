import type { ErrorRequestHandler } from 'express';
import { TRPCError } from '@trpc/server';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

function trpcCodeToStatus(code: string): number {
  switch (code) {
    case 'BAD_REQUEST':
      return 400;
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'CONFLICT':
      return 409;
    case 'TOO_MANY_REQUESTS':
      return 429;
    case 'NOT_IMPLEMENTED':
      return 501;
    default:
      return 500;
  }
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err instanceof TRPCError) {
    return res.status(trpcCodeToStatus(err.code)).json({ error: err.message });
  }

  const isProd = process.env.NODE_ENV === 'production';
  const message = (typeof err?.message === 'string' && err.message.trim().length > 0)
    ? err.message
    : 'Erro interno';

  req.log?.error?.({ err, message }, 'request_error');
  return res.status(500).json({ error: isProd ? 'Erro interno' : message });
};
