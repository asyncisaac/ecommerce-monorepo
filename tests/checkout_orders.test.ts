import { describe, it, expect } from 'vitest';
import { request, login, hasDb } from './helpers';

// Teste E2E do fluxo de checkout e ordens

describe.skipIf(!hasDb)('Checkout & Orders', () => {
  it('adiciona itens ao carrinho, faz checkout, lista e detalha ordens, e valida estoque/carrinho', async () => {
    const { headers } = await login('test.user1@example.com', 'senha123');

    // Listar produtos e escolher um com estoque > 0
    const list = await request.get('/api/products').set(headers);
    expect(list.statusCode).toBe(200);
    const prod = (list.body?.products || []).find((p: any) => (p.stock ?? 0) > 0);
    expect(prod?.id).toBeTruthy();

    // Adicionar 2 unidades ao carrinho
    const add1 = await request
      .post('/api/cart/items')
      .set(headers)
      .set('Content-Type', 'application/json')
      .send({ productId: prod.id, quantity: 2 });
    expect(add1.statusCode).toBe(200);

    // Summary do carrinho
    const summary = await request.get('/api/cart/summary').set(headers);
    expect(summary.statusCode).toBe(200);
    expect(summary.body?.itemsCount).toBeGreaterThan(0);
    expect(summary.body?.total).toBeGreaterThan(0);

    // Checkout
    const checkout = await request.post('/api/checkout').set(headers);
    expect(checkout.statusCode).toBe(201);
    const order = checkout.body;
    expect(order?.id).toBeTruthy();
    expect(Array.isArray(order?.items)).toBe(true);

    // Listar ordens
    const orders = await request.get('/api/orders').set(headers);
    expect(orders.statusCode).toBe(200);
    expect(Array.isArray(orders.body)).toBe(true);
    const foundOrder = (orders.body as any[]).find((o: any) => o.id === order.id);
    expect(foundOrder?.id).toBe(order.id);

    // Detalhar ordem
    const byId = await request.get(`/api/orders/${order.id}`).set(headers);
    expect(byId.statusCode).toBe(200);
    expect(byId.body?.id).toBe(order.id);

    // Carrinho deve estar vazio
    const cart = await request.get('/api/cart').set(headers);
    expect(cart.statusCode).toBe(200);
    expect((cart.body?.items || []).length).toBe(0);

    // Estoque do produto deve ter diminuído (2 unidades)
    const prodAfter = await request.get(`/api/products/${prod.id}`).set(headers);
    expect(prodAfter.statusCode).toBe(200);
    expect(prodAfter.body?.stock).toBe(prod.stock - 2);
  });
});
