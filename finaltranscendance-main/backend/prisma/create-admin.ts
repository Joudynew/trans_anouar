import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@example.com';
  const password = 'Admin123!';
  const fullName = 'Admin';

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      fullName,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    create: {
      email,
      passwordHash,
      fullName,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('Admin OK:', admin.email);
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

export { main };