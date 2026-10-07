import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// ============================================================
// AVATAR UPLOAD
// ============================================================
const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/avatars'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Unsupported format (png, jpg, webp only)'));
    }
    cb(null, true);
  },
});

router.post(
  '/me/avatar',
  requireAuth,
  uploadAvatar.single('avatar'),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.authUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Aucun fichier reçu' });
      }

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;

      const user = await prisma.user.update({
        where: { id: req.authUserId },
        data: { avatarUrl },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          status: true,
          organizationId: true,
          avatarUrl: true,
          createdAt: true,
        },
      });

      return res.json({ user });
    } catch (error) {
      console.error('UPLOAD AVATAR ERROR:', error);
      return res.status(500).json({ error: "Erreur lors de l'upload de l'avatar" });
    }
  }
);

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  phone: z.string().nullable().optional(),
  role: z.enum(['technician', 'admin']).default('technician'),
  organizationId: z.string().optional(),
});

// Organization check added: a user could previously read the full profile
// (email, phone, role...) of anyone, including users from another org, by
// changing the id in the URL. Now allowed only for self or same-org members.
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: {
      id: String(req.params.id),
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      role: true,
      status: true,
      organizationId: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  if (!user) {
    return res.status(404).json({
      error: 'Utilisateur introuvable',
    });
  }

  const isSelf = req.authUserId === user.id;
  const sameOrganization =
    user.organizationId !== null && user.organizationId === req.authOrganizationId;

  if (!isSelf && !sameOrganization) {
    return res.status(403).json({
      error: 'Accès refusé à cet utilisateur',
    });
  }

  return res.json({ user });
});

// Organization check added: any authenticated user could previously list all
// users of any organization by changing :orgId in the URL.
router.get('/org/:orgId', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (req.authOrganizationId !== String(req.params.orgId)) {
    return res.status(403).json({
      error: 'Accès refusé à cette organisation',
    });
  }

  const users = await prisma.user.findMany({
    where: {
      organizationId: String(req.params.orgId),
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      role: true,
      status: true,
      organizationId: true,
      avatarUrl: true,
      createdAt: true,
    },
    orderBy: {
      fullName: 'asc',
    },
  });

  return res.json({ users });
});

router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = createUserSchema.safeParse(req.body);

  if (!parsed.success) {
    console.error('CREATE USER VALIDATION ERROR:', parsed.error.flatten());
    console.error('CREATE USER BODY:', req.body);

    return res.status(400).json({
      error: 'Invalid payload',
      issues: parsed.error.flatten(),
    });
  }

  const {
    email,
    password,
    fullName,
    phone,
    role,
    organizationId: requestedOrganizationId,
  } = parsed.data;

  if (!req.authUserId) {
    return res.status(401).json({
      error: 'Unauthorized',
    });
  }

  const creator = await prisma.user.findUnique({
    where: { id: req.authUserId },
    select: {
      email: true,
      role: true,
      organizationId: true,
    },
  });

  if (!creator || !['ADMIN', 'SUPER_ADMIN'].includes(creator.role)) {
    return res.status(403).json({
      error: 'Seul un administrateur peut créer un utilisateur',
    });
  }

  const isSuperAdmin = creator.role === 'SUPER_ADMIN';

  const organizationId = isSuperAdmin
    ? (requestedOrganizationId ?? creator.organizationId)
    : creator.organizationId;

  if (!organizationId) {
    return res.status(400).json({
      error: 'Aucune organisation associée à cet administrateur',
    });
  }

  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (existing) {
    return res.status(409).json({
      error: 'Email already in use',
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      fullName,
      phone: phone ?? null,
      role: role === 'admin' ? 'ADMIN' : 'TECHNICIAN',
      status: 'ACTIVE',
      organizationId,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      role: true,
      status: true,
      organizationId: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  return res.status(201).json({ user });
});


const updatePasswordSchema = z.object({
  password: z.string().min(6),
});

const selfUpdateSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().nullable().optional(),
});


// Self-edit re-enabled: this route used to fully block self-updates, which
// meant no user could ever edit their own profile. Users can now update
// their own name/phone (not role/status), admins keep managing other users.
router.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.authUserId) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const isSelf = req.authUserId === String(req.params.id);

    if (isSelf) {
      const parsed = selfUpdateSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid payload',
          issues: parsed.error.flatten(),
        });
      }

      const data: { fullName?: string; phone?: string | null } = {};

      if (parsed.data.fullName !== undefined) {
        data.fullName = parsed.data.fullName;
      }

      if (parsed.data.phone !== undefined) {
        data.phone = parsed.data.phone;
      }

      const user = await prisma.user.update({
        where: { id: req.authUserId },
        data,
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          status: true,
          organizationId: true,
          avatarUrl: true,
          createdAt: true,
        },
      });

      return res.json({ user });
    }

    const creator = await prisma.user.findUnique({
      where: { id: req.authUserId },
      select: {
        id: true,
        role: true,
        organizationId: true,
      },
    });

    if (!creator) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    // A technician can never modify another user.
    if (!['ADMIN', 'SUPER_ADMIN'].includes(creator.role)) {
      return res.status(403).json({
        error: 'Accès réservé aux administrateurs',
      });
    }

    const target = await prisma.user.findUnique({
      where: { id: String(req.params.id) },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        organizationId: true,
      },
    });

    if (!target) {
      return res.status(404).json({
        error: 'Utilisateur introuvable',
      });
    }

    // Nobody can modify a SUPER_ADMIN.
    if (target.role === 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'Un SUPER_ADMIN ne peut pas être modifié',
      });
    }

    // ADMIN: only technicians from their own organization.
    if (creator.role === 'ADMIN') {
      if (target.role !== 'TECHNICIAN') {
        return res.status(403).json({
          error: 'Un administrateur ne peut modifier que les techniciens',
        });
      }

      if (target.organizationId !== creator.organizationId) {
        return res.status(403).json({
          error: 'Utilisateur hors de votre organisation',
        });
      }
    }

    // SUPER_ADMIN can manage both ADMIN and TECHNICIAN.
    const {
      fullName,
      email,
      phone,
      role,
      status,
    } = req.body ?? {};

    const data: any = {};

    if (typeof fullName === 'string' && fullName.trim()) {
      data.fullName = fullName.trim();
    }

    if (typeof phone === 'string') {
      data.phone = phone.trim() || null;
    }

    if (typeof email === 'string' && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();

      if (normalizedEmail !== target.email.toLowerCase()) {
        const existing = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (existing && existing.id !== target.id) {
          return res.status(409).json({
            error: 'Email already in use',
          });
        }
      }

      data.email = normalizedEmail;
    }

    if (role !== undefined) {
      if (!['admin', 'technician'].includes(role)) {
        return res.status(400).json({
          error: 'Rôle invalide',
        });
      }

      // An ADMIN cannot promote a technician to ADMIN.
      if (creator.role === 'ADMIN' && role !== 'technician') {
        return res.status(403).json({
          error: 'Un administrateur ne peut pas attribuer le rôle ADMIN',
        });
      }

      data.role = role === 'admin' ? 'ADMIN' : 'TECHNICIAN';
    }

    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({
          error: 'Statut invalide',
        });
      }

      data.status = status === 'active' ? 'ACTIVE' : 'INACTIVE';
    }

    const user = await prisma.user.update({
      where: { id: target.id },
      data,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        organizationId: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return res.json({ user });
  } catch (error) {
    console.error('UPDATE USER ERROR:', error);

    return res.status(500).json({
      error: 'Erreur modification utilisateur',
    });
  }
});



router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.authUserId) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const creator = await prisma.user.findUnique({
      where: { id: req.authUserId },
      select: {
        id: true,
        role: true,
        organizationId: true,
      },
    });

    if (!creator) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    if (!['ADMIN', 'SUPER_ADMIN'].includes(creator.role)) {
      return res.status(403).json({
        error: 'Accès réservé aux administrateurs',
      });
    }

    if (creator.id === String(req.params.id)) {
      return res.status(403).json({
        error: 'Vous ne pouvez pas désactiver votre propre compte',
      });
    }

    const target = await prisma.user.findUnique({
      where: { id: String(req.params.id) },
      select: {
        id: true,
        role: true,
        organizationId: true,
      },
    });

    if (!target) {
      return res.status(404).json({
        error: 'Utilisateur introuvable',
      });
    }

    // SUPER_ADMIN is protected.
    if (target.role === 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'Un SUPER_ADMIN ne peut pas être désactivé',
      });
    }

    // ADMIN: only technicians from their own organization.
    if (creator.role === 'ADMIN') {
      if (target.role !== 'TECHNICIAN') {
        return res.status(403).json({
          error: 'Un administrateur ne peut désactiver que les techniciens',
        });
      }

      if (target.organizationId !== creator.organizationId) {
        return res.status(403).json({
          error: 'Utilisateur hors de votre organisation',
        });
      }
    }

    // Soft delete: keep the user and their history.
    const user = await prisma.user.update({
      where: { id: target.id },
      data: {
        status: 'INACTIVE',
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        organizationId: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return res.json({
      message: 'Utilisateur désactivé',
      user,
    });
  } catch (error) {
    console.error('DEACTIVATE USER ERROR:', error);

    return res.status(500).json({
      error: 'Erreur désactivation utilisateur',
    });
  }
});


router.patch('/:id/password', requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = updatePasswordSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid password',
      issues: parsed.error.flatten(),
    });
  }

  const { password } = parsed.data;

  if (!req.authUserId) {
    return res.status(401).json({
      error: 'Unauthorized',
    });
  }

  if (req.authUserId !== String(req.params.id)) {
    return res.status(403).json({
      error: 'Forbidden',
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: {
      id: String(req.params.id),
    },
    data: {
      passwordHash,
    },
  });

  return res.json({
    ok: true,
  });
});

export default router;
