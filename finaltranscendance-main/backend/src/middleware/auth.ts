import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { verifyAuthToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

export interface AuthenticatedRequest extends Request {
  authUserId?: string;
  authOrganizationId?: string | null;
  authRole?: Role;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let userId: string;
  try {
    userId = verifyAuthToken(header.slice('Bearer '.length)).userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true, role: true, status: true },
  });

  // Inactive (deactivated) accounts lose access immediately, not only at next login.
  if (!user || user.status !== 'ACTIVE') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.authUserId = userId;
  req.authOrganizationId = user.organizationId;
  req.authRole = user.role;
  return next();
}

export function isAdmin(req: AuthenticatedRequest): boolean {
  return req.authRole === 'ADMIN' || req.authRole === 'SUPER_ADMIN';
}

// Returns true when userId exists and belongs to the caller's organization.
export async function isInCallerOrg(req: AuthenticatedRequest, userId: string): Promise<boolean> {
  if (!req.authOrganizationId) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });
  return !!user && user.organizationId === req.authOrganizationId;
}

// Public fields of a user — never expose passwordHash or satisfactionToken.
export const publicUserSelect = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  status: true,
  organizationId: true,
  avatarUrl: true,
  createdAt: true,
} as const;
