import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '\u2026';
}

function stripMarkdown(md: string): string {
  return md
    .replace(/^---\n[\s\S]*?\n---\n?/, '') // frontmatter
    .replace(/^#{1,6}\s+/gm, '') // headings
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1') // italic
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/```[\s\S]*?```/g, '') // code blocks
    .replace(/^\s*[-*+]\s+/gm, '') // list items
    .replace(/^\s*\d+\.\s+/gm, '') // ordered items
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // images
    .replace(/^>\s+/gm, '') // blockquotes
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .trim();
}

export const GET: RequestHandler = async ({ params, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const page = await db
    .prepare('SELECT title, markdown, view FROM pages WHERE slug = ?')
    .bind(params.slug)
    .first<{ title: string | null; markdown: string; view: string }>();

  if (!page) throw error(404, 'Page not found');

  const title = escapeXml(truncate(page.title ?? params.slug, 60));
  const plain = stripMarkdown(page.markdown);
  const desc = escapeXml(truncate(plain, 120));
  const viewLabel = page.view === 'kanban' ? 'kanban' : 'doc';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#edeae5"/>
  <rect x="60" y="60" width="1080" height="510" rx="16" fill="#ffffff"/>

  <!-- Title -->
  <text x="120" y="200" font-family="Georgia, serif" font-size="48" font-weight="700" fill="#1a1917" letter-spacing="-0.02em">
    ${title}
  </text>

  <!-- Description -->
  <text x="120" y="270" font-family="system-ui, sans-serif" font-size="24" fill="#6b6963" letter-spacing="0">
    ${desc}
  </text>

  <!-- View badge -->
  <rect x="120" y="430" width="${viewLabel.length * 14 + 24}" height="32" rx="16" fill="${page.view === 'kanban' ? 'rgba(139,92,246,0.12)' : 'rgba(59,130,246,0.12)'}"/>
  <text x="${120 + 12}" y="452" font-family="monospace" font-size="14" font-weight="500" fill="${page.view === 'kanban' ? '#a78bfa' : '#60a5fa'}">
    ${viewLabel}
  </text>

  <!-- Brand -->
  <text x="1060" y="520" font-family="Georgia, serif" font-size="22" fill="#9e9b95" text-anchor="end">
    vibe.pub
  </text>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
};
