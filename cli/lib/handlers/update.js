import * as api from '../api.js';
import { out, err } from '../cli-helpers.js';
import { accessFromOption, readStdin, readMarkdown, resolveSlug } from './helpers.js';
import { prepareMarkdownWithAssets } from '../images.js';

/** @param {{ slug: string, file?: string, access?: string, format: string }} ctx */
export async function updateHandler({ slug, file, access, format }) {
  const page = await resolveSlug(slug);

  if (access) {
    try {
      const result = await api.updatePage(page.id, { access: accessFromOption(access) });
      out(result, format);
    } catch (e) {
      err(e.message, e.status);
    }
    return;
  }

  const markdown = readMarkdown(file) ?? (await readStdin());
  if (!markdown || !markdown.trim()) err('No markdown content');

  const payload = prepareMarkdownWithAssets(markdown);

  try {
    const result = await api.update(page.id, payload.markdown, { assets: payload.assets });
    out(result, format);
  } catch (e) {
    err(e.message, e.status);
  }
}
