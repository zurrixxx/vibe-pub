import type { Cookies } from '@sveltejs/kit';
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

// --- CLI localhost auth (browser authorize → callback on 127.0.0.1) ---

/** Pending CLI localhost callback (state + port), set when user opens /auth/cli */
export const CLI_AUTH_COOKIE = 'vibe_cli_auth';
const CLI_AUTH_MAX_AGE = 15 * 60;

export type CliAuthPending = {
  state: string;
  port: number;
};

export function validateCliAuthParams(state: string | null, port: string | null): CliAuthPending {
  if (!state || !port) {
    throw new Error('Missing state or port');
  }
  if (!/^[a-f0-9]{32}$/.test(state)) {
    throw new Error('Invalid state');
  }
  const portNum = Number.parseInt(port, 10);
  if (!Number.isInteger(portNum) || portNum < 1024 || portNum > 65535) {
    throw new Error('Invalid port');
  }
  return { state, port: portNum };
}

export function buildCliCallbackUrl(pending: CliAuthPending, sessionToken: string): string {
  const params = new URLSearchParams({ state: pending.state, token: sessionToken });
  return `http://127.0.0.1:${pending.port}/callback?${params}`;
}

export function parseCliAuthCookie(raw: string | undefined): CliAuthPending | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { state?: string; port?: number };
    if (!data.state || data.port == null) return null;
    return validateCliAuthParams(data.state, String(data.port));
  } catch {
    return null;
  }
}

export function setCliAuthCookie(cookies: Cookies, pending: CliAuthPending) {
  cookies.set(CLI_AUTH_COOKIE, JSON.stringify({ state: pending.state, port: pending.port }), {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: CLI_AUTH_MAX_AGE,
  });
}

export function buildCliAuthPageUrl(pending: CliAuthPending): string {
  const params = new URLSearchParams({
    state: pending.state,
    port: String(pending.port),
  });
  return `/auth/cli?${params}`;
}

function resolveCliPending(cookies: Cookies, url?: URL): CliAuthPending | null {
  if (url) {
    try {
      return validateCliAuthParams(url.searchParams.get('state'), url.searchParams.get('port'));
    } catch {
      /* fall through */
    }
  }
  return parseCliAuthCookie(cookies.get(CLI_AUTH_COOKIE));
}

/** After sign-in: return to CLI authorize page (user must click Authorize — never auto-callback). */
export function cliAuthContinueResponse(
  sessionToken: string,
  cookies: Cookies,
  url?: URL
): Response | null {
  const pending = resolveCliPending(cookies, url);
  if (!pending) return null;

  const headers = new Headers();
  headers.set('Location', buildCliAuthPageUrl(pending));
  headers.append('Set-Cookie', getSessionCookie(sessionToken));

  return new Response(null, { status: 302, headers });
}
