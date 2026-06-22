import { error } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import { DEFAULT_MCP_SCOPE } from './constants';
import { fetchCimdDocument, redirectUriAllowed } from './cimd';
import { lookupOAuthClient } from './db';

export type OAuthAuthorizeRequest = {
  response_type: 'code';
  client_id: string;
  redirect_uri: string;
  scope: string;
  state?: string;
  code_challenge: string;
  code_challenge_method: 'S256';
};

export const OAUTH_PENDING_COOKIE = 'vibe_oauth_pending';
const OAUTH_PENDING_MAX_AGE = 15 * 60;

export function parseAuthorizeParams(searchParams: URLSearchParams): OAuthAuthorizeRequest {
  const response_type = searchParams.get('response_type')?.trim();
  if (response_type !== 'code') {
    throw error(400, 'Only response_type=code is supported');
  }

  const client_id = searchParams.get('client_id');
  const redirect_uri = searchParams.get('redirect_uri');
  const code_challenge = searchParams.get('code_challenge');
  const code_challenge_method = searchParams.get('code_challenge_method') ?? 'S256';

  if (!client_id) throw error(400, 'client_id is required');
  if (!redirect_uri) throw error(400, 'redirect_uri is required');
  if (!code_challenge) throw error(400, 'code_challenge is required (PKCE)');
  if (code_challenge_method !== 'S256') {
    throw error(400, 'Only code_challenge_method=S256 is supported');
  }

  const scope = normalizeAuthorizeScope(searchParams.get('scope')?.trim() || DEFAULT_MCP_SCOPE);
  const state = searchParams.get('state') ?? undefined;

  return {
    response_type: 'code',
    client_id,
    redirect_uri,
    scope,
    state,
    code_challenge,
    code_challenge_method: 'S256',
  };
}

function hasAuthorizeQueryParams(searchParams: URLSearchParams): boolean {
  return (
    searchParams.get('response_type')?.trim() === 'code' &&
    !!searchParams.get('client_id') &&
    !!searchParams.get('redirect_uri') &&
    !!searchParams.get('code_challenge')
  );
}

/** URL query on GET; pending cookie on POST form actions (SvelteKit strips query params). */
export function resolveAuthorizeParams(
  searchParams: URLSearchParams,
  pendingRaw: string | undefined
): OAuthAuthorizeRequest {
  if (hasAuthorizeQueryParams(searchParams)) {
    return parseAuthorizeParams(searchParams);
  }

  const pending = parseOAuthPendingCookie(pendingRaw);
  if (pending) return pending;

  throw error(
    400,
    'OAuth session expired or invalid. Restart authorization from Claude Code (/mcp → Authenticate).'
  );
}

export async function validateAuthorizeRequest(
  params: OAuthAuthorizeRequest,
  db?: D1Database
): Promise<{ clientHost: string }> {
  if (params.client_id.startsWith('https://')) {
    // CIMD path: client_id is the URL of the client metadata document
    const doc = await fetchCimdDocument(params.client_id);
    if (!redirectUriAllowed(doc, params.redirect_uri)) {
      throw error(400, 'redirect_uri is not allowed for this client_id');
    }
    try {
      return { clientHost: new URL(params.client_id).host };
    } catch {
      throw error(400, 'Invalid client_id URL');
    }
  }

  // DCR path: client_id is an opaque identifier issued by /oauth/register
  if (!db) throw error(400, 'client_id must be an HTTPS URL (CIMD) or a DCR-registered client');
  const client = await lookupOAuthClient(db, params.client_id);
  if (!client) throw error(400, 'Unknown client_id');
  if (
    !redirectUriAllowed(
      { client_id: params.client_id, redirect_uris: client.redirect_uris },
      params.redirect_uri
    )
  ) {
    throw error(400, 'redirect_uri is not allowed for this client_id');
  }
  return { clientHost: client.client_name ?? params.client_id.slice(0, 20) };
}

export function setOAuthPendingCookie(cookies: Cookies, params: OAuthAuthorizeRequest) {
  cookies.set(OAUTH_PENDING_COOKIE, JSON.stringify(params), {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: OAUTH_PENDING_MAX_AGE,
  });
}

export function parseOAuthPendingCookie(raw: string | undefined): OAuthAuthorizeRequest | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as OAuthAuthorizeRequest;
    if (
      data.response_type !== 'code' ||
      !data.client_id ||
      !data.redirect_uri ||
      !data.code_challenge
    ) {
      return null;
    }
    return { ...data, scope: normalizeAuthorizeScope(data.scope) };
  } catch {
    return null;
  }
}

export function clearOAuthPendingCookie(cookies: Cookies) {
  cookies.delete(OAUTH_PENDING_COOKIE, { path: '/' });
}

export function buildAuthorizeUrl(params: OAuthAuthorizeRequest): string {
  const q = new URLSearchParams({
    response_type: params.response_type,
    client_id: params.client_id,
    redirect_uri: params.redirect_uri,
    code_challenge: params.code_challenge,
    code_challenge_method: params.code_challenge_method,
    scope: params.scope,
  });
  if (params.state) q.set('state', params.state);
  return `/oauth/authorize?${q}`;
}

export function scopeList(scope: string): string[] {
  return scope.split(/\s+/).filter(Boolean);
}

/** MCP clients need offline_access for refresh tokens (SEP-2207); merge if omitted. */
export function normalizeAuthorizeScope(scope: string): string {
  const parts = new Set(scope.split(/\s+/).filter(Boolean));
  parts.add('offline_access');
  return [...parts].join(' ');
}
