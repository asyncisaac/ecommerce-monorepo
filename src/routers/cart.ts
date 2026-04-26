import { router, publicProcedure, protectedProcedure } from '../lib/trpc.js';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { Decimal } from 'decimal.js';
import { TRPCError } from '@trpc/server';

export const cartRouter = router({
  // 🛒 GET CARRINHO DO USUÁRIO
  getCart: protectedProcedure
    .query(async ({ ctx }) => {
      const cart = await prisma.cart.findUnique({
        where: { userId: ctx.user.id },
        include: {
          items: {
            include: {
              product: {
                include: {
                  variants: true,
                  category: true
                }
              }
            }
          }
        }
      });

      if (!cart) {
        // Se não existe carrinho, cria um vazio
        return await prisma.cart.create({
          data: { userId: ctx.user.id },
          include: {
            items: {
              include: {
                product: {
                  include: {
                    variants: true,
                    category: true
                  }
                }
              }
            }
          }
        });
      }

      return cart;
    }),

  // ➕ ADICIONAR ITEM AO CARRINHO
  addItem: protectedProcedure
    .input(z.object({
      productId: z.string(),
      quantity: z.number().min(1).default(1),
      variantId: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const product = await prisma.product.findUnique({
        where: { id: input.productId },
        select: { id: true, name: true, stock: true },
      });
      if (!product) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Produto não encontrado' });
      }
      if (product.stock <= 0) {
        throw new TRPCError({ code: 'CONFLICT', message: `Produto sem estoque: ${product.name}` });
      }

      if (input.variantId) {
        const variant = await prisma.productVariant.findFirst({
          where: { id: input.variantId, productId: input.productId },
          select: { id: true },
        });
        if (!variant) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Variação não encontrada' });
        }
      }

      // 1. Busca ou cria carrinho
      let cart = await prisma.cart.findUnique({
        where: { userId: ctx.user.id }
      });

      if (!cart) {
        cart = await prisma.cart.create({
          data: { userId: ctx.user.id }
        });
      }

      // 2. Verifica se item já existe no carrinho
      const existingItem = await prisma.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: input.productId,
          variantId: input.variantId || null
        }
      });

      if (existingItem) {
        const nextQty = existingItem.quantity + input.quantity;
        if (nextQty > product.stock) {
          throw new TRPCError({ code: 'CONFLICT', message: `Estoque insuficiente para o produto: ${product.name}` });
        }
        // Atualiza quantidade se já existe
        return await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: nextQty },
          include: { product: true }
        });
      }

      if (input.quantity > product.stock) {
        throw new TRPCError({ code: 'CONFLICT', message: `Estoque insuficiente para o produto: ${product.name}` });
      }

      // 3. Adiciona novo item
      return await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: input.productId,
          variantId: input.variantId,
          quantity: input.quantity
        },
        include: {
          product: {
            include: {
              variants: true,
              category: true
            }
          }
        }
      });
    }),

  // 🗑️ REMOVER ITEM DO CARRINHO
  removeItem: protectedProcedure
    .input(z.object({
      itemId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const item = await prisma.cartItem.findFirst({
        where: {
          id: input.itemId,
          cart: { userId: ctx.user.id },
        },
      });

      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Item não encontrado' });
      }

      return await prisma.cartItem.delete({ where: { id: item.id } });
    }),

  // 📝 ATUALIZAR QUANTIDADE
  updateQuantity: protectedProcedure
    .input(z.object({
      itemId: z.string(),
      quantity: z.number().min(0) // 0 = remove
    }))
    .mutation(async ({ ctx, input }) => {
      const item = await prisma.cartItem.findFirst({
        where: {
          id: input.itemId,
          cart: { userId: ctx.user.id },
        },
      });

      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Item não encontrado' });
      }

      if (input.quantity === 0) {
        // Remove item se quantidade for 0
        return await prisma.cartItem.delete({ where: { id: item.id } });
      }

      return await prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity: input.quantity },
        include: { product: true }
      });
    }),

  // 🧮 RESUMO DO CARRINHO
  summary: protectedProcedure
    .query(async ({ ctx }) => {
      const cart = await prisma.cart.findUnique({
        where: { userId: ctx.user.id },
        include: {
          items: {
            include: {
              product: {
                include: {
                  variants: true,
                  category: true
                }
              }
            }
          }
        }
      });

      if (!cart) {
        return {
          itemsCount: 0,
          subtotal: 0,
          discountTotal: 0,
          total: 0,
          currency: 'BRL'
        };
      }

      let itemsCount = 0;
      let subtotal = new Decimal(0);
      let discountTotal = new Decimal(0);

      for (const item of cart.items) {
        const product = item.product;
        const basePrice = new Decimal(product.price.toString());
        const variant = item.variantId ? product.variants.find(v => v.id === item.variantId) : null;
        const unitPrice = variant?.price ? new Decimal(variant.price.toString()) : basePrice;
        const unitDiscount = unitPrice.mul(new Decimal(product.discount.toString()).div(100));
        const unitFinal = unitPrice.sub(unitDiscount);

        itemsCount += item.quantity;
        subtotal = subtotal.add(unitPrice.mul(item.quantity));
        discountTotal = discountTotal.add(unitDiscount.mul(item.quantity));
      }

      const total = subtotal.sub(discountTotal);

      return {
        itemsCount,
        subtotal: subtotal.toNumber(),
        discountTotal: discountTotal.toNumber(),
        total: total.toNumber(),
        currency: 'BRL'
      };
    }),

  // 🧹 LIMPAR CARRINHO
  clearCart: protectedProcedure
    .mutation(async ({ ctx }) => {
      const cart = await prisma.cart.findUnique({
        where: { userId: ctx.user.id }
      });

      if (!cart) return { success: true };

      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id }
      });

      return { success: true };
    })
});
