// CLAUDE-MODIF (2026-10-07) — MODIFIÉ : utilise le PrismaClient partagé (lib/prisma).
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/notifications
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.authUserId;

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.json(notifications);
  } catch (error) {
    console.error('GET /notifications error:', error);
    return res.status(500).json({
      error: 'Erreur lors du chargement des notifications',
    });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.authUserId;

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const count = await prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });

    return res.json({ count });
  } catch (error) {
    console.error('GET /notifications/unread-count error:', error);
    return res.status(500).json({
      error: 'Erreur lors du chargement du compteur',
    });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.authUserId;
    const id = String(req.params.id);

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        error: 'Notification introuvable',
      });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return res.json(updated);
  } catch (error) {
    console.error('PATCH /notifications/:id/read error:', error);
    return res.status(500).json({
      error: 'Erreur lors de la lecture de la notification',
    });
  }
});

export default router;
