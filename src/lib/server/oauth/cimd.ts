export type CimdDocument = {
  client_id: string;
  client_name?: string;
  redirect_uris: string[];
};

export async function fetchCimdDocument(clientId: string): Promise<CimdDocument> {
  let url: URL;
  try {
    url = new URL(clientId);
  } catch {
    throw new Error('client_id must be an HTTPS URL');
  }
  if (url.protocol !== 'https:') {
    throw new Error('client_id must use HTTPS');
  }

  const res = await fetch(clientId, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Could not fetch client metadata (${res.status})`);
  }

  const doc = (await res.json()) as CimdDocument;
  if (doc.client_id !== clientId) {
    throw new Error('client_id metadata document is not self-referential');
  }
  if (!Array.isArray(doc.redirect_uris) || doc.redirect_uris.length === 0) {
    throw new Error('client_id metadata missing redirect_uris');
  }
  return doc;
}

function loopbackOrigin(uri: string): string | null {
  try {
    const u = new URL(uri);
    if (u.protocol !== 'http:') return null;
    if (u.hostname !== '127.0.0.1' && u.hostname !== 'localhost' && u.hostname !== '[::1]') {
      return null;
    }
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return null;
  }
}

function loopbackMatch(requested: string, allowed: string): boolean {
  const reqLoop = loopbackOrigin(requested);
  const allowLoop = loopbackOrigin(allowed);
  if (!reqLoop || !allowLoop) return false;
  return reqLoop === allowLoop;
}

export function redirectUriAllowed(doc: CimdDocument, redirectUri: string): boolean {
  if (doc.redirect_uris.includes(redirectUri)) return true;
  return doc.redirect_uris.some((allowed) => loopbackMatch(redirectUri, allowed));
}

export function clientDisplayHost(clientId: string): string {
  try {
    return new URL(clientId).host;
  } catch {
    return clientId;
  }
}
