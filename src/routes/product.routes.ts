import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getCaller } from '../lib/getCaller.js';

type SortOption = 'priceAsc' | 'priceDesc' | 'recent';
const isSortOption = (v: unknown): v is SortOption =>
  v === 'priceAsc' || v === 'priceDesc' || v === 'recent';

export function createProductRouter() {
  const router = Router();

  router.get('/products', asyncHandler(async (req, res) => {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;

    const sortRaw = typeof req.query.sort === 'string' ? req.query.sort : undefined;
    const sort: SortOption | undefined = isSortOption(sortRaw) ? sortRaw : undefined;

    const minPriceRaw = req.query.minPrice;
    const maxPriceRaw = req.query.maxPrice;
    const minPrice = typeof minPriceRaw === 'string' ? Number(minPriceRaw) : undefined;
    const maxPrice = typeof maxPriceRaw === 'string' ? Number(maxPriceRaw) : undefined;

    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const page = req.query.page ? Number(req.query.page) : 1;

    const { caller } = await getCaller(req, res);
    const result = await caller.product.list({
      category,
      q,
      sort: sort ?? 'recent',
      minPrice: Number.isFinite(minPrice as any) ? minPrice : undefined,
      maxPrice: Number.isFinite(maxPrice as any) ? maxPrice : undefined,
      limit: Number.isFinite(limit as any) ? limit : 20,
      page: Number.isFinite(page as any) ? page : 1,
    });

    res.json(result);
  }));

  router.get('/products/:id', asyncHandler(async (req, res) => {
    const { caller } = await getCaller(req, res);
    const result = await caller.product.byId({ id: String(req.params.id) });
    res.json(result);
  }));

  router.get('/categories', asyncHandler(async (req, res) => {
    const { caller } = await getCaller(req, res);
    const result = await caller.product.categories();
    res.json(result);
  }));

  return router;
}
