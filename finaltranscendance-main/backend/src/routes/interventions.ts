import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import {
  requireAuth,
  isAdmin,
  isInCallerOrg,
  publicUserSelect,
  type AuthenticatedRequest,
} from '../middleware/auth.js';

const router = Router();

const createSchema = z.object({
  clientName: z.string().trim().min(1).max(200),
  clientAddress: z.string().trim().min(1).max(300),
  fibreSocket: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(2000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  technicianId: z.string().uuid().nullable().optional(),
  scheduledAt: z.string().datetime(),
});

const activitySchema = z.object({
  interventionId: z.string().uuid().nullable().optional(),
  technicianId: z.string().uuid().nullable().optional(),
  action: z.enum(['created', 'status_changed', 'closed', 'failed']),
  detail: z.string().max(500).nullable().optional(),
});

const statusSchema = z.object({
  status: z.enum(['ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED', 'FAILED']),
  technicianId: z.string().uuid().nullable().optional(),
});

const reportSchema = z.object({
  technicianId: z.string().uuid(),
  content: z.string().trim().min(1).max(5000),
  actionTaken: z.string().trim().max(2000).nullable().optional(),
});

const satisfactionSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).nullable().optional(),
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

  if (!isAdmin(req)) {
    return res.status(403).json({
      error: 'Seul un administrateur peut créer une intervention',
    });
  }

  const data = parsed.data;

  if (data.technicianId && !(await isInCallerOrg(req, data.technicianId))) {
    return res.status(400).json({
      error: 'Technicien invalide pour cette organisation',
    });
  }

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

  const parsed = activitySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', issues: parsed.error.flatten() });
  }
  const { interventionId, technicianId, action, detail } = parsed.data;

  if (interventionId) {
    const intervention = await prisma.intervention.findUnique({
      where: { id: interventionId },
      select: { organizationId: true },
    });
    if (!intervention || intervention.organizationId !== req.authOrganizationId) {
      return res.status(403).json({ error: 'Accès refusé à cette intervention' });
    }
  }

  if (technicianId && !(await isInCallerOrg(req, technicianId))) {
    return res.status(400).json({ error: 'Technicien invalide pour cette organisation' });
  }

  const activity = await prisma.activityLog.create({
    data: {
      organizationId: req.authOrganizationId,
      interventionId: interventionId ?? null,
      technicianId: technicianId ?? null,
      action,
      detail: detail ?? null,
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

  const rawLimit = Number(req.query.limit ?? 50);
  const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 50;

  const activities = await prisma.activityLog.findMany({
    where: {
      organizationId: String(req.params.orgId),
    },
    include: {
      technician: { select: publicUserSelect },
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
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Statut invalide', issues: parsed.error.flatten() });
  }
  const { status, technicianId } = parsed.data;

  const existing = await prisma.intervention.findUnique({
    where: { id: String(req.params.id) },
    select: { organizationId: true, technicianId: true },
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

  // Only admins or the technician assigned to the intervention can change it.
  if (!isAdmin(req) && existing.technicianId !== req.authUserId) {
    return res.status(403).json({
      error: 'Seul le technicien assigné peut modifier cette intervention',
    });
  }

  if (technicianId && !(await isInCallerOrg(req, technicianId))) {
    return res.status(400).json({ error: 'Technicien invalide pour cette organisation' });
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
  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Missing report data', issues: parsed.error.flatten() });
  }
  const { technicianId, content, actionTaken } = parsed.data;

  // A technician can only write reports in their own name.
  if (!isAdmin(req) && technicianId !== req.authUserId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!(await isInCallerOrg(req, technicianId))) {
    return res.status(400).json({ error: 'Technicien invalide pour cette organisation' });
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
  const parsed = satisfactionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'La note doit être comprise entre 1 et 5',
    });
  }
  const { rating, comment } = parsed.data;

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
        comment: comment?.trim() || null,
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
