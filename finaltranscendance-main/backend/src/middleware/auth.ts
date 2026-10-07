import type { NextFunction, Request, Response } from 'express';
import { verifyAuthToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

export interface AuthenticatedRequest extends Request {
  authUserId?: string;
  authOrganizationId?: string | null;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = verifyAuthToken(token);
    req.authUserId = payload.userId;

    prisma.user.findUnique({
      where: { id: payload.userId },
      select: { organizationId: true },
    }).then((user) => {
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      req.authOrganizationId = user.organizationId;
      return next();
    }).catch(() => {
      return res.status(401).json({ error: 'Unauthorized' });
    });
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
