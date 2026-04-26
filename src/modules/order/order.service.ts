import { prisma } from '../../lib/prisma.js';
import { Decimal } from 'decimal.js';
import Stripe from 'stripe';
import { TRPCError } from '@trpc/server';
import type { Prisma, PrismaClient } from '@prisma/client';

type DbClient = PrismaClient | Prisma.TransactionClient;

type LogFn = (obj: unknown, msg?: string) => void;
type LoggerLike = { info?: LogFn; warn?: LogFn; error?: LogFn };
type ServiceLogContext = { logger?: LoggerLike; requestId?: string; stripeEventId?: string };

function logInfo(logger: LoggerLike | undefined, obj: unknown, msg: string) {
  logger?.info?.(obj, msg);
}
function logWarn(logger: LoggerLike | undefined, obj: unknown, msg: string) {
  logger?.warn?.(obj, msg);
}
function logError(logger: LoggerLike | undefined, obj: unknown, msg: string) {
  logger?.error?.(obj, msg);
}

export async function checkout(userId: string, log?: ServiceLogContext) {
  const logger = log?.logger;
  const requestId = log?.requestId;

  logInfo(logger, { action: 'checkout_start', requestId, userId }, 'checkout');

  try {
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
      logWarn(logger, { action: 'checkout_fail', status: 'cart_empty', requestId, userId }, 'checkout');
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
          logWarn(logger, {
            action: 'checkout_fail',
            status: 'stock_insufficient',
            requestId,
            userId,
            productId: item.productId,
            quantity: item.quantity,
          }, 'checkout');
          throw new TRPCError({ code: 'CONFLICT', message: `Estoque insuficiente para o produto: ${item.product.name}` });
        }
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return order;
    });

    logInfo(logger, {
      action: 'order_created',
      status: 'PENDING',
      requestId,
      userId,
      orderId: result.id,
      itemsCount: result.items.length,
      total: String((result as any).total),
    }, 'checkout');

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      logInfo(logger, { action: 'checkout_end', status: 'no_payment_provider', requestId, userId, orderId: result.id }, 'checkout');
      return result;
    }

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

    logInfo(logger, {
      action: 'checkout_end',
      status: 'stripe_session_created',
      requestId,
      userId,
      orderId: result.id,
      paymentId,
      paymentSessionId: session.id,
    }, 'checkout');

    return {
      ...result,
      paymentId,
      paymentProvider: 'stripe',
      checkoutUrl: session.url,
      paymentSessionId: session.id,
    };
  } catch (err: any) {
    logError(logger, { action: 'checkout_error', requestId, userId, err }, 'checkout');
    throw err;
  }
}

export async function pay(userId: string, orderId: string, log?: ServiceLogContext) {
  const logger = log?.logger;
  const requestId = log?.requestId;

  logInfo(logger, { action: 'pay_start', requestId, userId, orderId }, 'pay');

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    logWarn(logger, { action: 'pay_fail', status: 'not_configured', requestId, userId, orderId }, 'pay');
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
  if (!order) {
    logWarn(logger, { action: 'pay_fail', status: 'order_not_found', requestId, userId, orderId }, 'pay');
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Ordem não encontrada' });
  }
  if (order.status !== 'PENDING') {
    logWarn(logger, { action: 'pay_fail', status: 'invalid_status', requestId, userId, orderId, orderStatus: order.status }, 'pay');
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este pedido não está pendente de pagamento' });
  }

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

  logInfo(logger, { action: 'pay_end', status: 'stripe_session_created', requestId, userId, orderId: order.id, paymentId, paymentSessionId: session.id }, 'pay');

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
  log?: ServiceLogContext,
) {
  const logger = log?.logger;
  const requestId = log?.requestId;
  const stripeEventId = log?.stripeEventId;

  logInfo(logger, {
    action: 'stripe_session_completed_start',
    requestId,
    stripeEventId,
    orderId: params.orderId,
    paid: params.paid,
  }, 'webhook');

  const nextStatus = params.paid ? 'PROCESSING' : 'PENDING';
  const updated = await db.order.updateMany({
    where: { id: params.orderId, status: 'PENDING' },
    data: { status: nextStatus as any, paymentId: params.paymentId },
  });

  logInfo(logger, {
    action: 'stripe_session_completed_end',
    requestId,
    stripeEventId,
    orderId: params.orderId,
    nextStatus,
    updatedCount: updated.count,
  }, 'webhook');
}

async function cancelPendingOrderAndRestoreStockInner(db: Prisma.TransactionClient, orderId: string, log?: ServiceLogContext) {
  const logger = log?.logger;
  const requestId = log?.requestId;
  const stripeEventId = log?.stripeEventId;

  logInfo(logger, { action: 'order_cancel_start', requestId, stripeEventId, orderId }, 'cancel');

  const order = await db.order.findFirst({
    where: { id: orderId, status: 'PENDING' },
    include: { items: true },
  });
  if (!order) {
    logInfo(logger, { action: 'order_cancel_skip', status: 'not_pending_or_missing', requestId, stripeEventId, orderId }, 'cancel');
    return;
  }

  await db.order.update({
    where: { id: order.id },
    data: { status: 'CANCELLED' as any },
  });

  for (const item of order.items) {
    await db.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    });
    logInfo(logger, {
      action: 'stock_restored',
      requestId,
      stripeEventId,
      orderId: order.id,
      productId: item.productId,
      quantity: item.quantity,
      status: 'restored',
    }, 'cancel');
  }

  logInfo(logger, { action: 'order_cancel_end', status: 'cancelled', requestId, stripeEventId, orderId: order.id }, 'cancel');
}

export async function cancelPendingOrderAndRestoreStock(orderId: string, db: DbClient = prisma, log?: ServiceLogContext) {
  const logger = log?.logger;
  const requestId = log?.requestId;
  const stripeEventId = log?.stripeEventId;

  try {
    if ('$transaction' in db) {
      await (db as PrismaClient).$transaction((tx) => cancelPendingOrderAndRestoreStockInner(tx, orderId, log));
      return;
    }

    await cancelPendingOrderAndRestoreStockInner(db as Prisma.TransactionClient, orderId, log);
  } catch (err: any) {
    logError(logger, { action: 'order_cancel_error', requestId, stripeEventId, orderId, err }, 'cancel');
    throw err;
  }
}
