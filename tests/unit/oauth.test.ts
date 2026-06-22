import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cacheCimdDocument,
  clearCimdCache,
  fetchCimdDocument,
  getCachedCimdDocument,
  redirectUriAllowed,
} from '$lib/server/oauth/cimd';
import { callsProtectedMcpTool } from '$lib/server/oauth/lazy-auth';
import { resolveAuthorizeParams, normalizeAuthorizeScope } from '$lib/server/oauth/authorize';
import { purgeExpiredOAuthRows, revokeRefreshTokensForUserClient } from '$lib/server/oauth/db';
import { verifyPkceChallenge } from '$lib/server/oauth/pkce';

describe('callsProtectedMcpTool', () => {
  it('treats format as public', () => {
    const body = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'format', arguments: { name: 'doc' } },
    };
    expect(callsProtectedMcpTool(body)).toBe(false);
  });

  it('treats publish as protected', () => {
    const body = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'publish', arguments: { markdown: '# hi' } },
    };
    expect(callsProtectedMcpTool(body)).toBe(true);
  });
});

describe('CIMD cache', () => {
  afterEach(() => {
    clearCimdCache();
    vi.restoreAllMocks();
  });

  it('returns cached document without a second network fetch', async () => {
    const clientId = 'https://app.example/oauth-client.json';
    const doc = {
      client_id: clientId,
      redirect_uris: ['http://127.0.0.1:8080/callback'],
    };

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(doc), { status: 200 }))
    );

    await fetchCimdDocument(clientId);
    await fetchCimdDocument(clientId);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(getCachedCimdDocument(clientId)).toEqual(doc);
  });

  it('rejects redirect_uri that was not in the cached authorization snapshot', () => {
    const clientId = 'https://app.example/oauth-client.json';
    cacheCimdDocument(clientId, {
      client_id: clientId,
      redirect_uris: ['https://app.example/callback'],
    });

    expect(
      redirectUriAllowed(getCachedCimdDocument(clientId)!, 'https://evil.example/callback')
    ).toBe(false);
  });
});

describe('verifyPkceChallenge', () => {
  it('accepts a valid S256 verifier', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

    await expect(verifyPkceChallenge(verifier, challenge, 'S256')).resolves.toBe(true);
  });
});

describe('resolveAuthorizeParams', () => {
  const pending = {
    response_type: 'code' as const,
    client_id: 'https://claude.ai/oauth/claude-code-client-metadata',
    redirect_uri: 'http://127.0.0.1:51234/callback',
    scope: 'pages:read',
    code_challenge: 'abc',
    code_challenge_method: 'S256' as const,
  };

  it('reads full query string on GET', () => {
    const q = new URLSearchParams({
      response_type: 'code',
      client_id: pending.client_id,
      redirect_uri: pending.redirect_uri,
      code_challenge: pending.code_challenge,
      code_challenge_method: 'S256',
    });
    const resolved = resolveAuthorizeParams(q, undefined);
    expect(resolved.client_id).toBe(pending.client_id);
  });

  it('falls back to pending cookie on POST (empty query)', () => {
    const resolved = resolveAuthorizeParams(new URLSearchParams(), JSON.stringify(pending));
    expect(resolved.redirect_uri).toBe(pending.redirect_uri);
  });
});

describe('normalizeAuthorizeScope', () => {
  it('adds offline_access when client omits it', () => {
    expect(normalizeAuthorizeScope('pages:read')).toBe('pages:read offline_access');
  });

  it('keeps offline_access when already present', () => {
    expect(normalizeAuthorizeScope('pages:read offline_access')).toBe('pages:read offline_access');
  });
});

function mockD1(runCalls: { sql: string; args: unknown[]; changes: number }[]) {
  return {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async run() {
              runCalls.push({ sql, args, changes: 2 });
              return { meta: { changes: 2 } };
            },
          };
        },
      };
    },
  } as unknown as import('@cloudflare/workers-types').D1Database;
}

describe('OAuth cleanup', () => {
  it('purges expired authorization codes and refresh tokens', async () => {
    const calls: { sql: string; args: unknown[]; changes: number }[] = [];
    const result = await purgeExpiredOAuthRows(mockD1(calls));
    expect(result).toEqual({ authorizationCodes: 2, refreshTokens: 2 });
    expect(calls).toHaveLength(2);
    expect(calls[0]?.sql).toContain('oauth_authorization_codes');
    expect(calls[1]?.sql).toContain('oauth_refresh_tokens');
  });

  it('revokes refresh tokens for a user and client pair', async () => {
    const calls: { sql: string; args: unknown[]; changes: number }[] = [];
    const deleted = await revokeRefreshTokensForUserClient(
      mockD1(calls),
      'user-1',
      'https://claude.ai/oauth/claude-code-client-metadata'
    );
    expect(deleted).toBe(2);
    expect(calls[0]?.args).toEqual([
      'user-1',
      'https://claude.ai/oauth/claude-code-client-metadata',
    ]);
  });
});
