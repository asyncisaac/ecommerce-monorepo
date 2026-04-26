import express, { Router } from 'express';
import Stripe from 'stripe';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import * as orderService from '../modules/order/order.service.js';

export function createOrderRouter() {
  const router = Router();

  router.post('/checkout', requireAuth, asyncHandler(async (req, res) => {
    const result = await req.trpc!.caller.order.checkout();
    res.status(201).json(result);
  }));

  router.post('/orders/:id/pay', requireAuth, asyncHandler(async (req, res) => {
    const result = await req.trpc!.caller.order.pay({ id: String(req.params.id) });
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
        });
      }
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (typeof orderId === 'string' && orderId.trim().length > 0) {
        await orderService.cancelPendingOrderAndRestoreStock(orderId);
      }
    }

    return res.json({ received: true });
  }));

  return router;
}
