import * as api from '../api.js';
import { out, err } from '../cli-helpers.js';
import {
  requireToken,
  resolveSlug,
  buildShareBody,
  parseUnshareTarget,
  revokeResourceShare,
  formatAccessStatus,
} from './helpers.js';

/** @param {{ slug: string, format: string }} ctx */
export async function accessPageStatusHandler({ slug, format }) {
  requireToken();
  const page = await resolveSlug(slug);
  try {
    const payload = await api.listPageShares(page.id);
    out(formatAccessStatus(page.access, payload), format);
  } catch (e) {
    err(e.message, e.status);
  }
}

/** @param {{ slug: string, email?: string, domain?: string, role?: string, format: string }} ctx */
export async function accessPageShareHandler(ctx) {
  requireToken();
  const body = buildShareBody(ctx);
  const page = await resolveSlug(ctx.slug);
  try {
    const payload = await api.addPageShare(page.id, body);
    out(formatAccessStatus(page.access, payload), ctx.format);
  } catch (e) {
    err(e.message, e.status);
  }
}

/** @param {{ slug: string, email?: string, domain?: string, format: string }} ctx */
export async function accessPageUnshareHandler(ctx) {
  requireToken();
  const target = parseUnshareTarget(ctx);
  const page = await resolveSlug(ctx.slug);
  try {
    const payload = await api.listPageShares(page.id);
    await revokeResourceShare(
      payload,
      target,
      (granteeId) =>
        api.removePageShare(page.id, { grantee_type: 'domain', grantee_id: granteeId }),
      (groupId, userId) => api.removeAccessGroupMember(groupId, userId)
    );
    const updated = await api.listPageShares(page.id);
    out(formatAccessStatus(page.access, updated), ctx.format);
  } catch (e) {
    err(e.message, e.status);
  }
}

/** @param {{ slug: string, format: string }} ctx */
export async function accessCollectionStatusHandler({ slug, format }) {
  requireToken();
  try {
    const collection = await api.getCollection(slug);
    const payload = await api.listCollectionShares(slug);
    out(formatAccessStatus(collection.access, payload), format);
  } catch (e) {
    err(e.message, e.status);
  }
}

/** @param {{ slug: string, email?: string, domain?: string, role?: string, format: string }} ctx */
export async function accessCollectionShareHandler(ctx) {
  requireToken();
  const body = buildShareBody(ctx);
  try {
    const collection = await api.getCollection(ctx.slug);
    const payload = await api.addCollectionShare(ctx.slug, body);
    out(formatAccessStatus(collection.access, payload), ctx.format);
  } catch (e) {
    err(e.message, e.status);
  }
}

/** @param {{ slug: string, email?: string, domain?: string, format: string }} ctx */
export async function accessCollectionUnshareHandler(ctx) {
  requireToken();
  const target = parseUnshareTarget(ctx);
  try {
    const collection = await api.getCollection(ctx.slug);
    const payload = await api.listCollectionShares(ctx.slug);
    await revokeResourceShare(
      payload,
      target,
      (granteeId) =>
        api.removeCollectionShare(ctx.slug, { grantee_type: 'domain', grantee_id: granteeId }),
      (groupId, userId) => api.removeAccessGroupMember(groupId, userId)
    );
    const updated = await api.listCollectionShares(ctx.slug);
    out(formatAccessStatus(collection.access, updated), ctx.format);
  } catch (e) {
    err(e.message, e.status);
  }
}
