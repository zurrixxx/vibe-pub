import * as api from '../api.js';
import { out, err } from '../cli-helpers.js';
import { resolveSlug } from './helpers.js';

/** @param {{ slug: string, format: string }} ctx */
export async function versionsHandler({ slug, format }) {
  const page = await resolveSlug(slug);
  try {
    const versions = await api.getVersions(page.id);
    out(versions, format);
  } catch (e) {
    err(e.message, e.status);
  }
}
