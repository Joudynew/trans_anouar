import type { JwtUserPayload } from '../lib/jwt.js';

declare global {
  namespace Express {
    interface Request {
      authUserId?: string;
      authPayload?: JwtUserPayload;
    }
  }
}

export {};
