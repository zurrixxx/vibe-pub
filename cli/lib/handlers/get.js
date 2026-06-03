import * as api from '../api.js';
import { out, err } from '../cli-helpers.js';

/** @param {{ slug: string, format: string }} ctx */
export async function getHandler({ slug, format }) {
  try {
    const page = await api.getBySlug(slug);
    out(page, format);
  } catch (e) {
    err(e.message, e.status);
  }
}
