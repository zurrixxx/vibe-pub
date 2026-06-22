import {
  verifyOAuthAccessToken,
  verifySessionToken,
  type OAuthAccessClaims,
} from '$lib/server/auth';
import { mcpResourcePath } from '$lib/server/oauth/constants';

export async function resolveUserIdFromBearer(
  token: string | null | undefined,
  jwtSecret: string,
  baseUrl: string
): Promise<string | null> {
  if (!token) return null;

  const issuer = baseUrl.replace(/\/$/, '');
  const resourceAud = mcpResourcePath(baseUrl);

  const oauth = await verifyOAuthAccessToken(token, jwtSecret, resourceAud, issuer);
  if (oauth) return oauth.userId;

  return verifySessionToken(token, jwtSecret);
}

export async function resolveOAuthClaimsFromBearer(
  token: string | null | undefined,
  jwtSecret: string,
  baseUrl: string
): Promise<OAuthAccessClaims | null> {
  if (!token) return null;
  const issuer = baseUrl.replace(/\/$/, '');
  const resourceAud = mcpResourcePath(baseUrl);
  return verifyOAuthAccessToken(token, jwtSecret, resourceAud, issuer);
}
