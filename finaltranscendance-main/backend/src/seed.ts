import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma.js';

/**
 * Creates the first SUPER_ADMIN at start-up from SUPER_ADMIN_EMAIL /
 * SUPER_ADMIN_PASSWORD (.env) if no SUPER_ADMIN exists yet. Without it, a
 * fresh deployment has no account able to create organizations or admins.
 */
export async function ensureSuperAdmin(): Promise<void> {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    return;
  }

  if (password.length < 8) {
    console.error('SUPER_ADMIN_PASSWORD must be at least 8 characters, skipping seed');
    return;
  }

  const existing = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (existing) {
    return;
  }

  const organization = await prisma.organization.upsert({
    where: { id: 'default-org' },
    update: {},
    create: { id: 'default-org', name: 'Organisation principale' },
  });

  await prisma.user.upsert({
    where: { email },
    update: { role: 'SUPER_ADMIN', status: 'ACTIVE' },
    create: {
      email,
      passwordHash: await bcrypt.hash(password, 12),
      fullName: 'Super Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      organizationId: organization.id,
    },
  });

  console.log(`SUPER_ADMIN created: ${email}`);
}
