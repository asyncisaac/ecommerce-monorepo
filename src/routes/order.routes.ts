import express, { Router } from 'express';
import Stripe from 'stripe';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import * as orderService from '../modules/order/order.service.js';
import { prisma } from '../lib/prisma.js';

export function createOrderRouter() {
  const router = Router();

  router.post('/checkout', requireAuth, asyncHandler(async (req, res) => {
    req.log?.info({
      event: 'order_checkout_start',
      requestId: (req as any).id,
      userId: req.trpc!.ctx.user!.id,
      ip: req.ip,
      ua: req.headers['user-agent'],
    }, 'checkout start');

    const result = await req.trpc!.caller.order.checkout();

    req.log?.info({
      event: 'order_checkout_success',
      requestId: (req as any).id,
      userId: req.trpc!.ctx.user!.id,
      orderId: (result as any)?.id,
      paymentProvider: (result as any)?.paymentProvider,
    }, 'checkout success');

    res.status(201).json(result);
  }));

  router.post('/orders/:id/pay', requireAuth, asyncHandler(async (req, res) => {
    req.log?.info({
      event: 'order_pay_start',
      requestId: (req as any).id,
      userId: req.trpc!.ctx.user!.id,
      orderId: String(req.params.id),
      ip: req.ip,
      ua: req.headers['user-agent'],
    }, 'pay start');

    const result = await req.trpc!.caller.order.pay({ id: String(req.params.id) });

    req.log?.info({
      event: 'order_pay_success',
      requestId: (req as any).id,
      userId: req.trpc!.ctx.user!.id,
      orderId: String(req.params.id),
    }, 'pay success');

    res.status(201).json(result);
  }));

  router.get('/orders', requireAuth, asyncHandler(async (req, res) => {
    const result = await req.trpc!.caller.order.list();
    res.json(result);
  }));

  router.get('/orders/:id', requireAuth, asyncHandler(async (req, res) => {
    const result = await req.trpc!.caller.order.byId({ id: String(req.params.id) });
    res.json(result);
  }));

  return router;
}

export function createStripeWebhookRouter() {
  const router = Router();

  router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), asyncHandler(async (req, res) => {
    const requestId = (req as any).id ? String((req as any).id) : undefined;

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecretKey || !stripeWebhookSecret) {
      return res.status(501).json({ error: 'Stripe webhook não configurado' });
    }

    const signature = req.headers['stripe-signature'];
    if (typeof signature !== 'string' || signature.trim().length === 0) {
      return res.status(400).json({ error: 'Stripe signature ausente' });
    }

    const stripe = new Stripe(stripeSecretKey);

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
    } catch (e: any) {
      return res.status(400).json({ error: e?.message ?? 'Webhook inválido' });
    }

    const result = await prisma.$transaction(async (tx) => {
      try {
        await tx.stripeWebhookEvent.create({
          data: { id: event.id, type: event.type },
        });
      } catch (err: any) {
        if (err?.code === 'P2002') {
          req.log?.info({
            action: 'webhook_duplicate',
            requestId,
            stripeEventId: event.id,
            type: event.type,
            status: 'ignored',
          }, 'webhook');
          return { duplicate: true };
        }
        throw err;
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        if (typeof orderId === 'string' && orderId.trim().length > 0) {
          const paymentId =
            (typeof session.payment_intent === 'string' && session.payment_intent)
              ? session.payment_intent
              : session.id;
          await orderService.markStripeSessionCompleted({
            orderId,
            paymentId,
            paid: session.payment_status === 'paid',
          }, tx, { logger: req.log as any, requestId, stripeEventId: event.id });
        }
      }

      if (event.type === 'checkout.session.expired') {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        if (typeof orderId === 'string' && orderId.trim().length > 0) {
          await orderService.cancelPendingOrderAndRestoreStock(orderId, tx, { logger: req.log as any, requestId, stripeEventId: event.id });
        }
      }

      return { duplicate: false };
    });

    req.log?.info({
      event: 'stripe_webhook_processed',
      stripeEventId: event.id,
      stripeEventType: event.type,
      duplicate: result.duplicate,
      requestId: (req as any).id,
    }, 'stripe webhook');

    return res.json({ received: true, ...result });
  }));

  return router;
}
