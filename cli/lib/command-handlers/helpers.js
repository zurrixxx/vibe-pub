import { readFileSync } from 'fs';
import * as api from '../api.js';
import { getToken } from '../config.js';
import { err } from '../output.js';
import { RESOURCE_ACCESS, LEGACY_RESOURCE_ACCESS } from '../constants.js';

/** @typedef {{ cleanArgs: string[], format: string }} CliContext */

export function accessFromFlags(flags) {
  const access = flags.access;
  if (access === undefined || access === true) return undefined;
  if (access === LEGACY_RESOURCE_ACCESS) return 'public';
  if (RESOURCE_ACCESS.includes(access)) return access;
  err(
    `Invalid --access "${access}". Use "public" or "private". ("unlisted" is no longer supported; use "public".)`
  );
}

export function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      flags[argv[i].slice(2)] = argv[i + 1] ?? true;
      i++;
    }
  }
  return flags;
}

export async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
  });
}

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

export async function resolveSlug(slug) {
  try {
    return await api.getBySlug(slug);
  } catch (e) {
    err(`Page not found: ${slug}`, e.status ?? 1);
  }
}

export function requireToken() {
  if (!getToken()) err('Not logged in. Run: vibe-pub login');
}

function parseAccessRole(flags) {
  const role = flags.role;
  if (!role) return undefined;
  if (role !== 'viewer' && role !== 'editor') err('--role must be viewer or editor');
  return role;
}

export function buildShareBody(flags) {
  const email = flags.email;
  const domain = flags.domain;
  if (!email && !domain) err('Provide --email or --domain');
  if (email && domain) err('Provide only one of --email or --domain');
  const body = email ? { email } : { domain };
  const role = parseAccessRole(flags);
  if (role) body.access_role = role;
  return body;
}

function normalizeDomainInput(input) {
  return String(input).replace(/^@+/, '').trim().toLowerCase();
}

export function parseUnshareTarget(flags) {
  const email = flags.email;
  const domain = flags.domain;
  if (!email && !domain) err('Provide --email or --domain');
  if (email && domain) err('Provide only one of --email or --domain');
  return {
    email: email ? String(email).trim().toLowerCase() : undefined,
    domain: domain ? normalizeDomainInput(domain) : undefined,
  };
}

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
