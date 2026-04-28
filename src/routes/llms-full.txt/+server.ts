import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import type { Page } from '$lib/types';

// /llms-full.txt — concatenated raw markdown for all public pages.
// One fetch lets an LLM agent ingest the whole site.
//
// Hard cap of 1000 pages to bound response size on Workers.
export const GET: RequestHandler = async ({ platform, url }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const { results } = await db
    .prepare(
      "SELECT slug, title, view, markdown, updated FROM pages WHERE access = 'public' ORDER BY updated DESC LIMIT 1000"
    )
    .all<Pick<Page, 'slug' | 'title' | 'view' | 'markdown' | 'updated'>>();

  const origin = url.origin;
  const parts: string[] = [];
  parts.push(`# vibe.pub — full content (${results.length} pages)\n`);
  parts.push(`Generated: ${new Date().toISOString()}\n`);

  for (const p of results) {
    const title = p.title?.trim() || p.slug;
    parts.push('\n---\n');
    parts.push(`# ${title}\n`);
    parts.push(`URL: ${origin}/${p.slug}`);
    parts.push(`Source: ${origin}/${p.slug}.md`);
    if (p.view && p.view !== 'doc') parts.push(`View: ${p.view}`);
    parts.push(`Updated: ${p.updated}`);
    parts.push('');
    parts.push(p.markdown ?? '');
  }

  return new Response(parts.join('\n'), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=600',
    },
  });
};
