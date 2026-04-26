import { router, publicProcedure, protectedProcedure } from '../lib/trpc.js';
import { z } from 'zod';
import * as cartService from '../modules/cart/cart.service.js';

export const cartRouter = router({
  // 🛒 GET CARRINHO DO USUÁRIO
  getCart: protectedProcedure
    .query(async ({ ctx }) => {
      return cartService.getOrCreateCart(ctx.user.id);
    }),

  // ➕ ADICIONAR ITEM AO CARRINHO
  addItem: protectedProcedure
    .input(z.object({
      productId: z.string(),
      quantity: z.number().min(1).default(1),
      variantId: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      return cartService.addItem(ctx.user.id, input);
    }),

  // 🗑️ REMOVER ITEM DO CARRINHO
  removeItem: protectedProcedure
    .input(z.object({
      itemId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      return cartService.removeItem(ctx.user.id, input.itemId);
    }),

  // 📝 ATUALIZAR QUANTIDADE
  updateQuantity: protectedProcedure
    .input(z.object({
      itemId: z.string(),
      quantity: z.number().min(0) // 0 = remove
    }))
    .mutation(async ({ ctx, input }) => {
      return cartService.updateQuantity(ctx.user.id, input);
    }),

  // 🧮 RESUMO DO CARRINHO
  summary: protectedProcedure
    .query(async ({ ctx }) => {
      return cartService.summary(ctx.user.id);
    }),

  // 🧹 LIMPAR CARRINHO
  clearCart: protectedProcedure
    .mutation(async ({ ctx }) => {
      return cartService.clearCart(ctx.user.id);
    })
});
