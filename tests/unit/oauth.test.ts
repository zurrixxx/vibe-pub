import { describe, expect, it } from 'vitest';
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
