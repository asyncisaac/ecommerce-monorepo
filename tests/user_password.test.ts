import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { base } from './helpers';

// Gera email único para evitar colisão entre execuções
function uniqueEmail() {
  const ts = Date.now();
  return `pwd.user.${ts}@example.com`;
}

describe('User Password: registrar -> trocar senha -> login com nova senha -> reverter', () => {
  const agent = supertest.agent(base);
  const email = uniqueEmail();
  const initialPassword = 'SenhaInicial123'; // atende regex (letras e números)
  const newPassword = 'SenhaNova123';

  it('Registra usuário de teste e realiza login', async () => {
    const resReg = await agent
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send({ name: 'User Pwd', email, password: initialPassword })
      .expect(200);
    expect(resReg.body).toHaveProperty('token');

    const resLogin = await agent
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email, password: initialPassword })
      .expect(200);
    expect(resLogin.body).toHaveProperty('token');
  });

  it('Troca a senha usando endpoint protegido e faz login com a nova senha', async () => {
    // Obter token atual
    const resLogin = await agent
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email, password: initialPassword })
      .expect(200);
    const token = resLogin.body.token as string;

    // Trocar senha
    const resChange = await agent
      .put('/api/user/password')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: initialPassword, newPassword })
      .expect(200);
    expect(resChange.body).toHaveProperty('ok');
    expect(resChange.body.ok).toBe(true);

    // Login com nova senha
    const resLoginNew = await agent
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email, password: newPassword })
      .expect(200);
    expect(resLoginNew.body).toHaveProperty('token');
  });

  it('Reverte a senha para o valor inicial e valida login', async () => {
    const resLoginNew = await agent
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email, password: newPassword })
      .expect(200);
    const tokenNew = resLoginNew.body.token as string;

    const resRevert = await agent
      .put('/api/user/password')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${tokenNew}`)
      .send({ oldPassword: newPassword, newPassword: initialPassword })
      .expect(200);
    expect(resRevert.body).toHaveProperty('ok');
    expect(resRevert.body.ok).toBe(true);

    // Login com senha inicial novamente
    const resLoginInitial = await agent
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email, password: initialPassword })
      .expect(200);
    expect(resLoginInitial.body).toHaveProperty('token');
  });
});