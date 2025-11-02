import { router, protectedProcedure } from '../lib/trpc.js';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { Decimal } from 'decimal.js';

export const orderRouter = router({
  // 🧾 CHECKOUT: cria uma ordem a partir do carrinho do usuário
  checkout: protectedProcedure
    .mutation(async ({ ctx }) => {
      const cart = await prisma.cart.findUnique({
        where: { userId: ctx.user.id },
        include: {
          items: {
            include: {
              product: { include: { variants: true } }
            }
          }
        }
      });

      if (!cart || cart.items.length === 0) {
        throw new Error('Carrinho vazio');
      }

      const result = await prisma.$transaction(async (tx) => {
        let subtotal = new Decimal(0);
        let discountTotal = new Decimal(0);

        // Valida estoque e prepara itens da ordem
        const orderItemsData = cart.items.map((item) => {
          const product = item.product;
          const variant = item.variantId ? product.variants.find(v => v.id === item.variantId) : null;
          const unitPrice = variant?.price ? new Decimal(variant.price.toString()) : new Decimal(product.price.toString());
          const unitDiscount = unitPrice.mul(new Decimal(product.discount.toString()).div(100));
          const unitFinal = unitPrice.sub(unitDiscount);

          // estoque
          if (product.stock < item.quantity) {
            throw new Error(`Estoque insuficiente para o produto: ${product.name}`);
          }

          subtotal = subtotal.add(unitPrice.mul(item.quantity));
          discountTotal = discountTotal.add(unitDiscount.mul(item.quantity));

          return {
            productId: product.id,
            quantity: item.quantity,
            price: unitFinal,
          };
        });

        const total = subtotal.sub(discountTotal);

        // Cria ordem e itens
        const order = await tx.order.create({
          data: {
            userId: ctx.user.id,
            total,
            status: 'PENDING',
            items: {
              create: orderItemsData,
            },
          },
          include: {
            items: { include: { product: true } }
          }
        });

        // Baixa de estoque
        for (const item of cart.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } }
          });
        }

        // Limpa carrinho
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

        return order;
      });

      return result;
    }),

  // 📦 Listar ordens do usuário
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const orders = await prisma.order.findMany({
        where: { userId: ctx.user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          items: { include: { product: true } },
        }
      });
      return orders;
    }),

  // 🔎 Detalhe de uma ordem (do próprio usuário)
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const order = await prisma.order.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: { items: { include: { product: true } } }
      });
      if (!order) {
        throw new Error('Ordem não encontrada');
      }
      return order;
    }),
});