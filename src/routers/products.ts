import { router, publicProcedure, adminProcedure } from '../lib/trpc.js';
import { z } from 'zod';
import * as productService from '../modules/product/product.service.js';

export const productsRouter = router({
  list: publicProcedure
    .input(z.object({ 
      category: z.string().optional(),
      q: z.string().optional(),
      minPrice: z.number().min(0).optional(),
      maxPrice: z.number().min(0).optional(),
      sort: z.enum(['priceAsc','priceDesc','recent']).default('recent'),
      limit: z.number().min(1).max(100).default(20),
      page: z.number().min(1).default(1)
    }))
    .query(async ({ input }) => {
      return productService.list(input);
    }),
    
  byId: publicProcedure
    .input(z.object({ 
      id: z.string().min(1, 'ID inválido') 
    }))
    .query(async ({ input }) => {
      return productService.byId(input.id);
    }),

  // Categorias públicas
  categories: publicProcedure.query(async () => {
    return productService.categories();
  }),

  // ADMIN: criar categoria
  adminCreateCategory: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      slug: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      return productService.adminCreateCategory(input);
    }),

  // ADMIN: atualizar categoria
  adminUpdateCategory: adminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      slug: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      return productService.adminUpdateCategory(input);
    }),

  // ADMIN: remover categoria (se não tiver produtos)
  adminDeleteCategory: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return productService.adminDeleteCategory(input.id);
    }),

  // ADMIN: criar produto
  adminCreateProduct: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().min(1),
      price: z.number().min(0),
      discount: z.number().min(0).max(100).default(0),
      stock: z.number().int().min(0).default(0),
      images: z.array(z.string()).default([]),
      slug: z.string().optional(),
      categoryId: z.string().min(1)
    }))
    .mutation(async ({ input }) => {
      return productService.adminCreateProduct(input);
    }),

  // ADMIN: atualizar produto
  adminUpdateProduct: adminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      price: z.number().min(0).optional(),
      discount: z.number().min(0).max(100).optional(),
      stock: z.number().int().min(0).optional(),
      images: z.array(z.string()).optional(),
      slug: z.string().optional(),
      categoryId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return productService.adminUpdateProduct(input);
    }),

  // ADMIN: remover produto (se não estiver em ordens/carrinho)
  adminDeleteProduct: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return productService.adminDeleteProduct(input.id);
    }),
});
