import * as api from '../api.js';
import { out, err } from '../cli-helpers.js';
import { resolveSlug } from './helpers.js';

/** @param {{ slug: string, num: string, format: string }} ctx */
export async function versionHandler({ slug, num, format }) {
  const page = await resolveSlug(slug);
  try {
    const version = await api.getVersion(page.id, num);
    out(version, format);
  } catch (e) {
    err(e.message, e.status);
  }
}
