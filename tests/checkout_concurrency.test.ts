import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { hasDb, request } from './helpers';
import { prisma } from '../src/lib/prisma.js';

async function registerAndGetHeaders(email: string) {
  const res = await request
    .post('/api/auth/register')
    .set('Content-Type', 'application/json')
    .send({ name: 'Teste', email, password: 'Senha1234' });

  expect(res.statusCode).toBe(200);
  expect(typeof res.body?.token).toBe('string');

  return { Authorization: `Bearer ${res.body.token as string}` };
}

describe.skipIf(!hasDb)('Checkout concorrente', () => {
  it('dois usuários disputando 1 unidade: 1 sucesso e 1 conflito, sem estoque negativo', async () => {
    const oldStripeKey = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;

    const runId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const email1 = `conc_user1_${runId}@example.com`;
    const email2 = `conc_user2_${runId}@example.com`;

    const created: {
      userIds: string[];
      productId?: string;
      categoryId?: string;
      orderIds: string[];
    } = { userIds: [], orderIds: [] };

    try {
      const category = await prisma.category.create({
        data: { name: `Conc ${runId}`, slug: `conc-${runId}` },
        select: { id: true },
      });
      created.categoryId = category.id;

      const product = await prisma.product.create({
        data: {
          name: `Produto Conc ${runId}`,
          description: 'Conc',
          price: new Prisma.Decimal(10),
          discount: new Prisma.Decimal(0),
          stock: 1,
          images: [],
          slug: `produto-conc-${runId}`,
          categoryId: category.id,
        },
        select: { id: true },
      });
      created.productId = product.id;

      const h1 = await registerAndGetHeaders(email1);
      const h2 = await registerAndGetHeaders(email2);

      const u1 = await prisma.user.findUnique({ where: { email: email1 }, select: { id: true } });
      const u2 = await prisma.user.findUnique({ where: { email: email2 }, select: { id: true } });
      expect(u1?.id).toBeTruthy();
      expect(u2?.id).toBeTruthy();
      created.userIds = [u1!.id, u2!.id];

      const add1 = await request
        .post('/api/cart/items')
        .set(h1)
        .set('Content-Type', 'application/json')
        .send({ productId: product.id, quantity: 1 });
      expect(add1.statusCode).toBe(200);

      const add2 = await request
        .post('/api/cart/items')
        .set(h2)
        .set('Content-Type', 'application/json')
        .send({ productId: product.id, quantity: 1 });
      expect(add2.statusCode).toBe(200);

      const [r1, r2] = await Promise.allSettled([
        request.post('/api/checkout').set(h1),
        request.post('/api/checkout').set(h2),
      ]);

      const responses = [r1, r2].map((r) => {
        if (r.status !== 'fulfilled') throw r.reason;
        return r.value;
      });

      const codes = responses.map((r) => r.statusCode).sort();
      expect(codes).toEqual([201, 409]);

      const success = responses.find((r) => r.statusCode === 201)!;
      expect(typeof success.body?.id).toBe('string');
      created.orderIds.push(success.body.id as string);

      const prodAfter = await prisma.product.findUnique({
        where: { id: product.id },
        select: { stock: true },
      });
      expect(prodAfter?.stock).toBe(0);

      const orders1 = await request.get('/api/orders').set(h1);
      const orders2 = await request.get('/api/orders').set(h2);
      expect(orders1.statusCode).toBe(200);
      expect(orders2.statusCode).toBe(200);

      const countOrders = (orders: any[]) =>
        orders.filter((o) => typeof o?.id === 'string' && o.items?.some((it: any) => it.productId === product.id)).length;

      expect(countOrders(orders1.body)).toBeLessThanOrEqual(1);
      expect(countOrders(orders2.body)).toBeLessThanOrEqual(1);
      expect(countOrders(orders1.body) + countOrders(orders2.body)).toBe(1);
    } finally {
      if (typeof oldStripeKey === 'string') process.env.STRIPE_SECRET_KEY = oldStripeKey;
      else delete process.env.STRIPE_SECRET_KEY;

      for (const orderId of created.orderIds) {
        await prisma.orderItem.deleteMany({ where: { orderId } });
        await prisma.order.deleteMany({ where: { id: orderId } });
      }

      if (created.productId) {
        await prisma.cartItem.deleteMany({ where: { productId: created.productId } });
        await prisma.orderItem.deleteMany({ where: { productId: created.productId } });
        await prisma.product.deleteMany({ where: { id: created.productId } });
      }

      if (created.categoryId) {
        await prisma.category.deleteMany({ where: { id: created.categoryId } });
      }

      for (const userId of created.userIds) {
        await prisma.refreshToken.deleteMany({ where: { userId } });
        const cart = await prisma.cart.findUnique({ where: { userId }, select: { id: true } });
        if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
        await prisma.cart.deleteMany({ where: { userId } });
        await prisma.orderItem.deleteMany({ where: { order: { userId } } });
        await prisma.order.deleteMany({ where: { userId } });
        await prisma.user.deleteMany({ where: { id: userId } });
      }
    }
  });
});

