import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import {
  requireAuth,
  isInCallerOrg,
  type AuthenticatedRequest,
} from '../middleware/auth.js';

const senderSelect = {
  id: true,
  fullName: true,
  email: true,
  avatarUrl: true,
} as const;

const router = Router();

/**
 * GET /api/messages/channels/:orgId
 *
 * Retourne :
 * - les channels GROUP de l'organisation
 * - les channels DM dont l'utilisateur connecté est membre
 */
router.get(
  '/channels/:orgId',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.authUserId;
      const orgId = String(req.params.orgId);

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (orgId !== req.authOrganizationId) {
        return res.status(403).json({ error: 'Accès refusé à cette organisation' });
      }

      const channels = await prisma.channel.findMany({
        where: {
          organizationId: orgId,
          OR: [
            {
              type: 'GROUP',
            },
            {
              type: 'DM',
              members: {
                some: {
                  userId,
                },
              },
            },
          ],
        },
        include: {
          members: true,
          messages: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
            include: {
              sender: { select: senderSelect },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return res.json({ channels });
    } catch (error) {
      console.error('GET /messages/channels/:orgId:', error);

      return res.status(500).json({
        error: 'Erreur récupération channels',
      });
    }
  }
);

/**
 * POST /api/messages/channels
 */
router.post(
  '/channels',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.authUserId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const schema = z.object({
        organizationId: z.string(),
        name: z.string().trim().min(1).max(100),
        type: z.enum(['DM', 'GROUP']).default('GROUP'),
        targetUserId: z.string().optional(),
      });

      const parsed = schema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid payload',
        });
      }

      const {
        organizationId,
        name,
        type,
        targetUserId,
      } = parsed.data;

      if (type === 'DM' && !targetUserId) {
        return res.status(400).json({
          error: 'targetUserId is required for DM',
        });
      }

      if (organizationId !== req.authOrganizationId) {
        return res.status(403).json({ error: 'Accès refusé à cette organisation' });
      }

      if (targetUserId && !(await isInCallerOrg(req, targetUserId))) {
        return res.status(400).json({ error: 'Utilisateur invalide pour cette organisation' });
      }

      const channel = await prisma.channel.create({
        data: {
          organizationId,
          name,
          type,
          members: {
            create: [
              {
                userId,
              },
              ...(type === 'DM' && targetUserId
                ? [{ userId: targetUserId }]
                : []),
            ],
          },
        },
        include: {
          members: true,
        },
      });

      return res.status(201).json({ channel });
    } catch (error) {
      console.error('POST /messages/channels:', error);

      return res.status(500).json({
        error: 'Erreur création channel',
      });
    }
  }
);

/**
 * POST /api/messages/channels/:channelId/members
 */
router.post(
  '/channels/:channelId/members',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const currentUserId = req.authUserId;
      const channelId = String(req.params.channelId);

      if (!currentUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const schema = z.object({
        userId: z.string(),
      });

      const parsed = schema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid payload',
        });
      }

      const channel = await prisma.channel.findUnique({
        where: {
          id: channelId,
        },
      });

      if (!channel) {
        return res.status(404).json({
          error: 'Channel not found',
        });
      }

      // Vérifie que l'utilisateur connecté est déjà membre.
      const currentMembership = await prisma.channelMember.findFirst({
        where: {
          channelId,
          userId: currentUserId,
        },
      });

      if (!currentMembership) {
        return res.status(403).json({
          error: 'Forbidden',
        });
      }

      if (
        channel.organizationId !== req.authOrganizationId ||
        !(await isInCallerOrg(req, parsed.data.userId))
      ) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const member = await prisma.channelMember.upsert({
        where: {
          channelId_userId: {
            channelId,
            userId: parsed.data.userId,
          },
        },
        create: {
          channelId,
          userId: parsed.data.userId,
        },
        update: {},
      });

      return res.status(201).json({ member });
    } catch (error) {
      console.error(
        'POST /messages/channels/:channelId/members:',
        error
      );

      return res.status(500).json({
        error: 'Erreur ajout membre',
      });
    }
  }
);

/**
 * GET /api/messages/:channelId
 */
router.get(
  '/:channelId',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.authUserId;
      const channelId = String(req.params.channelId);

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const membership = await prisma.channelMember.findFirst({
        where: {
          channelId,
          userId,
        },
      });

      if (!membership) {
        return res.status(403).json({
          error: 'Forbidden',
        });
      }

      const messages = await prisma.message.findMany({
        where: {
          channelId,
        },
        include: {
          sender: { select: senderSelect },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      return res.json({ messages });
    } catch (error) {
      console.error('GET /messages/:channelId:', error);

      return res.status(500).json({
        error: 'Erreur récupération messages',
      });
    }
  }
);

/**
 * POST /api/messages
 */
router.post(
  '/',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.authUserId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const schema = z.object({
        channelId: z.string(),
        content: z.string().trim().min(1).max(2000),
      });

      const parsed = schema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid payload',
        });
      }

      const channelId = parsed.data.channelId;
      const content = parsed.data.content;

      const membership = await prisma.channelMember.findFirst({
        where: {
          channelId,
          userId,
        },
      });

      if (!membership) {
        return res.status(403).json({
          error: 'Forbidden',
        });
      }

      const message = await prisma.message.create({
        data: {
          channelId,
          senderId: userId,
          content,
        },
        include: {
          sender: { select: senderSelect },
        },
      });

      return res.status(201).json({ message });
    } catch (error) {
      console.error('POST /messages:', error);

      return res.status(500).json({
        error: 'Erreur envoi message',
      });
    }
  }
);

export default router;
