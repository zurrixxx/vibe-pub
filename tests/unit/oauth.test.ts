import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cacheCimdDocument,
  clearCimdCache,
  fetchCimdDocument,
  getCachedCimdDocument,
  redirectUriAllowed,
} from '$lib/server/oauth/cimd';
import { callsProtectedMcpTool } from '$lib/server/oauth/lazy-auth';
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
