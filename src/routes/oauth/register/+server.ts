import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { insertOAuthClient } from '$lib/server/oauth/db';
import { DEFAULT_MCP_SCOPE } from '$lib/server/oauth/constants';
import { getDb } from '$lib/server/db';

function isAllowedRedirectUri(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.protocol === 'https:') return true;
    if (
      u.protocol === 'http:' &&
      (u.hostname === '127.0.0.1' || u.hostname === 'localhost' || u.hostname === '[::1]')
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const POST: RequestHandler = async ({ request, platform }) => {
  if (!platform) {
    return json({ error: 'server_error' }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json(
      { error: 'invalid_client_metadata', error_description: 'Request body must be JSON' },
      { status: 400 }
    );
  }

  const redirectUris = body.redirect_uris;
  if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
    return json(
      { error: 'invalid_redirect_uri', error_description: 'redirect_uris is required' },
      { status: 400 }
    );
  }

  for (const uri of redirectUris) {
    if (typeof uri !== 'string' || !isAllowedRedirectUri(uri)) {
      return json(
        {
          error: 'invalid_redirect_uri',
          error_description: `${uri} must be an HTTPS or loopback URI`,
        },
        { status: 400 }
      );
    }
  }

  const clientName = typeof body.client_name === 'string' ? body.client_name.slice(0, 200) : null;
  const clientId = crypto.randomUUID().replace(/-/g, '');

  const db = getDb(platform);
  await insertOAuthClient(db, {
    client_id: clientId,
    client_name: clientName,
    redirect_uris: redirectUris as string[],
  });

  return json(
    {
      client_id: clientId,
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_method: 'none',
      scope: DEFAULT_MCP_SCOPE,
    },
    { status: 201 }
  );
};
