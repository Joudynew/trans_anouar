import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

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

  const organization = await prisma.organization.create({
    data: {
      name: req.body.name,
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

  const organization = await prisma.organization.update({
    where: {
      id: String(req.params.id),
    },
    data: {
      name: req.body.name,
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
