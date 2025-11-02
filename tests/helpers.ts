import request from 'supertest';

// Base fixo para evitar conflitos com variáveis de ambiente em ambientes de build
export const base = 'http://localhost:3001';

export async function login(email: string, password: string): Promise<{ token: string; user: any; headers: Record<string, string> }> {
  const res = await request(base)
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