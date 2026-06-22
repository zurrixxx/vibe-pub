import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createOAuthAccessToken } from '$lib/server/auth';
import { getCachedCimdDocument, redirectUriAllowed } from '$lib/server/oauth/cimd';
import {
  consumeAuthorizationCode,
  lookupOAuthClient,
  purgeExpiredOAuthRows,
  replaceRefreshTokenForUserClient,
  rotateRefreshToken,
} from '$lib/server/oauth/db';
import { mcpResourcePath, OAUTH_ACCESS_EXPIRY_SECONDS } from '$lib/server/oauth/constants';
import { verifyPkceChallenge } from '$lib/server/oauth/pkce';
import { getDb } from '$lib/server/db';

async function parseTokenBody(request: Request): Promise<URLSearchParams> {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return new URLSearchParams(await request.text());
  }
  if (contentType.includes('application/json')) {
    const body = (await request.json()) as Record<string, string>;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      if (value != null) params.set(key, String(value));
    }
    return params;
  }
  throw error(400, 'Content-Type must be application/x-www-form-urlencoded or application/json');
}

export const POST: RequestHandler = async ({ request, platform }) => {
  if (!platform) throw error(500, 'Platform unavailable');

  const body = await parseTokenBody(request);
  const grantType = body.get('grant_type');
  const baseUrl = platform.env.BASE_URL ?? new URL(request.url).origin;
  const issuer = baseUrl.replace(/\/$/, '');
  const resourceAud = mcpResourcePath(baseUrl);
  const db = getDb(platform);
  await purgeExpiredOAuthRows(db);

  if (grantType === 'authorization_code') {
    const code = body.get('code');
    const redirectUri = body.get('redirect_uri');
    const clientId = body.get('client_id');
    const codeVerifier = body.get('code_verifier');

    if (!code || !redirectUri || !clientId || !codeVerifier) {
      throw error(400, 'code, redirect_uri, client_id, and code_verifier are required');
    }
    if (!clientId.startsWith('https://')) {
      throw error(400, 'client_id must be an HTTPS URL');
    }

    const row = await consumeAuthorizationCode(db, code);
    if (!row) throw error(400, 'Invalid or expired authorization code');
    if (row.client_id !== clientId || row.redirect_uri !== redirectUri) {
      throw error(400, 'Authorization code does not match client_id or redirect_uri');
    }

    if (clientId.startsWith('https://')) {
      // CIMD path: use the snapshot cached at authorization time (never re-fetch — TOCTOU).
      const cachedCimd = getCachedCimdDocument(clientId);
      if (cachedCimd && !redirectUriAllowed(cachedCimd, redirectUri)) {
        throw error(400, 'redirect_uri is not allowed for this client_id');
      }
    } else {
      // DCR path: look up the registered client and verify the redirect_uri.
      const dcrClient = await lookupOAuthClient(db, clientId);
      if (!dcrClient) throw error(400, 'Unknown client_id');
      if (
        !redirectUriAllowed(
          { client_id: clientId, redirect_uris: dcrClient.redirect_uris },
          redirectUri
        )
      ) {
        throw error(400, 'redirect_uri is not allowed for this client_id');
      }
    }

    const pkceOk = await verifyPkceChallenge(
      codeVerifier,
      row.code_challenge,
      row.code_challenge_method
    );
    if (!pkceOk) throw error(400, 'Invalid code_verifier');

    const accessToken = await createOAuthAccessToken(
      row.user_id,
      row.scope,
      platform.env.JWT_SECRET,
      resourceAud,
      issuer
    );

    const response: Record<string, unknown> = {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: OAUTH_ACCESS_EXPIRY_SECONDS,
      scope: row.scope,
    };

    const refreshToken = crypto.randomUUID().replace(/-/g, '');
    await replaceRefreshTokenForUserClient(db, {
      token: refreshToken,
      client_id: clientId,
      user_id: row.user_id,
      scope: row.scope,
    });
    response.refresh_token = refreshToken;

    return json(response);
  }

  if (grantType === 'refresh_token') {
    const refreshToken = body.get('refresh_token');
    const clientId = body.get('client_id');
    if (!refreshToken || !clientId) {
      throw error(400, 'refresh_token and client_id are required');
    }

    const newRefreshToken = crypto.randomUUID().replace(/-/g, '');
    const row = await rotateRefreshToken(db, refreshToken, newRefreshToken);
    if (!row || row.client_id !== clientId) {
      throw error(400, 'Invalid refresh_token');
    }

    const accessToken = await createOAuthAccessToken(
      row.user_id,
      row.scope,
      platform.env.JWT_SECRET,
      resourceAud,
      issuer
    );

    return json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: OAUTH_ACCESS_EXPIRY_SECONDS,
      refresh_token: newRefreshToken,
      scope: row.scope,
    });
  }

  throw error(400, 'Unsupported grant_type');
};
