import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Uso: tsx scripts/promote-admin.ts <email>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Usuário não encontrado: ${email}`);
    process.exit(1);
  }

  if (user.role === UserRole.ADMIN) {
    console.log(`Usuário já é ADMIN: ${email}`);
    process.exit(0);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: UserRole.ADMIN },
    select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
  });

  console.log('Usuário promovido a ADMIN:', updated);
}

main()
  .catch((e) => {
    console.error('Erro ao promover usuário:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });