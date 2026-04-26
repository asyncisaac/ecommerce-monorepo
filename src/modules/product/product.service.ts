import { prisma } from '../../lib/prisma.js';
import { TRPCError } from '@trpc/server';

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export type ProductListInput = {
  category?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  sort: 'priceAsc' | 'priceDesc' | 'recent';
  limit: number;
  page: number;
};

export async function list(input: ProductListInput) {
  const skip = (input.page - 1) * input.limit;

  const where: any = {};
  if (input.category) {
    where.category = {
      name: {
        equals: input.category,
        mode: 'insensitive',
      },
    };
  }
  if (input.q) {
    where.OR = [
      { name: { contains: input.q, mode: 'insensitive' } },
      { description: { contains: input.q, mode: 'insensitive' } },
    ];
  }
  if (typeof input.minPrice !== 'undefined' || typeof input.maxPrice !== 'undefined') {
    where.price = {};
    if (typeof input.minPrice !== 'undefined') (where.price as any).gte = input.minPrice;
    if (typeof input.maxPrice !== 'undefined') (where.price as any).lte = input.maxPrice;
  }

  const orderBy: any =
    input.sort === 'priceAsc'
      ? { price: 'asc' }
      : input.sort === 'priceDesc'
        ? { price: 'desc' }
        : { createdAt: 'desc' };

  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where,
      take: input.limit,
      skip,
      include: {
        variants: true,
        category: true,
      },
      orderBy,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    totalCount,
    totalPages: Math.ceil(totalCount / input.limit),
    currentPage: input.page,
  };
}

export async function byId(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: true,
      reviews: {
        include: {
          user: {
            select: { name: true },
          },
        },
      },
      category: true,
    },
  });

  if (!product) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Produto não encontrado' });
  }

  return product;
}

export async function categories() {
  return prisma.category.findMany({
    select: { id: true, name: true, slug: true },
  });
}

export type AdminCreateCategoryInput = { name: string; slug?: string };
export async function adminCreateCategory(input: AdminCreateCategoryInput) {
  const baseSlug = input.slug?.trim() || slugify(input.name);
  const exists = await prisma.category.findUnique({ where: { slug: baseSlug } });
  const slug = exists ? `${baseSlug}-${Math.random().toString(36).slice(2, 7)}` : baseSlug;
  return prisma.category.create({ data: { name: input.name, slug } });
}

export type AdminUpdateCategoryInput = { id: string; name?: string; slug?: string };
export async function adminUpdateCategory(input: AdminUpdateCategoryInput) {
  const data: any = {};
  if (typeof input.name !== 'undefined') data.name = input.name;
  if (typeof input.slug !== 'undefined') data.slug = input.slug || slugify(data.name || '');
  return prisma.category.update({ where: { id: input.id }, data });
}

export async function adminDeleteCategory(id: string) {
  const prodCount = await prisma.product.count({ where: { categoryId: id } });
  if (prodCount > 0) {
    throw new TRPCError({ code: 'CONFLICT', message: 'Categoria possui produtos vinculados' });
  }
  return prisma.category.delete({ where: { id } });
}

export type AdminCreateProductInput = {
  name: string;
  description: string;
  price: number;
  discount: number;
  stock: number;
  images: string[];
  slug?: string;
  categoryId: string;
};
export async function adminCreateProduct(input: AdminCreateProductInput) {
  const baseSlug = input.slug?.trim() || slugify(input.name);
  const exists = await prisma.product.findUnique({ where: { slug: baseSlug } });
  const slug = exists ? `${baseSlug}-${Math.random().toString(36).slice(2, 7)}` : baseSlug;
  return prisma.product.create({
    data: {
      name: input.name,
      description: input.description,
      price: input.price,
      discount: input.discount,
      stock: input.stock,
      images: input.images,
      slug,
      categoryId: input.categoryId,
    },
  });
}

export type AdminUpdateProductInput = {
  id: string;
  name?: string;
  description?: string;
  price?: number;
  discount?: number;
  stock?: number;
  images?: string[];
  slug?: string;
  categoryId?: string;
};
export async function adminUpdateProduct(input: AdminUpdateProductInput) {
  const data: any = {};
  if (typeof input.name !== 'undefined') data.name = input.name;
  if (typeof input.description !== 'undefined') data.description = input.description;
  if (typeof input.price !== 'undefined') data.price = input.price;
  if (typeof input.discount !== 'undefined') data.discount = input.discount;
  if (typeof input.stock !== 'undefined') data.stock = input.stock;
  if (typeof input.images !== 'undefined') data.images = input.images;
  if (typeof input.slug !== 'undefined') data.slug = input.slug || (data.name ? slugify(data.name) : undefined);
  if (typeof input.categoryId !== 'undefined') data.categoryId = input.categoryId;
  return prisma.product.update({ where: { id: input.id }, data });
}

export async function adminDeleteProduct(id: string) {
  const [cartCount, orderCount] = await Promise.all([
    prisma.cartItem.count({ where: { productId: id } }),
    prisma.orderItem.count({ where: { productId: id } }),
  ]);
  if (cartCount > 0 || orderCount > 0) {
    throw new TRPCError({ code: 'CONFLICT', message: 'Produto vinculado a carrinhos/ordens' });
  }
  return prisma.product.delete({ where: { id } });
}
