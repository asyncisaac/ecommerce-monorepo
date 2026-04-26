import 'dotenv/config';

export function loadEnv() {
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 16) {
      throw new Error('JWT_SECRET ausente ou fraco (mínimo 16 caracteres)');
    }
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL ausente');
    }
    return;
  }

  process.env.JWT_SECRET ||= 'dev_jwt_secret_min_32_chars_1234567890';
  process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@localhost:5432/ecommerce?schema=public';
}
