import { SignJWT, jwtVerify } from 'jose';

const COOKIE_NAME = 'vibe_session';
const TOKEN_EXPIRY = '7d';
const MAGIC_LINK_EXPIRY = '15m';

function getSecret(jwtSecret: string): Uint8Array {
  return new TextEncoder().encode(jwtSecret);
}

export async function createMagicLinkToken(email: string, jwtSecret: string): Promise<string> {
  return new SignJWT({ email, purpose: 'magic-link' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(MAGIC_LINK_EXPIRY)
    .setIssuedAt()
    .sign(getSecret(jwtSecret));
}

export async function verifyMagicLinkToken(
  token: string,
  jwtSecret: string
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(jwtSecret));
    if (payload.purpose !== 'magic-link') return null;
    return payload.email as string;
  } catch {
    return null;
  }
}

export async function createSessionToken(userId: string, jwtSecret: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(TOKEN_EXPIRY)
    .setIssuedAt()
    .sign(getSecret(jwtSecret));
}

export async function verifySessionToken(token: string, jwtSecret: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(jwtSecret));
    return payload.sub as string;
  } catch {
    return null;
  }
}

export function getSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export { COOKIE_NAME };
