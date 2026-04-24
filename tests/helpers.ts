import supertest from 'supertest';
import net from 'node:net';
import { createApp } from '../src/app.js';

process.env.JWT_SECRET ||= 'test_jwt_secret_min_32_chars_123456';
process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@localhost:5432/ecommerce?schema=public';

function canConnect(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeoutMs);
    socket.once('connect', () => {
      clearTimeout(timer);
      socket.end();
      resolve(true);
    });
    socket.once('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

async function canConnectWithRetry(host: string, port: number): Promise<boolean> {
  const attempts = 25;
  for (let i = 0; i < attempts; i += 1) {
    const ok = await canConnect(host, port, 500);
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

export const hasDb = await canConnectWithRetry('127.0.0.1', 5432);

export const app = createApp();
export const request = supertest(app);
export const agent = () => supertest.agent(app);

export async function login(email: string, password: string): Promise<{ token: string; user: any; headers: Record<string, string> }> {
  const res = await request
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send({ email, password });
  if (res.statusCode !== 200 || !res.body?.token) {
    throw new Error(`Falha ao logar: ${res.statusCode} ${JSON.stringify(res.body)}`);
  }
  const token = res.body.token as string;
  const headers = { Authorization: `Bearer ${token}` };
  return { token, user: res.body.user, headers };
}
