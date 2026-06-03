import * as api from '../api.js';
import { out, err } from '../cli-helpers.js';
import { resolveSlug } from './helpers.js';

/** @param {{ slug: string, body: string, anchor?: string, format: string }} ctx */
export async function commentHandler({ slug, body, anchor, format }) {
  const page = await resolveSlug(slug);
  try {
    const comment = await api.addComment(page.id, body, { anchor });
    out(comment, format);
  } catch (e) {
    err(e.message, e.status);
  }
}
