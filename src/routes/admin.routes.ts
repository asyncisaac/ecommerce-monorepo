import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

export function createAdminRouter() {
  const router = Router();

  router.post('/admin/categories', requireAdmin, asyncHandler(async (req, res) => {
    const result = await req.trpc!.caller.product.adminCreateCategory(req.body);
    res.status(201).json(result);
  }));

  router.patch('/admin/categories/:id', requireAdmin, asyncHandler(async (req, res) => {
    const result = await req.trpc!.caller.product.adminUpdateCategory({
      id: String(req.params.id),
      ...req.body,
    });
    res.json(result);
  }));

  router.delete('/admin/categories/:id', requireAdmin, asyncHandler(async (req, res) => {
    const result = await req.trpc!.caller.product.adminDeleteCategory({ id: String(req.params.id) });
    res.json(result);
  }));

  router.post('/admin/products', requireAdmin, asyncHandler(async (req, res) => {
    const result = await req.trpc!.caller.product.adminCreateProduct(req.body);
    res.status(201).json(result);
  }));

  router.patch('/admin/products/:id', requireAdmin, asyncHandler(async (req, res) => {
    const result = await req.trpc!.caller.product.adminUpdateProduct({
      id: String(req.params.id),
      ...req.body,
    });
    res.json(result);
  }));

  router.delete('/admin/products/:id', requireAdmin, asyncHandler(async (req, res) => {
    const result = await req.trpc!.caller.product.adminDeleteProduct({ id: String(req.params.id) });
    res.json(result);
  }));

  router.get('/users', requireAdmin, asyncHandler(async (req, res) => {
    const result = await req.trpc!.caller.user.list();
    res.json(result);
  }));

  router.post('/users', requireAdmin, asyncHandler(async (req, res) => {
    const result = await req.trpc!.caller.user.create(req.body);
    res.status(201).json(result);
  }));

  return router;
}
