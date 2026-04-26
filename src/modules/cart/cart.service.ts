import { prisma } from '../../lib/prisma.js';
import { Decimal } from 'decimal.js';
import { TRPCError } from '@trpc/server';

export type AddCartItemInput = {
  productId: string;
  quantity: number;
  variantId?: string;
};

export type UpdateCartQuantityInput = {
  itemId: string;
  quantity: number;
};

const cartInclude = {
  items: {
    include: {
      product: {
        include: {
          variants: true,
          category: true,
        },
      },
    },
  },
} as const;

const cartItemInclude = {
  product: {
    include: {
      variants: true,
      category: true,
    },
  },
} as const;

export async function getOrCreateCart(userId: string) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: cartInclude,
  });

  if (cart) return cart;

  return prisma.cart.create({
    data: { userId },
    include: cartInclude,
  });
}

export async function addItem(userId: string, input: AddCartItemInput) {
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

  let cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId } });
  }

  const existingItem = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId: input.productId,
      variantId: input.variantId || null,
    },
  });

  if (existingItem) {
    const nextQty = existingItem.quantity + input.quantity;
    if (nextQty > product.stock) {
      throw new TRPCError({ code: 'CONFLICT', message: `Estoque insuficiente para o produto: ${product.name}` });
    }

    return prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: nextQty },
      include: cartItemInclude,
    });
  }

  if (input.quantity > product.stock) {
    throw new TRPCError({ code: 'CONFLICT', message: `Estoque insuficiente para o produto: ${product.name}` });
  }

  return prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId: input.productId,
      variantId: input.variantId,
      quantity: input.quantity,
    },
    include: cartItemInclude,
  });
}

export async function removeItem(userId: string, itemId: string) {
  const item = await prisma.cartItem.findFirst({
    where: {
      id: itemId,
      cart: { userId },
    },
  });

  if (!item) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Item não encontrado' });
  }

  return prisma.cartItem.delete({ where: { id: item.id } });
}

export async function updateQuantity(userId: string, input: UpdateCartQuantityInput) {
  const item = await prisma.cartItem.findFirst({
    where: {
      id: input.itemId,
      cart: { userId },
    },
  });

  if (!item) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Item não encontrado' });
  }

  if (input.quantity === 0) {
    return prisma.cartItem.delete({ where: { id: item.id } });
  }

  const product = await prisma.product.findUnique({
    where: { id: item.productId },
    select: { id: true, name: true, stock: true },
  });
  if (!product) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Produto não encontrado' });
  }

  if (input.quantity > product.stock) {
    throw new TRPCError({ code: 'CONFLICT', message: `Estoque insuficiente para o produto: ${product.name}` });
  }

  return prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity: input.quantity },
    include: cartItemInclude,
  });
}

export async function summary(userId: string) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: cartInclude,
  });

  if (!cart) {
    return {
      itemsCount: 0,
      subtotal: 0,
      discountTotal: 0,
      total: 0,
      currency: 'BRL',
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
    currency: 'BRL',
  };
}

export async function clearCart(userId: string) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
  });

  if (!cart) return { success: true };

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });

  return { success: true };
}
