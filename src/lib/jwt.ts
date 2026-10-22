import { SignJWT, jwtVerify } from 'jose';
import { UserRole } from '@/lib/types';

export const TOKEN_COOKIE_NAME = 'docavail_token';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'docavail-secret-key-change-in-production-2026';
const JWT_SECRET_BYTES = new TextEncoder().encode(JWT_SECRET_STRING);

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

/**
 * Sign a JWT token using Web Crypto (compatible with Edge Runtime & Node.js).
 */
export async function signJwtToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    name: payload.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET_BYTES);
}

/**
 * Verify a JWT token using Web Crypto (compatible with Edge Runtime & Node.js).
 * Returns decoded TokenPayload or null if invalid or expired.
 */
export async function verifyJwtToken(token: string): Promise<TokenPayload | null> {
  try {
    if (!token) return null;
    const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as UserRole,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}
