import { router, publicProcedure, adminProcedure } from '../lib/trpc.js';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

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
      const skip = (input.page - 1) * input.limit;

      const where: any = {};
      if (input.category) {
        where.category = {
          name: {
            equals: input.category,
            mode: 'insensitive'
          }
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
      
      const orderBy: any = input.sort === 'priceAsc' ? { price: 'asc' } : input.sort === 'priceDesc' ? { price: 'desc' } : { createdAt: 'desc' };
      
      const [products, totalCount] = await Promise.all([
        prisma.product.findMany({
          where,
          take: input.limit,
          skip,
          include: { 
            variants: true,
            category: true
          },
          orderBy
        }),
        prisma.product.count({ where })
      ]);

      return {
        products,
        totalCount,
        totalPages: Math.ceil(totalCount / input.limit),
        currentPage: input.page
      };
    }),
    
  byId: publicProcedure
    .input(z.object({ 
      id: z.string().min(1, 'ID inválido') 
    }))
    .query(async ({ input }) => {
      const product = await prisma.product.findUnique({
        where: { id: input.id },
        include: { 
          variants: true, 
          reviews: {
            include: {
              user: {
                select: { name: true } // Não retorna dados sensíveis
              }
            }
          },
          category: true
        }
      });

      if (!product) {
        throw new Error('Produto não encontrado');
      }

      return product;
    }),

  // Categorias públicas
  categories: publicProcedure.query(async () => {
    const categories = await prisma.category.findMany({
      select: { id: true, name: true, slug: true }
    });
    return categories;
  }),

  // ADMIN: criar categoria
  adminCreateCategory: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      slug: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const baseSlug = input.slug?.trim() || slugify(input.name);
      const exists = await prisma.category.findUnique({ where: { slug: baseSlug } });
      const slug = exists ? `${baseSlug}-${Math.random().toString(36).slice(2,7)}` : baseSlug;
      return prisma.category.create({ data: { name: input.name, slug } });
    }),

  // ADMIN: atualizar categoria
  adminUpdateCategory: adminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      slug: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const data: any = {};
      if (typeof input.name !== 'undefined') data.name = input.name;
      if (typeof input.slug !== 'undefined') data.slug = input.slug || slugify(data.name || '');
      return prisma.category.update({ where: { id: input.id }, data });
    }),

  // ADMIN: remover categoria (se não tiver produtos)
  adminDeleteCategory: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const prodCount = await prisma.product.count({ where: { categoryId: input.id } });
      if (prodCount > 0) {
        throw new Error('Categoria possui produtos vinculados');
      }
      return prisma.category.delete({ where: { id: input.id } });
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
      const baseSlug = input.slug?.trim() || slugify(input.name);
      const exists = await prisma.product.findUnique({ where: { slug: baseSlug } });
      const slug = exists ? `${baseSlug}-${Math.random().toString(36).slice(2,7)}` : baseSlug;
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
        }
      });
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
    }),

  // ADMIN: remover produto (se não estiver em ordens/carrinho)
  adminDeleteProduct: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const [cartCount, orderCount] = await Promise.all([
        prisma.cartItem.count({ where: { productId: input.id } }),
        prisma.orderItem.count({ where: { productId: input.id } })
      ]);
      if (cartCount > 0 || orderCount > 0) {
        throw new Error('Produto vinculado a carrinhos/ordens');
      }
      return prisma.product.delete({ where: { id: input.id } });
    }),
});