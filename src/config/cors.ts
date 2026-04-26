import cors from 'cors';

export function corsMiddleware() {
  const allowedOrigins =
    (process.env.CORS_ORIGIN?.split(',').map(o => o.trim()).filter(Boolean)) ??
    ['http://localhost:3000'];
  const allowedSuffixes =
    (process.env.CORS_ALLOW_SUFFIXES?.split(',').map(s => s.trim()).filter(Boolean)) ??
    ['.vercel.app', '.netlify.app'];

  return cors({
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
  });
}
