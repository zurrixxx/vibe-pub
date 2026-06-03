import * as api from '../api.js';
import { out, err } from '../cli-helpers.js';
import { resolveSlug } from './helpers.js';

/** @param {{ slug: string, format: string }} ctx */
export async function deleteHandler({ slug, format }) {
  const page = await resolveSlug(slug);
  try {
    await api.remove(page.id);
    out({ deleted: true, id: page.id, slug: page.slug }, format);
  } catch (e) {
    err(e.message, e.status);
  }
}
