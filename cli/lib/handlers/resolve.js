import * as api from '../api.js';
import { out, err } from '../cli-helpers.js';
import { resolveSlug } from './helpers.js';

/** @param {{ slug: string, all?: boolean, ids?: string, format: string }} ctx */
export async function resolveHandler({ slug, all, ids, format }) {
  const page = await resolveSlug(slug);
  const options = {};
  if (all) options.all = true;
  if (ids) options.comment_ids = ids.split(',');

  if (!options.all && !options.comment_ids) {
    err('Provide --all or --ids <id1,id2,...>');
  }

  try {
    const result = await api.resolveComments(page.id, options);
    out(result, format);
  } catch (e) {
    err(e.message, e.status);
  }
}
