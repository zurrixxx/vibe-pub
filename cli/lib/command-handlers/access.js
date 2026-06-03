import * as api from '../api.js';
import { out, err } from '../output.js';
import {
  requireToken,
  parseFlags,
  resolveSlug,
  buildShareBody,
  parseUnshareTarget,
  revokeResourceShare,
  formatAccessStatus,
} from './helpers.js';

/** @typedef {import('./helpers.js').CliContext} CliContext */

/** @param {CliContext} ctx */
export async function accessHandler({ cleanArgs, format }) {
  requireToken();
  const resource = cleanArgs[1];
  const sub = cleanArgs[2];

  if (resource === 'page') {
    if (sub === 'share') {
      const slug = cleanArgs[3];
      if (!slug)
        err(
          'Usage: vibe-pub access page share <slug-id> (--email e | --domain d) [--role viewer|editor]'
        );
      const body = buildShareBody(parseFlags(cleanArgs.slice(4)));
      const page = await resolveSlug(slug);
      try {
        const payload = await api.addPageShare(page.id, body);
        out(formatAccessStatus(page.access, payload), format);
      } catch (e) {
        err(e.message, e.status);
      }
      return;
    }

    if (sub === 'unshare') {
      const slug = cleanArgs[3];
      if (!slug) err('Usage: vibe-pub access page unshare <slug-id> (--email e | --domain d)');
      const target = parseUnshareTarget(parseFlags(cleanArgs.slice(4)));
      const page = await resolveSlug(slug);
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
        out(formatAccessStatus(page.access, updated), format);
      } catch (e) {
        err(e.message, e.status);
      }
      return;
    }

    const slug = sub;
    if (!slug)
      err('Usage: vibe-pub access page <slug-id> | access page share|unshare <slug-id> ...');
    const page = await resolveSlug(slug);
    try {
      const payload = await api.listPageShares(page.id);
      out(formatAccessStatus(page.access, payload), format);
    } catch (e) {
      err(e.message, e.status);
    }
    return;
  }

  if (resource === 'collection' || resource === 'coll') {
    if (sub === 'share') {
      const slug = cleanArgs[3];
      if (!slug)
        err(
          'Usage: vibe-pub access collection share <slug> (--email e | --domain d) [--role viewer|editor]'
        );
      const body = buildShareBody(parseFlags(cleanArgs.slice(4)));
      try {
        const collection = await api.getCollection(slug);
        const payload = await api.addCollectionShare(slug, body);
        out(formatAccessStatus(collection.access, payload), format);
      } catch (e) {
        err(e.message, e.status);
      }
      return;
    }

    if (sub === 'unshare') {
      const slug = cleanArgs[3];
      if (!slug) err('Usage: vibe-pub access collection unshare <slug> (--email e | --domain d)');
      const target = parseUnshareTarget(parseFlags(cleanArgs.slice(4)));
      try {
        const collection = await api.getCollection(slug);
        const payload = await api.listCollectionShares(slug);
        await revokeResourceShare(
          payload,
          target,
          (granteeId) =>
            api.removeCollectionShare(slug, { grantee_type: 'domain', grantee_id: granteeId }),
          (groupId, userId) => api.removeAccessGroupMember(groupId, userId)
        );
        const updated = await api.listCollectionShares(slug);
        out(formatAccessStatus(collection.access, updated), format);
      } catch (e) {
        err(e.message, e.status);
      }
      return;
    }

    const slug = sub;
    if (!slug)
      err('Usage: vibe-pub access collection <slug> | access collection share|unshare <slug> ...');
    try {
      const collection = await api.getCollection(slug);
      const payload = await api.listCollectionShares(slug);
      out(formatAccessStatus(collection.access, payload), format);
    } catch (e) {
      err(e.message, e.status);
    }
    return;
  }

  err(
    'Usage: vibe-pub access page <slug-id> | access page share|unshare <slug-id> ... | access collection <slug> | access collection share|unshare <slug> ...'
  );
}
