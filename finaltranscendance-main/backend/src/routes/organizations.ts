// CLAUDE-MODIF (2026-10-07) — MODIFIÉ : validation Zod du nom d'organisation (création/modification).
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

const orgSchema = z.object({ name: z.string().trim().min(2).max(100) });

router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.authUserId },
    select: { role: true },
  });

  if (!user || user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      error: 'Accès réservé au super administrateur',
    });
  }

  const organizations = await prisma.organization.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  return res.json({ organizations });
});


router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.authUserId },
    select: { role: true },
  });

  if (!user || user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      error: 'Accès réservé au super administrateur',
    });
  }

  const parsed = orgSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Nom d’organisation invalide' });
  }

  const organization = await prisma.organization.create({
    data: {
      name: parsed.data.name,
    },
  });

  return res.status(201).json({ organization });
});


// Role check added here: previously missing, any authenticated user could
// rename any organization.
router.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.authUserId },
    select: { role: true },
  });

  if (!user || user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      error: 'Accès réservé au super administrateur',
    });
  }

  const parsed = orgSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Nom d’organisation invalide' });
  }

  const organization = await prisma.organization.update({
    where: {
      id: String(req.params.id),
    },
    data: {
      name: parsed.data.name,
    },
  });

  return res.json({ organization });
});


// Role check added here: previously missing, any authenticated user could
// delete any organization.
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.authUserId },
    select: { role: true },
  });

  if (!user || user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      error: 'Accès réservé au super administrateur',
    });
  }

  await prisma.organization.delete({
    where: {
      id: String(req.params.id),
    },
  });

  return res.json({ ok: true });
});


export default router;
