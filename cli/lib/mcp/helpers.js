/**
 * @param {unknown} data
 * @returns {{ content: [{ type: 'text', text: string }] }}
 */
export function mcpJson(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
}

/** @param {unknown} input */
function normalizeDomain(input) {
  return String(input).replace(/^@+/, '').trim().toLowerCase();
}

/**
 * @param {{ email?: string; domain?: string; role?: string }} opts
 * @returns {{ email: string; access_role?: string } | { domain: string; access_role?: string }}
 */
export function buildShareBody({ email, domain, role }) {
  if (!email && !domain) throw new Error('Provide email or domain');
  if (email && domain) throw new Error('Provide only one of email or domain');
  if (email) {
    /** @type {{ email: string; access_role?: string }} */
    const body = { email };
    if (role) body.access_role = role;
    return body;
  }
  /** @type {{ domain: string; access_role?: string }} */
  const body = { domain: normalizeDomain(domain) };
  if (role) body.access_role = role;
  return body;
}

/**
 * @param {{ email?: string; domain?: string }} opts
 * @returns {{ email?: string; domain?: string }}
 */
export function parseUnshareTarget({ email, domain }) {
  if (!email && !domain) throw new Error('Provide email or domain');
  if (email && domain) throw new Error('Provide only one of email or domain');
  return {
    email: email ? String(email).trim().toLowerCase() : undefined,
    domain: domain ? normalizeDomain(domain) : undefined,
  };
}

/**
 * @typedef {{ grantee_type?: string; label?: string; grantee_id: string }} ShareRow
 * @typedef {{ email?: string; user_id: string }} SharedUser
 * @typedef {{
 *   shares?: ShareRow[];
 *   shared_users?: SharedUser[];
 *   default_group_id?: string;
 * }} SharePayload
 */

/**
 * @param {SharePayload} payload
 * @param {{ email?: string; domain?: string }} target
 * @param {(granteeId: string) => Promise<void>} removeDomainShare
 * @param {(groupId: string, userId: string) => Promise<void>} removeUserShare
 */
export async function revokeResourceShare(payload, target, removeDomainShare, removeUserShare) {
  if (target.domain) {
    const shares = Array.isArray(payload?.shares) ? payload.shares : [];
    const row = shares.find(
      (s) => s.grantee_type === 'domain' && normalizeDomain(s.label ?? '') === target.domain
    );
    if (!row) throw new Error(`No domain share found for: ${target.domain}`);
    await removeDomainShare(row.grantee_id);
    return;
  }

  const users = Array.isArray(payload?.shared_users) ? payload.shared_users : [];
  const user = users.find(
    (u) =>
      String(u.email ?? '')
        .trim()
        .toLowerCase() === target.email
  );
  if (!user) throw new Error(`No user share found for: ${target.email}`);
  const groupId = payload.default_group_id;
  if (!groupId) throw new Error('Could not resolve access group for this resource');
  await removeUserShare(groupId, user.user_id);
}
