import type { D1Database } from '@cloudflare/workers-types';

// --- DCR clients ---

type OAuthClientRow = {
  client_id: string;
  client_name: string | null;
  redirect_uris: string;
};

export async function insertOAuthClient(
  db: D1Database,
  client: { client_id: string; client_name: string | null; redirect_uris: string[] }
): Promise<void> {
  await db
    .prepare(`INSERT INTO oauth_clients (client_id, client_name, redirect_uris) VALUES (?, ?, ?)`)
    .bind(client.client_id, client.client_name, JSON.stringify(client.redirect_uris))
    .run();
}

export async function lookupOAuthClient(
  db: D1Database,
  clientId: string
): Promise<{ redirect_uris: string[]; client_name: string | null } | null> {
  const row = await db
    .prepare(`SELECT client_id, client_name, redirect_uris FROM oauth_clients WHERE client_id = ?`)
    .bind(clientId)
    .first<OAuthClientRow>();
  if (!row) return null;
  return { redirect_uris: JSON.parse(row.redirect_uris) as string[], client_name: row.client_name };
}

export type AuthorizationCodeRow = {
  code: string;
  client_id: string;
  redirect_uri: string;
  user_id: string;
  scope: string;
  code_challenge: string;
  code_challenge_method: string;
  expires_at: string;
};

export type RefreshTokenRow = {
  token: string;
  client_id: string;
  user_id: string;
  scope: string;
  expires_at: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function expiresInMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function expiresInDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

export async function insertAuthorizationCode(
  db: D1Database,
  row: Omit<AuthorizationCodeRow, 'expires_at'> & { expires_at?: string }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO oauth_authorization_codes
       (code, client_id, redirect_uri, user_id, scope, code_challenge, code_challenge_method, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      row.code,
      row.client_id,
      row.redirect_uri,
      row.user_id,
      row.scope,
      row.code_challenge,
      row.code_challenge_method,
      row.expires_at ?? expiresInMinutes(10)
    )
    .run();
}

export async function consumeAuthorizationCode(
  db: D1Database,
  code: string
): Promise<AuthorizationCodeRow | null> {
  const row = await db
    .prepare(
      `SELECT code, client_id, redirect_uri, user_id, scope, code_challenge, code_challenge_method, expires_at
       FROM oauth_authorization_codes WHERE code = ?`
    )
    .bind(code)
    .first<AuthorizationCodeRow>();

  if (!row) return null;

  await db.prepare('DELETE FROM oauth_authorization_codes WHERE code = ?').bind(code).run();

  if (row.expires_at < nowIso()) return null;
  return row;
}

export async function insertRefreshToken(
  db: D1Database,
  row: Omit<RefreshTokenRow, 'expires_at'> & { expires_at?: string }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO oauth_refresh_tokens (token, client_id, user_id, scope, expires_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(row.token, row.client_id, row.user_id, row.scope, row.expires_at ?? expiresInDays(30))
    .run();
}

export async function revokeRefreshTokensForUserClient(
  db: D1Database,
  userId: string,
  clientId: string
): Promise<number> {
  const result = await db
    .prepare(`DELETE FROM oauth_refresh_tokens WHERE user_id = ? AND client_id = ?`)
    .bind(userId, clientId)
    .run();
  return result.meta.changes ?? 0;
}

/** One active refresh token per user + client (re-auth revokes prior tokens). */
export async function replaceRefreshTokenForUserClient(
  db: D1Database,
  row: Omit<RefreshTokenRow, 'expires_at'> & { expires_at?: string }
): Promise<string> {
  await revokeRefreshTokensForUserClient(db, row.user_id, row.client_id);
  await insertRefreshToken(db, row);
  return row.token;
}

export type OAuthPurgeResult = {
  authorizationCodes: number;
  refreshTokens: number;
};

export async function purgeExpiredOAuthRows(db: D1Database): Promise<OAuthPurgeResult> {
  const now = nowIso();
  const codes = await db
    .prepare(`DELETE FROM oauth_authorization_codes WHERE expires_at < ?`)
    .bind(now)
    .run();
  const refreshTokens = await db
    .prepare(`DELETE FROM oauth_refresh_tokens WHERE expires_at < ?`)
    .bind(now)
    .run();
  return {
    authorizationCodes: codes.meta.changes ?? 0,
    refreshTokens: refreshTokens.meta.changes ?? 0,
  };
}

export async function consumeRefreshToken(
  db: D1Database,
  token: string
): Promise<RefreshTokenRow | null> {
  const row = await db
    .prepare(
      `SELECT token, client_id, user_id, scope, expires_at
       FROM oauth_refresh_tokens WHERE token = ?`
    )
    .bind(token)
    .first<RefreshTokenRow>();

  if (!row) return null;
  if (row.expires_at < nowIso()) {
    await db.prepare('DELETE FROM oauth_refresh_tokens WHERE token = ?').bind(token).run();
    return null;
  }
  return row;
}

export async function rotateRefreshToken(
  db: D1Database,
  oldToken: string,
  newToken: string
): Promise<RefreshTokenRow | null> {
  const row = await consumeRefreshToken(db, oldToken);
  if (!row) return null;
  await db.prepare('DELETE FROM oauth_refresh_tokens WHERE token = ?').bind(oldToken).run();
  await insertRefreshToken(db, {
    token: newToken,
    client_id: row.client_id,
    user_id: row.user_id,
    scope: row.scope,
  });
  return row;
}

export async function hasOAuthGrant(
  db: D1Database,
  userId: string,
  clientId: string
): Promise<boolean> {
  const row = await db
    .prepare(`SELECT 1 FROM oauth_user_grants WHERE user_id = ? AND client_id = ?`)
    .bind(userId, clientId)
    .first();
  return !!row;
}

export async function upsertOAuthGrant(
  db: D1Database,
  userId: string,
  clientId: string
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO oauth_user_grants (user_id, client_id) VALUES (?, ?)
       ON CONFLICT(user_id, client_id) DO UPDATE SET granted_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`
    )
    .bind(userId, clientId)
    .run();
}
