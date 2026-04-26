import type { CookieOptions } from 'express';

export function getCookieOptions(): CookieOptions {
  const secure = String(process.env.COOKIE_SECURE ?? 'false') === 'true';
  const domain = process.env.COOKIE_DOMAIN;
  const sameSite = secure ? 'none' : 'strict';

  return {
    httpOnly: true,
    sameSite,
    secure,
    ...(domain ? { domain } : {}),
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}
