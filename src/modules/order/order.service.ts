import { prisma } from '../../lib/prisma.js';
import { Decimal } from 'decimal.js';
import Stripe from 'stripe';
import { TRPCError } from '@trpc/server';
import type { Prisma, PrismaClient } from '@prisma/client';

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function checkout(userId: string) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: { include: { variants: true } },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Carrinho vazio' });
  }

  const result = await prisma.$transaction(async (tx) => {
    let subtotal = new Decimal(0);
    let discountTotal = new Decimal(0);

    const orderItemsData = cart.items.map((item) => {
      const product = item.product;
      const variant = item.variantId ? product.variants.find(v => v.id === item.variantId) : null;
      const unitPrice = variant?.price ? new Decimal(variant.price.toString()) : new Decimal(product.price.toString());
      const unitDiscount = unitPrice.mul(new Decimal(product.discount.toString()).div(100));
      const unitFinal = unitPrice.sub(unitDiscount);

      subtotal = subtotal.add(unitPrice.mul(item.quantity));
      discountTotal = discountTotal.add(unitDiscount.mul(item.quantity));

      return {
        productId: product.id,
        quantity: item.quantity,
        price: unitFinal,
      };
    });

    const total = subtotal.sub(discountTotal);

    const order = await tx.order.create({
      data: {
        userId,
        total,
        status: 'PENDING',
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: { include: { product: true } },
      },
    });

    for (const item of cart.items) {
      const updated = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (updated.count !== 1) {
        throw new TRPCError({ code: 'CONFLICT', message: `Estoque insuficiente para o produto: ${item.product.name}` });
      }
    }

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return order;
  });

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) return result;

  const appUrl =
    process.env.APP_URL ||
    process.env.CORS_ORIGIN?.split(',').map(s => s.trim()).filter(Boolean)?.[0] ||
    'http://localhost:3000';

  const stripe = new Stripe(stripeSecretKey);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    client_reference_id: result.id,
    metadata: { orderId: result.id, userId },
    success_url: `${appUrl}/orders/${result.id}?success=1`,
    cancel_url: `${appUrl}/cart?canceled=1&orderId=${result.id}`,
    line_items: result.items.map((it) => ({
      quantity: it.quantity,
      price_data: {
        currency: 'brl',
        unit_amount: Math.max(0, Math.round(Number(it.price) * 100)),
        product_data: {
          name: it.product?.name ?? 'Produto',
        },
      },
    })),
  });

  const paymentId = (typeof session.payment_intent === 'string' && session.payment_intent) ? session.payment_intent : session.id;
  await prisma.order.update({
    where: { id: result.id },
    data: { paymentId },
  });

  return {
    ...result,
    paymentId,
    paymentProvider: 'stripe',
    checkoutUrl: session.url,
    paymentSessionId: session.id,
  };
}

export async function pay(userId: string, orderId: string) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: 'Pagamentos não configurados' });
  }

  const appUrl =
    process.env.APP_URL ||
    process.env.CORS_ORIGIN?.split(',').map(s => s.trim()).filter(Boolean)?.[0] ||
    'http://localhost:3000';

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { items: { include: { product: true } } },
  });
  if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Ordem não encontrada' });
  if (order.status !== 'PENDING') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este pedido não está pendente de pagamento' });

  const stripe = new Stripe(stripeSecretKey);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    client_reference_id: order.id,
    metadata: { orderId: order.id, userId },
    success_url: `${appUrl}/orders/${order.id}?success=1`,
    cancel_url: `${appUrl}/orders/${order.id}?canceled=1`,
    line_items: order.items.map((it) => ({
      quantity: it.quantity,
      price_data: {
        currency: 'brl',
        unit_amount: Math.max(0, Math.round(Number(it.price) * 100)),
        product_data: { name: it.product?.name ?? 'Produto' },
      },
    })),
  });

  const paymentId = (typeof session.payment_intent === 'string' && session.payment_intent) ? session.payment_intent : session.id;
  await prisma.order.update({ where: { id: order.id }, data: { paymentId } });

  return {
    paymentProvider: 'stripe',
    checkoutUrl: session.url,
    paymentSessionId: session.id,
    orderId: order.id,
  };
}

export async function list(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      items: { include: { product: true } },
    },
  });
}

export async function byId(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { items: { include: { product: true } } },
  });
  if (!order) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Ordem não encontrada' });
  }
  return order;
}

export async function markStripeSessionCompleted(
  params: { orderId: string; paymentId: string; paid: boolean },
  db: DbClient = prisma,
) {
  const nextStatus = params.paid ? 'PROCESSING' : 'PENDING';
  await db.order.updateMany({
    where: { id: params.orderId, status: 'PENDING' },
    data: { status: nextStatus as any, paymentId: params.paymentId },
  });
}

async function cancelPendingOrderAndRestoreStockInner(db: Prisma.TransactionClient, orderId: string) {
  const order = await db.order.findFirst({
    where: { id: orderId, status: 'PENDING' },
    include: { items: true },
  });
  if (!order) return;

  await db.order.update({
    where: { id: order.id },
    data: { status: 'CANCELLED' as any },
  });

  for (const item of order.items) {
    await db.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    });
  }
}

export async function cancelPendingOrderAndRestoreStock(orderId: string, db: DbClient = prisma) {
  if ('$transaction' in db) {
    await (db as PrismaClient).$transaction((tx) => cancelPendingOrderAndRestoreStockInner(tx, orderId));
    return;
  }

  await cancelPendingOrderAndRestoreStockInner(db as Prisma.TransactionClient, orderId);
}
