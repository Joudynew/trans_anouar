// CLAUDE-MODIF (2026-10-07) — MODIFIÉ : utilise le PrismaClient partagé (lib/prisma) au lieu d'en créer un nouveau.
import { Router } from 'express';
import { FriendshipStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import {
  requireAuth,
  type AuthenticatedRequest,
} from '../middleware/auth.js';

const router = Router();

// ============================================================
// GET /api/friends
// Liste des amis acceptés
// ============================================================
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.authUserId;

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const friendships = await prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [
          { requesterId: userId },
          { receiverId: userId },
        ],
      },
      include: {
        requester: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            status: true,
          },
        },
        receiver: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            status: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const friends = friendships.map((friendship) => ({
      id: friendship.id,
      user:
        friendship.requesterId === userId
          ? friendship.receiver
          : friendship.requester,
      status: friendship.status,
      createdAt: friendship.createdAt,
      updatedAt: friendship.updatedAt,
    }));

    return res.json(friends);
  } catch (error) {
    console.error('GET /friends error:', error);
    return res.status(500).json({
      error: 'Erreur lors du chargement des amis',
    });
  }
});

// ============================================================
// GET /api/friends/requests
// Demandes reçues
// ============================================================
router.get('/requests', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.authUserId;

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const requests = await prisma.friendship.findMany({
      where: {
        receiverId: userId,
        status: FriendshipStatus.PENDING,
      },
      include: {
        requester: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json(requests);
  } catch (error) {
    console.error('GET /friends/requests error:', error);
    return res.status(500).json({
      error: 'Erreur lors du chargement des demandes',
    });
  }
});

// ============================================================
// POST /api/friends/:userId
// Envoyer une demande d'amitié
//
// Autorisé uniquement :
// TECHNICIAN -> TECHNICIAN
// et uniquement dans la même organisation.
// ============================================================
router.post('/:userId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const requesterId = req.authUserId;
    const receiverId = String(req.params.userId);

    if (!requesterId) {
      return res.status(401).json({
        error: 'Non authentifié',
      });
    }

    if (requesterId === receiverId) {
      return res.status(400).json({
        error: 'Vous ne pouvez pas vous ajouter vous-même',
      });
    }

    const [requester, receiver] = await Promise.all([
      prisma.user.findUnique({
        where: { id: requesterId },
        select: {
          id: true,
          fullName: true,
          role: true,
          organizationId: true,
        },
      }),

      prisma.user.findUnique({
        where: { id: receiverId },
        select: {
          id: true,
          role: true,
          organizationId: true,
        },
      }),
    ]);

    if (!requester) {
      return res.status(401).json({
        error: 'Utilisateur demandeur introuvable',
      });
    }

    if (!receiver) {
      return res.status(404).json({
        error: 'Utilisateur introuvable',
      });
    }

    // Les deux utilisateurs doivent être techniciens.
    if (
      requester.role !== 'TECHNICIAN' ||
      receiver.role !== 'TECHNICIAN'
    ) {
      return res.status(403).json({
        error:
          'Les demandes sont uniquement autorisées entre techniciens.',
      });
    }

    // Les deux techniciens doivent être dans la même organisation.
    if (
      !requester.organizationId ||
      requester.organizationId !== receiver.organizationId
    ) {
      return res.status(403).json({
        error:
          'Vous pouvez uniquement ajouter un technicien de votre organisation.',
      });
    }

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, receiverId },
          { requesterId: receiverId, receiverId: requesterId },
        ],
      },
    });

    if (existing) {
      // Une ancienne demande refusée peut être renvoyée.
      if (existing.status === FriendshipStatus.REJECTED) {
        const updated = await prisma.friendship.update({
          where: { id: existing.id },
          data: {
            requesterId,
            receiverId,
            status: FriendshipStatus.PENDING,
          },
        });

        await prisma.notification.create({
          data: {
            userId: receiverId,
            type: 'friend_request',
            title: 'Nouvelle demande d’amitié',
            message: `${requester.fullName ?? 'Un technicien'} vous a envoyé une demande d’amitié.`,
            friendshipId: updated.id,
          },
        });

        return res.status(201).json(updated);
      }

      return res.status(409).json({
        error:
          existing.status === FriendshipStatus.ACCEPTED
            ? 'Vous êtes déjà amis'
            : 'Une demande existe déjà',
      });
    }

    const friendship = await prisma.friendship.create({
      data: {
        requesterId,
        receiverId,
        status: FriendshipStatus.PENDING,
      },
    });

    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: 'friend_request',
        title: 'Nouvelle demande d’amitié',
        message: `${requester.fullName ?? 'Un technicien'} vous a envoyé une demande d’amitié.`,
        friendshipId: friendship.id,
      },
    });

    return res.status(201).json(friendship);
  } catch (error) {
    console.error('POST /friends/:userId error:', error);

    return res.status(500).json({
      error: 'Erreur lors de l’envoi de la demande',
    });
  }
});

// ============================================================
// PATCH /api/friends/:friendshipId/accept
// Accepter une demande
// ============================================================
router.patch(
  '/:friendshipId/accept',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.authUserId;
      const friendshipId = String(req.params.friendshipId);

      if (!userId) {
        return res.status(401).json({
          error: 'Non authentifié',
        });
      }

      const friendship = await prisma.friendship.findUnique({
        where: { id: friendshipId },
      });

      if (!friendship) {
        return res.status(404).json({
          error: 'Demande introuvable',
        });
      }

      if (friendship.receiverId !== userId) {
        return res.status(403).json({
          error: 'Vous ne pouvez pas accepter cette demande',
        });
      }

      if (friendship.status !== FriendshipStatus.PENDING) {
        return res.status(409).json({
          error: 'Cette demande n’est plus en attente',
        });
      }

      const updated = await prisma.friendship.update({
        where: { id: friendshipId },
        data: {
          status: FriendshipStatus.ACCEPTED,
        },
      });

      const accepter = await prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true },
      });

      await prisma.notification.create({
        data: {
          userId: friendship.requesterId,
          type: 'friend_accepted',
          title: 'Demande d’amitié acceptée',
          message: `${accepter?.fullName ?? 'Un utilisateur'} a accepté votre demande d’amitié.`,
          friendshipId: friendship.id,
        },
      });

      return res.json(updated);
    } catch (error) {
      console.error('Accept friendship error:', error);
      return res.status(500).json({
        error: 'Erreur lors de l’acceptation',
      });
    }
  }
);

// ============================================================
// PATCH /api/friends/:friendshipId/reject
// Refuser une demande
// ============================================================
router.patch(
  '/:friendshipId/reject',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.authUserId;
      const friendshipId = String(req.params.friendshipId);

      if (!userId) {
        return res.status(401).json({
          error: 'Non authentifié',
        });
      }

      const friendship = await prisma.friendship.findUnique({
        where: { id: friendshipId },
      });

      if (!friendship) {
        return res.status(404).json({
          error: 'Demande introuvable',
        });
      }

      if (friendship.receiverId !== userId) {
        return res.status(403).json({
          error: 'Vous ne pouvez pas refuser cette demande',
        });
      }

      if (friendship.status !== FriendshipStatus.PENDING) {
        return res.status(409).json({
          error: 'Cette demande n’est plus en attente',
        });
      }

      const updated = await prisma.friendship.update({
        where: { id: friendshipId },
        data: {
          status: FriendshipStatus.REJECTED,
        },
      });

      await prisma.notification.deleteMany({
        where: {
          friendshipId,
          userId: friendship.receiverId,
          type: 'friend_request',
        },
      });

      return res.json(updated);
    } catch (error) {
      console.error('Reject friendship error:', error);
      return res.status(500).json({
        error: 'Erreur lors du refus',
      });
    }
  }
);

// ============================================================
// DELETE /api/friends/:friendshipId
// Supprimer un ami
// ============================================================
router.delete(
  '/:friendshipId',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.authUserId;
      const friendshipId = String(req.params.friendshipId);

      if (!userId) {
        return res.status(401).json({
          error: 'Non authentifié',
        });
      }

      const friendship = await prisma.friendship.findUnique({
        where: { id: friendshipId },
      });

      if (!friendship) {
        return res.status(404).json({
          error: 'Relation introuvable',
        });
      }

      if (
        friendship.requesterId !== userId &&
        friendship.receiverId !== userId
      ) {
        return res.status(403).json({
          error: 'Vous ne pouvez pas supprimer cette relation',
        });
      }

      await prisma.friendship.delete({
        where: { id: friendshipId },
      });

      return res.status(204).send();
    } catch (error) {
      console.error('DELETE /friends/:friendshipId error:', error);
      return res.status(500).json({
        error: 'Erreur lors de la suppression',
      });
    }
  }
);

export default router;
