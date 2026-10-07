import jwt from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET;

// Fail fast with a clear message instead of crashing on the first login.
if (!jwtSecret || jwtSecret.length < 32) {
  console.error("JWT_SECRET is missing or too short (min 32 chars). Check your .env file.");
  process.exit(1);
}

export interface JwtUserPayload {
  userId: string;
}

export function signAuthToken(payload: JwtUserPayload): string {
  return jwt.sign(payload, jwtSecret!, { expiresIn: "7d" });
}

export function verifyAuthToken(token: string): JwtUserPayload {
  const payload = jwt.verify(token, jwtSecret!);
  if (typeof payload !== "object" || typeof payload.userId !== "string") {
    throw new Error("Invalid token payload");
  }
  return { userId: payload.userId };
}
