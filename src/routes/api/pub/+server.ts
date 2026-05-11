import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, createPage, getPagesByUser, appendPageVersionSnapshot } from '$lib/server/db';
import { isValidSlug, buildCanonicalPath } from '$lib/server/slug';
import { parseFrontmatter } from '$lib/server/markdown';
import { detectView } from '$lib/templates/detect';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const contentType = request.headers.get('content-type') ?? '';
  let markdown: string;
  let slugOverride: string | undefined;
  let viewOverride:
    | 'doc'
    | 'kanban'
    | 'changelog'
    | 'timeline'
    | 'slides'
    | 'dashboard'
    | undefined;
  let themeOverride: string | undefined;
  let accessOverride: 'public' | 'unlisted' | 'private' | undefined;
  /** Only `true` when JSON body explicitly sets `agent_published: true` (CLI/MCP). */
  let agentPublished = false;

  if (contentType.includes('application/json')) {
    const body = (await request.json()) as {
      markdown?: string;
      slug?: string;
      view?: typeof viewOverride;
      theme?: string;
      access?: typeof accessOverride;
      /** When true, page counts as "agent-published" on /@user profile filter */
      agent_published?: boolean;
    };
    markdown = body.markdown ?? '';
    slugOverride = body.slug;
    viewOverride = body.view;
    themeOverride = body.theme;
    accessOverride = body.access;
    agentPublished = body.agent_published === true;
  } else {
    // Plain text body treated as raw markdown
    markdown = await request.text();
  }

  if (!markdown || !markdown.trim()) {
    throw error(400, 'Markdown content is required');
  }

  const { data: fm, content } = parseFrontmatter(markdown);

  // Custom slug is now optional/cosmetic; empty when not provided.
  let slug = '';
  if (slugOverride) {
    if (!isValidSlug(slugOverride)) throw error(400, 'Invalid slug format');
    slug = slugOverride;
  }

  const view = viewOverride ?? fm.view ?? detectView(markdown);
  const theme = themeOverride ?? fm.theme ?? 'default';
  const access = accessOverride ?? fm.access ?? 'unlisted';

  // Extract title: frontmatter > first # heading > null
  let title: string | null = (fm.title as string) ?? null;
  if (!title) {
    const h1Match = content.match(/^#\s+(.+)/m);
    if (h1Match) title = h1Match[1].trim();
  }

  const userId = locals.user?.id;

  const page = await createPage(db, {
    slug,
    user_id: userId,
    title: title ?? undefined,
    markdown,
    view,
    theme,
    access,
    expires_at: fm.expires ?? undefined,
    agent_published: agentPublished,
  });

  // Initial snapshot at publish time
  try {
    await appendPageVersionSnapshot(db, page.id, {
      markdown: page.markdown,
      title: page.title ?? null,
    });
  } catch (e) {
    console.error('Initial version snapshot failed:', e);
  }

  const baseUrl = platform.env.BASE_URL ?? 'https://vibe.pub';
  const url = `${baseUrl}${buildCanonicalPath(page)}`;

  return json({ id: page.id, slug: page.slug, url }, { status: 201 });
};

export const GET: RequestHandler = async ({ locals, platform }) => {
  if (!locals.user) throw error(401, 'Authentication required');
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const pages = await getPagesByUser(db, locals.user.id);
  const baseUrl = platform.env.BASE_URL ?? 'https://vibe.pub';

  return json(
    pages.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      view: p.view,
      access: p.access,
      agent_published: p.agent_published === 1,
      created: p.created,
      updated: p.updated,
      url: `${baseUrl}${buildCanonicalPath(p)}`,
    }))
  );
};
