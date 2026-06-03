import * as api from '../api.js';
import { out, err } from '../cli-helpers.js';
import { resolveSlug } from './helpers.js';

/** @param {{ slug: string, all?: boolean, format: string }} ctx */
export async function commentsHandler({ slug, all, format }) {
  const page = await resolveSlug(slug);
  try {
    const comments = await api.getComments(page.id, { all: !!all });
    out(comments, format);
  } catch (e) {
    err(e.message, e.status);
  }
}
