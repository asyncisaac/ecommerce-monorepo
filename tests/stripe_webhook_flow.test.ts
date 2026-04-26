import { describe, it, expect } from 'vitest';
import Stripe from 'stripe';
import { hasDb, request, login } from './helpers';
import { prisma } from '../src/lib/prisma.js';

const TEST_EMAIL = 'test.user1@example.com';
const TEST_PASSWORD = 'senha123';

describe.skipIf(!hasDb)('Stripe Webhook: idempotência + cancelamento devolve estoque', () => {
  it('checkout -> webhook expired (2x) deve cancelar e restaurar estoque apenas uma vez', async () => {
    const oldStripeKey = process.env.STRIPE_SECRET_KEY;
    const oldWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const { headers } = await login(TEST_EMAIL, TEST_PASSWORD);

    const clear = await request.delete('/api/cart').set(headers);
    expect(clear.statusCode).toBe(200);

    const list = await request.get('/api/products').set(headers);
    expect(list.statusCode).toBe(200);
    const products = (list.body?.products || []) as any[];
    const prod = products.find((p) => (p.stock ?? 0) > 0);
    expect(prod?.id).toBeTruthy();
    const qty = 1;
    const prodBefore = await request.get(`/api/products/${prod.id}`).set(headers);
    expect(prodBefore.statusCode).toBe(200);
    const stockBefore = Number(prodBefore.body?.stock);

    const add = await request
      .post('/api/cart/items')
      .set(headers)
      .set('Content-Type', 'application/json')
      .send({ productId: prod.id, quantity: qty });
    expect(add.statusCode).toBe(200);

    const checkout = await request.post('/api/checkout').set(headers);
    expect(checkout.statusCode).toBe(201);
    const orderId = checkout.body?.id as string | undefined;
    expect(typeof orderId).toBe('string');

    const prodAfterCheckout = await request.get(`/api/products/${prod.id}`).set(headers);
    expect(prodAfterCheckout.statusCode).toBe(200);
    expect(prodAfterCheckout.body?.stock).toBe(stockBefore - qty);

    const webhookSecret = 'whsec_test_123';
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;

    const stripe = new Stripe('sk_test_dummy');
    const stripeEventId = `evt_test_${Date.now()}`;
    const payload = JSON.stringify({
      id: stripeEventId,
      object: 'event',
      api_version: '2020-08-27',
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      pending_webhooks: 1,
      type: 'checkout.session.expired',
      data: {
        object: {
          id: 'cs_test_123',
          object: 'checkout.session',
          metadata: { orderId },
          payment_intent: null,
          payment_status: 'unpaid',
        },
      },
      request: { id: null, idempotency_key: null },
    });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });

    const w1 = await request
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', signature)
      .send(payload);
    expect(w1.statusCode).toBe(200);
    expect(w1.body).toMatchObject({ received: true, duplicate: false });

    const prodAfterExpired = await request.get(`/api/products/${prod.id}`).set(headers);
    expect(prodAfterExpired.statusCode).toBe(200);
    expect(prodAfterExpired.body?.stock).toBe(stockBefore);

    const w2 = await request
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', signature)
      .send(payload);
    expect(w2.statusCode).toBe(200);
    expect(w2.body).toMatchObject({ received: true, duplicate: true });

    const prodAfterSecond = await request.get(`/api/products/${prod.id}`).set(headers);
    expect(prodAfterSecond.statusCode).toBe(200);
    expect(prodAfterSecond.body?.stock).toBe(stockBefore);

    if (typeof oldStripeKey === 'string') process.env.STRIPE_SECRET_KEY = oldStripeKey;
    else delete process.env.STRIPE_SECRET_KEY;
    if (typeof oldWebhookSecret === 'string') process.env.STRIPE_WEBHOOK_SECRET = oldWebhookSecret;
    else delete process.env.STRIPE_WEBHOOK_SECRET;

    await prisma.orderItem.deleteMany({ where: { orderId } });
    await prisma.order.delete({ where: { id: orderId } });
    const evt = await prisma.stripeWebhookEvent.findUnique({ where: { id: stripeEventId } });
    if (evt) await prisma.stripeWebhookEvent.delete({ where: { id: stripeEventId } });
  });
});
