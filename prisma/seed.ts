import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco...');

  const roundsRaw = Number(process.env.BCRYPT_ROUNDS ?? '12');
  const rounds = Number.isFinite(roundsRaw) && roundsRaw >= 10 && roundsRaw <= 14 ? roundsRaw : 12;

  const testUserPassword = await bcrypt.hash('senha123', rounds);
  const adminPassword = await bcrypt.hash('admin123', rounds);

  const [testUser, adminUser] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'test.user1@example.com' },
      update: { name: 'Usuário Teste', password: testUserPassword, role: 'CUSTOMER' },
      create: { email: 'test.user1@example.com', name: 'Usuário Teste', password: testUserPassword, role: 'CUSTOMER' },
      select: { id: true, email: true, role: true },
    }),
    prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: { name: 'Admin', password: adminPassword, role: 'ADMIN' },
      create: { email: 'admin@example.com', name: 'Admin', password: adminPassword, role: 'ADMIN' },
      select: { id: true, email: true, role: true },
    }),
  ]);

  await Promise.all([
    prisma.address.upsert({
      where: { id: `seed-default-address-${testUser.id}` },
      update: {
        userId: testUser.id,
        street: 'Rua Exemplo, 123',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01000-000',
        country: 'Brasil',
        isDefault: true,
      },
      create: {
        id: `seed-default-address-${testUser.id}`,
        userId: testUser.id,
        street: 'Rua Exemplo, 123',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01000-000',
        country: 'Brasil',
        isDefault: true,
      },
    }),
  ]);

  console.log(`👤 Usuário teste: ${testUser.email} (senha: senha123)`);
  console.log(`👑 Admin: ${adminUser.email} (senha: admin123)`);

  // Categorias
  const categorias = [
    { name: 'Eletrônicos', slug: 'eletronicos' },
    { name: 'Roupas', slug: 'roupas' },
    { name: 'Livros', slug: 'livros' },
  ];

  const [eletronicos, roupas, livros] = await Promise.all(
    categorias.map((c) =>
      prisma.category.upsert({
        where: { slug: c.slug },
        update: { name: c.name },
        create: { name: c.name, slug: c.slug },
      })
    )
  );

  // Produtos base
  const produtos = [
    {
      name: 'Smartphone X',
      description: 'Smartphone com ótima câmera e desempenho',
      price: 2999.99,
      discount: 10,
      stock: 50,
      images: ['https://via.placeholder.com/600x400?text=Smartphone+X'],
      slug: 'smartphone-x',
      categoryId: eletronicos.id,
      variants: [
        { name: 'Cor', value: 'Preto' },
        { name: 'Armazenamento', value: '128GB' },
      ],
    },
    {
      name: 'Camisa Preta',
      description: 'Camisa básica preta de algodão',
      price: 79.9,
      discount: 0,
      stock: 200,
      images: ['https://via.placeholder.com/600x400?text=Camisa+Preta'],
      slug: 'camisa-preta',
      categoryId: roupas.id,
      variants: [
        { name: 'Tamanho', value: 'M' },
        { name: 'Tamanho', value: 'G' },
      ],
    },
    {
      name: 'Livro TypeScript Profissional',
      description: 'Aprenda TypeScript com boas práticas e padrões',
      price: 129.9,
      discount: 0,
      stock: 100,
      images: ['https://via.placeholder.com/600x400?text=Livro+TS+Pro'],
      slug: 'livro-typescript-profissional',
      categoryId: livros.id,
      variants: [
        { name: 'Formato', value: 'Capa comum' },
      ],
    },
  ];

  for (const p of produtos) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        price: p.price,
        discount: p.discount,
        stock: p.stock,
        images: p.images,
        categoryId: p.categoryId,
      },
      create: {
        name: p.name,
        description: p.description,
        price: p.price,
        discount: p.discount,
        stock: p.stock,
        images: p.images,
        slug: p.slug,
        categoryId: p.categoryId,
        variants: {
          create: p.variants.map((v) => ({ name: v.name, value: v.value })),
        },
      },
    });
  }

  // Produtos adicionais para testar paginação e ordenação
  const extraNames = [
    'Fone Pro', 'Notebook Z', 'Monitor Ultra', 'Teclado Mecânico', 'Mouse Gamer',
    'Bermuda Jeans', 'Tênis Running', 'Jaqueta Couro', 'Vestido Floral', 'Boné Esportivo',
    'Livro Node.js Avançado', 'Livro Clean Architecture', 'HQ Super', 'Dicionário Inglês', 'Guia de Fotografia'
  ];

  const categoriasRefs = [eletronicos, roupas, livros];

  for (let i = 1; i <= 30; i++) {
    const name = `${extraNames[i % extraNames.length]} ${i}`;
    const price = Number((50 + i * 10.5).toFixed(2));
    const discount = i % 5 === 0 ? 15 : i % 3 === 0 ? 5 : 0;
    const stock = 20 + (i % 50);
    const category = categoriasRefs[i % categoriasRefs.length];
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    await prisma.product.upsert({
      where: { slug },
      update: {
        name,
        description: `Descrição do produto ${name}`,
        price,
        discount,
        stock,
        images: [`https://via.placeholder.com/600x400?text=${encodeURIComponent(name)}`],
        categoryId: category.id,
      },
      create: {
        name,
        description: `Descrição do produto ${name}`,
        price,
        discount,
        stock,
        images: [`https://via.placeholder.com/600x400?text=${encodeURIComponent(name)}`],
        slug,
        categoryId: category.id,
        variants: {
          create: [
            { name: 'Cor', value: 'Preto' },
            { name: 'Modelo', value: `v${(i % 3) + 1}` },
          ],
        },
      },
    });
  }

  console.log('✅ Seed concluído!');
}

main()
  .catch((e) => {
    console.error('❌ Seed falhou:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
