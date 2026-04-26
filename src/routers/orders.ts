import { router, protectedProcedure } from '../lib/trpc.js';
import { z } from 'zod';
import * as orderService from '../modules/order/order.service.js';

export const orderRouter = router({
  // 🧾 CHECKOUT: cria uma ordem a partir do carrinho do usuário
  checkout: protectedProcedure
    .mutation(async ({ ctx }) => {
      return orderService.checkout(ctx.user.id);
    }),

  pay: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return orderService.pay(ctx.user.id, input.id);
    }),

  // 📦 Listar ordens do usuário
  list: protectedProcedure
    .query(async ({ ctx }) => {
      return orderService.list(ctx.user.id);
    }),

  // 🔎 Detalhe de uma ordem (do próprio usuário)
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return orderService.byId(ctx.user.id, input.id);
    }),
});
