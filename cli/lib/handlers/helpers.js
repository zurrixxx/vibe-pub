import { readFileSync } from 'fs';
import * as api from '../api.js';
import { getToken } from '../config.js';
import { err } from '../cli-helpers.js';
import { RESOURCE_ACCESS, LEGACY_RESOURCE_ACCESS } from '../constants.js';

/** @typedef {{ format: string }} HandlerCtx */
/** @typedef {'viewer' | 'editor'} AccessRole */
/** @typedef {{ email?: string, domain?: string, access_role?: AccessRole }} ShareBody */
/** @typedef {{ grantee_type: string, grantee_id: string, label?: string, access_role?: AccessRole }} AccessShareRow */
/** @typedef {{ email?: string, user_id: string, username?: string, access_role?: AccessRole }} SharedUserRow */
/** @typedef {{ shares?: AccessShareRow[], shared_users?: SharedUserRow[], default_group_id?: string }} AccessStatusPayload */
/** @typedef {{ email?: string, domain?: string }} UnshareTarget */

/** @param {string | undefined} access */
export function accessFromOption(access) {
  if (access === undefined) return undefined;
  if (access === LEGACY_RESOURCE_ACCESS) return 'public';
  if (RESOURCE_ACCESS.includes(access)) return access;
  err(
    `Invalid --access "${access}". Use "public" or "private". ("unlisted" is no longer supported; use "public".)`
  );
}

export async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
  });
}

/** @param {string | undefined} fileArg */
export function readMarkdown(fileArg) {
  if (fileArg) {
    try {
      return readFileSync(fileArg, 'utf8');
    } catch {
      err(`Could not read file: ${fileArg}`);
    }
  }
  return null;
}

/** @param {string} slug */
export async function resolveSlug(slug) {
  try {
    return await api.getBySlug(slug);
  } catch (e) {
    const status = /** @type {{ status?: number }} */ (e).status ?? 1;
    err(`Page not found: ${slug}`, status);
  }
}

export function requireToken() {
  if (!getToken()) err('Not logged in. Run: vibe-pub login');
}

/** @param {string | undefined} role @returns {AccessRole | undefined} */
function parseAccessRole(role) {
  if (!role) return undefined;
  if (role !== 'viewer' && role !== 'editor') err('--role must be viewer or editor');
  return /** @type {AccessRole} */ (role);
}

/** @param {{ email?: string, domain?: string, role?: string }} opts @returns {ShareBody} */
export function buildShareBody(opts) {
  const email = opts.email;
  const domain = opts.domain;
  if (!email && !domain) err('Provide --email or --domain');
  if (email && domain) err('Provide only one of --email or --domain');
  const role = parseAccessRole(opts.role);
  if (email) {
    /** @type {ShareBody & { email: string }} */
    const body = { email };
    if (role) body.access_role = role;
    return body;
  }
  /** @type {ShareBody & { domain: string | undefined }} */
  const body = { domain };
  if (role) body.access_role = role;
  return body;
}

/** @param {unknown} input */
function normalizeDomainInput(input) {
  return String(input).replace(/^@+/, '').trim().toLowerCase();
}

/** @param {{ email?: string, domain?: string }} opts @returns {UnshareTarget} */
export function parseUnshareTarget(opts) {
  const email = opts.email;
  const domain = opts.domain;
  if (!email && !domain) err('Provide --email or --domain');
  if (email && domain) err('Provide only one of --email or --domain');
  return {
    email: email ? String(email).trim().toLowerCase() : undefined,
    domain: domain ? normalizeDomainInput(domain) : undefined,
  };
}

/**
 * @param {AccessStatusPayload} payload
 * @param {UnshareTarget} target
 * @param {(granteeId: string) => Promise<unknown>} removeDomainShare
 * @param {(groupId: string, userId: string) => Promise<unknown>} removeUserShare
 */
export async function revokeResourceShare(payload, target, removeDomainShare, removeUserShare) {
  if (target.domain) {
    const shares = Array.isArray(payload?.shares) ? payload.shares : [];
    const row = shares.find(
      (s) => s.grantee_type === 'domain' && normalizeDomainInput(s.label ?? '') === target.domain
    );
    if (!row) err(`No domain share found for: ${target.domain}`);
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
  if (!user) err(`No user share found for: ${target.email}`);
  const groupId = payload.default_group_id;
  if (!groupId) err('Could not resolve access group for this resource');
  await removeUserShare(groupId, user.user_id);
}

/** @param {string} access @param {AccessStatusPayload} payload */
export function formatAccessStatus(access, payload) {
  const shares = Array.isArray(payload?.shares) ? payload.shares : [];
  const sharedUsers = Array.isArray(payload?.shared_users) ? payload.shared_users : [];
  return {
    access,
    domains: shares
      .filter((s) => s.grantee_type === 'domain')
      .map((s) => ({
        domain: s.label ?? s.grantee_id,
        grantee_id: s.grantee_id,
        access_role: s.access_role ?? 'viewer',
      })),
    users: sharedUsers.map((u) => ({
      email: u.email,
      username: u.username,
      user_id: u.user_id,
      access_role: u.access_role,
    })),
  };
}
