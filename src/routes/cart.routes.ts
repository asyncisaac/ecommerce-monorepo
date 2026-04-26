import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';

export function createCartRouter() {
  const router = Router();

  router.get('/cart', requireAuth, asyncHandler(async (req, res) => {
    const result = await req.trpc!.caller.cart.getCart();
    res.json(result);
  }));

  router.get('/cart/summary', requireAuth, asyncHandler(async (req, res) => {
    const result = await req.trpc!.caller.cart.summary();
    res.json(result);
  }));

  router.post('/cart/items', requireAuth, asyncHandler(async (req, res) => {
    const result = await req.trpc!.caller.cart.addItem(req.body);
    res.json(result);
  }));

  router.delete('/cart/items/:itemId', requireAuth, asyncHandler(async (req, res) => {
    const result = await req.trpc!.caller.cart.removeItem({ itemId: String(req.params.itemId) });
    res.json(result);
  }));

  router.patch('/cart/items/:itemId', requireAuth, asyncHandler(async (req, res) => {
    const result = await req.trpc!.caller.cart.updateQuantity({
      itemId: String(req.params.itemId),
      quantity: Number(req.body.quantity),
    });
    res.json(result);
  }));

  router.delete('/cart', requireAuth, asyncHandler(async (req, res) => {
    const result = await req.trpc!.caller.cart.clearCart();
    res.json(result);
  }));

  return router;
}
