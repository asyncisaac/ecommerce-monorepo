import type { PrismaClient as PrismaClientType } from '@prisma/client';
import { createRequire } from 'node:module';

if (process.env.NODE_ENV !== 'production') {
  process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@localhost:5432/ecommerce?schema=public';
}

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client') as {
  PrismaClient: new () => PrismaClientType;
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientType | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
