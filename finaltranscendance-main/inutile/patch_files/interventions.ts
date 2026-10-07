import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

const createSchema = z.object({
  clientName: z.string(),
  clientAddress: z.string(),
  fibreSocket: z.string(),
  description: z.string(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  technicianId: z.string().nullable().optional(),
  scheduledAt: z.string(),
});

router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const intervention = await prisma.intervention.findUnique({
    where: {
      id: String(req.params.id),
    },
    include: {
      technician: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          organizationId: true,
          avatarUrl: true,
          createdAt: true,
        },
      },
    },
  });

  if (!intervention) {
    return res.status(404).json({
      error: 'Intervention introuvable',
    });
  }

  // Organization check added: prevents a user from reading an intervention
  // belonging to another organization by guessing/enumerating its id.
  if (intervention.organizationId !== req.authOrganizationId) {
    return res.status(403).json({
      error: 'Accès refusé à cette intervention',
    });
  }

  return res.json({ intervention });
});


// Organization check added: any authenticated user could previously list the
// interventions of any organization by changing :orgId in the URL.
router.get('/org/:orgId', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (req.authOrganizationId !== String(req.params.orgId)) {
    return res.status(403).json({
      error: 'Accès refusé à cette organisation',
    });
  }

  const interventions = await prisma.intervention.findMany({
    where: {
      organizationId: String(req.params.orgId),
    },
    include: {
      technician: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          organizationId: true,
          avatarUrl: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return res.json({ interventions });
});


// Organization check added: a technician could previously view interventions
// assigned to any other technician, including from another organization.
router.get('/tech/:technicianId', requireAuth, async (req: AuthenticatedRequest, res) => {
  const technician = await prisma.user.findUnique({
    where: { id: String(req.params.technicianId) },
    select: { organizationId: true },
  });

  if (!technician || technician.organizationId !== req.authOrganizationId) {
    return res.status(403).json({
      error: 'Accès refusé à ce technicien',
    });
  }

  const interventions = await prisma.intervention.findMany({
    where: {
      technicianId: String(req.params.technicianId),
    },
    include: {
      technician: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          organizationId: true,
          avatarUrl: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return res.json({ interventions });
});



router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid payload',
      issues: parsed.error.flatten(),
    });
  }

  if (!req.authOrganizationId) {
    return res.status(400).json({
      error: "Aucune organisation associée à votre compte",
    });
  }

  const data = parsed.data;

  const scheduledAt = new Date(data.scheduledAt);

  if (isNaN(scheduledAt.getTime())) {
    return res.status(400).json({
      error: 'La date planifiée est invalide',
    });
  }

  if (scheduledAt.getTime() <= Date.now()) {
    return res.status(400).json({
      error: 'Impossible de créer une intervention dans le passé',
    });
  }

  // organizationId now comes from the authenticated user, not the request
  // body: previously anyone could create an intervention for any
  // organization by passing an arbitrary organizationId.
  const intervention = await prisma.intervention.create({
    data: {
      organizationId: req.authOrganizationId,
      clientName: data.clientName,
      clientAddress: data.clientAddress,
      fibreSocket: data.fibreSocket,
      description: data.description,
      priority: data.priority,
      technicianId: data.technicianId ?? null,
      scheduledAt,
    },
  });

  return res.status(201).json({
    intervention,
  });
});


router.post('/activity', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.authOrganizationId) {
    return res.status(400).json({
      error: "Aucune organisation associée à votre compte",
    });
  }

  const activity = await prisma.activityLog.create({
    data: {
      organizationId: req.authOrganizationId,
      interventionId: req.body.interventionId,
      technicianId: req.body.technicianId ?? null,
      action: req.body.action,
      detail: req.body.detail ?? null,
    },
  });

  return res.status(201).json({
    activity,
  });
});



// ============================================================
// SATISFACTION RATINGS FOR A GIVEN TECHNICIAN
// ============================================================
router.get('/technician/:technicianId/satisfactions', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const technicianId = String(req.params.technicianId);

    const technician = await prisma.user.findUnique({
      where: { id: technicianId },
      select: { organizationId: true },
    });

    if (!technician || technician.organizationId !== req.authOrganizationId) {
      return res.status(403).json({
        error: 'Accès refusé à ce technicien',
      });
    }

    const satisfactions = await prisma.satisfactionRating.findMany({
      where: {
        intervention: {
          technicianId,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        intervention: {
          select: {
            id: true,
            clientName: true,
          },
        },
      },
    });

    return res.json({ satisfactions });
  } catch (error) {
    console.error('GET TECHNICIAN SATISFACTIONS ERROR:', error);

    return res.status(500).json({
      error: 'Erreur récupération satisfactions technicien',
    });
  }
});

// Same organization-isolation issue as the other /org/:orgId routes.
router.get('/activity/org/:orgId', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (req.authOrganizationId !== String(req.params.orgId)) {
    return res.status(403).json({
      error: 'Accès refusé à cette organisation',
    });
  }

  const limit = Number(req.query.limit ?? 50);

  const activities = await prisma.activityLog.findMany({
    where: {
      organizationId: String(req.params.orgId),
    },
    include: {
      technician: true,
      intervention: {
        select: {
          id: true,
          clientName: true,
          fibreSocket: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });

  return res.json({ activities });
});


router.patch('/:id/status', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { status, technicianId } = req.body;

  if (!status) {
    return res.status(400).json({
      error: 'Status required',
    });
  }

  const existing = await prisma.intervention.findUnique({
    where: { id: String(req.params.id) },
    select: { organizationId: true },
  });

  if (!existing) {
    return res.status(404).json({
      error: 'Intervention introuvable',
    });
  }

  // Organization check added: any authenticated user could previously change
  // the status of an intervention belonging to another organization, and the
  // activity log's organizationId used to come straight from the body.
  if (existing.organizationId !== req.authOrganizationId) {
    return res.status(403).json({
      error: 'Accès refusé à cette intervention',
    });
  }

  const intervention = await prisma.intervention.update({
    where: {
      id: String(req.params.id),
    },
    data: {
      status,
      ...(status === 'COMPLETED' && {
        satisfactionToken: crypto.randomUUID(),
        satisfactionSubmitted: false,
      }),
    },
  });

  await prisma.activityLog.create({
    data: {
      organizationId: existing.organizationId,
      interventionId: intervention.id,
      technicianId: technicianId ?? null,
      action: 'status_changed',
      detail: `Statut changé vers ${status}`,
    },
  });

  return res.json({
    intervention,
  });
});


router.get('/:id/reports', requireAuth, async (req: AuthenticatedRequest, res) => {
  const intervention = await prisma.intervention.findUnique({
    where: { id: String(req.params.id) },
    select: { organizationId: true },
  });

  if (!intervention || intervention.organizationId !== req.authOrganizationId) {
    return res.status(403).json({
      error: 'Accès refusé à cette intervention',
    });
  }

  const reports = await prisma.interventionReport.findMany({
    where: {
      interventionId: String(req.params.id),
    },
    include: {
      technician: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          organizationId: true,
          avatarUrl: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return res.json({ reports });
});


router.post('/:id/reports', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { technicianId, content, actionTaken } = req.body;

  if (!technicianId || !content) {
    return res.status(400).json({
      error: 'Missing report data',
    });
  }

  const intervention = await prisma.intervention.findUnique({
    where: { id: String(req.params.id) },
    select: { organizationId: true },
  });

  if (!intervention || intervention.organizationId !== req.authOrganizationId) {
    return res.status(403).json({
      error: 'Accès refusé à cette intervention',
    });
  }

  const report = await prisma.interventionReport.create({
    data: {
      interventionId: String(req.params.id),
      technicianId,
      content,
      actionTaken: actionTaken ?? null,
    },
  });

  return res.status(201).json({ report });
});


router.get('/:id/satisfaction', requireAuth, async (req: AuthenticatedRequest, res) => {
  const intervention = await prisma.intervention.findUnique({
    where: { id: String(req.params.id) },
    select: { organizationId: true },
  });

  if (!intervention || intervention.organizationId !== req.authOrganizationId) {
    return res.status(403).json({
      error: 'Accès refusé à cette intervention',
    });
  }

  const satisfaction = await prisma.satisfactionRating.findUnique({
    where: {
      interventionId: String(req.params.id),
    },
  });

  return res.json({ satisfaction });
});


// ============================================================
// CLIENT SATISFACTION — public token-based routes
// Deliberately NOT protected by requireAuth: the end client has no account,
// they access this via a unique token link received by email/SMS after the
// intervention is completed.
// ============================================================

router.get('/satisfaction/:token', async (req, res) => {
  const intervention = await prisma.intervention.findUnique({
    where: {
      satisfactionToken: String(req.params.token),
    },
    select: {
      id: true,
      clientName: true,
      status: true,
      satisfactionSubmitted: true,
      technician: {
        select: {
          fullName: true,
        },
      },
    },
  });

  if (!intervention) {
    return res.status(404).json({
      error: 'Lien de satisfaction invalide',
    });
  }

  if (intervention.status !== 'COMPLETED') {
    return res.status(400).json({
      error: 'Cette intervention n’est pas encore terminée',
    });
  }

  return res.json({
    intervention: {
      id: intervention.id,
      clientName: intervention.clientName,
      technicianName: intervention.technician?.fullName ?? null,
    },
    submitted: intervention.satisfactionSubmitted,
  });
});


router.post('/satisfaction/:token', async (req, res) => {
  const { rating, comment } = req.body;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({
      error: 'La note doit être comprise entre 1 et 5',
    });
  }

  const intervention = await prisma.intervention.findUnique({
    where: {
      satisfactionToken: String(req.params.token),
    },
  });

  if (!intervention) {
    return res.status(404).json({
      error: 'Lien de satisfaction invalide',
    });
  }

  if (intervention.status !== 'COMPLETED') {
    return res.status(400).json({
      error: 'Cette intervention n’est pas encore terminée',
    });
  }

  if (intervention.satisfactionSubmitted) {
    return res.status(409).json({
      error: 'Cette satisfaction a déjà été envoyée',
    });
  }

  await prisma.$transaction([
    prisma.satisfactionRating.create({
      data: {
        interventionId: intervention.id,
        rating,
        comment: typeof comment === 'string' ? comment.trim() || null : null,
      },
    }),

    prisma.intervention.update({
      where: {
        id: intervention.id,
      },
      data: {
        satisfactionSubmitted: true,
      },
    }),
  ]);

  return res.status(201).json({
    ok: true,
    message: 'Merci pour votre retour',
  });
});


export default router;
