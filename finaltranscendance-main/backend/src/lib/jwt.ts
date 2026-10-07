import jwt from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET!;

export interface JwtUserPayload {
  userId: string;
}

export function signAuthToken(payload: JwtUserPayload): string {
  return jwt.sign(payload, jwtSecret, { expiresIn: "7d" });
}

export function verifyAuthToken(token: string): JwtUserPayload {
  return jwt.verify(token, jwtSecret) as unknown as JwtUserPayload;
}
