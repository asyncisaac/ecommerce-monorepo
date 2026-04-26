import { router, protectedProcedure } from '../lib/trpc.js';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { Decimal } from 'decimal.js';
import Stripe from 'stripe';
import { TRPCError } from '@trpc/server';

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
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Carrinho vazio' });
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
          const updated = await tx.product.updateMany({
            where: { id: item.productId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (updated.count !== 1) {
            throw new TRPCError({ code: 'CONFLICT', message: `Estoque insuficiente para o produto: ${item.product.name}` });
          }
        }

        // Limpa carrinho
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

        return order;
      });

      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) return result;

      const appUrl =
        process.env.APP_URL ||
        process.env.CORS_ORIGIN?.split(',').map(s => s.trim()).filter(Boolean)?.[0] ||
        'http://localhost:3000';

      const stripe = new Stripe(stripeSecretKey);

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        client_reference_id: result.id,
        metadata: { orderId: result.id, userId: ctx.user.id },
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

      return {
        ...result,
        paymentId,
        paymentProvider: 'stripe',
        checkoutUrl: session.url,
        paymentSessionId: session.id,
      };
    }),

  pay: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) {
        throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: 'Pagamentos não configurados' });
      }

      const appUrl =
        process.env.APP_URL ||
        process.env.CORS_ORIGIN?.split(',').map(s => s.trim()).filter(Boolean)?.[0] ||
        'http://localhost:3000';

      const order = await prisma.order.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: { items: { include: { product: true } } },
      });
      if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Ordem não encontrada' });
      if (order.status !== 'PENDING') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este pedido não está pendente de pagamento' });

      const stripe = new Stripe(stripeSecretKey);

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        client_reference_id: order.id,
        metadata: { orderId: order.id, userId: ctx.user.id },
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

      return {
        paymentProvider: 'stripe',
        checkoutUrl: session.url,
        paymentSessionId: session.id,
        orderId: order.id,
      };
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
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ordem não encontrada' });
      }
      return order;
    }),
});
