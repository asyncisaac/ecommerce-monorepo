import { describe, it, expect } from 'vitest';
import { agent, hasDb } from './helpers';

// Credenciais de teste já existentes no seed
const TEST_EMAIL = 'test.user1@example.com';
const TEST_PASSWORD = 'senha123';

// Helper para verificar se o header Set-Cookie contem o refreshToken
function hasRefreshCookie(setCookie?: string[] | string): boolean {
  if (!setCookie) return false;
  const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
  return arr.some((c) => /(^|;\s*)refreshToken=/.test(c));
}

describe.skipIf(!hasDb)('Auth Smoke: login -> refresh via cookie -> logout -> refresh deve falhar', () => {
  const a = agent();

  it('Login deve retornar token e setar cookie HttpOnly de refreshToken', async () => {
    const res = await a
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');

    // Compat: backend também retorna refreshToken no body, mas vamos checar cookie
    expect(hasRefreshCookie(res.headers['set-cookie'])).toBe(true);
  });

  it('Refresh via cookie deve rotacionar refreshToken e emitir novo access token', async () => {
    const res = await a
      .post('/api/auth/refresh')
      .set('Content-Type', 'application/json')
      .send({})
      .expect(200);

    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');

    // Deve trazer um novo refreshToken no body por compatibilidade
    expect(res.body).toHaveProperty('refreshToken');
    expect(typeof res.body.refreshToken).toBe('string');

    // E manter cookie atualizado
    expect(hasRefreshCookie(res.headers['set-cookie'])).toBe(true);
  });

  it('Logout deve revogar refreshToken e limpar cookie; refresh subsequente deve falhar', async () => {
    const resLogout = await a
      .post('/api/auth/logout')
      .set('Content-Type', 'application/json')
      .send({})
      .expect(200);

    expect(resLogout.body).toHaveProperty('ok');
    expect(resLogout.body.ok).toBe(true);

    // Após logout, tentar refresh deve falhar
    const resRefreshFail = await a
      .post('/api/auth/refresh')
      .set('Content-Type', 'application/json')
      .send({})
      .expect(401);

    // Mensagem pode variar, validar presença de erro
    expect(resRefreshFail.body).toHaveProperty('error');
  });
});
