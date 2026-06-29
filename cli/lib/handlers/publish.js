import * as api from '../api.js';
import { out, err } from '../cli-helpers.js';
import { accessFromOption, readStdin, readMarkdown } from './helpers.js';
import { prepareMarkdownWithAssets } from '../images.js';

/** @param {{ file?: string, slug?: string, view?: string, access?: string, theme?: string, noAgentPublished?: boolean, format: string }} ctx */
export async function publishHandler({
  file,
  slug,
  view,
  access,
  theme,
  noAgentPublished,
  format,
}) {
  const markdown = readMarkdown(file) ?? (await readStdin());
  if (!markdown || !markdown.trim()) err('No markdown content');

  const payload = prepareMarkdownWithAssets(markdown);

  try {
    const result = await api.publish(payload.markdown, {
      slug,
      view,
      access: accessFromOption(access),
      theme,
      agentPublished: noAgentPublished ? false : true,
      assets: payload.assets,
    });
    out(result, format);
  } catch (e) {
    err(e.message, e.status);
  }
}
