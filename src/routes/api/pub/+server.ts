import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, createPage, getPagesByUser, appendPageVersionSnapshot } from '$lib/server/db';
import { getPagesSharedWithUser, isSharedWithMeQuery, toAccessViewer } from '$lib/server/access';
import { isValidSlug, buildCanonicalPath } from '$lib/server/slug';
import { parseFrontmatter } from '$lib/server/markdown';
import { detectView } from '$lib/templates/detect';
import { resolveAssignableAccess, type PageView, type ResourceAccess } from '$lib/constants/page';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const contentType = request.headers.get('content-type') ?? '';
  let markdown: string;
  let slugOverride: string | undefined;
  let viewOverride: PageView | undefined;
  let themeOverride: string | undefined;
  let accessOverride: ResourceAccess | undefined;
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

  // PageView: explicit override → frontmatter → heuristic (never yields slides/dashboard)
  const view = viewOverride ?? fm.view ?? detectView(markdown);
  const theme = themeOverride ?? fm.theme ?? 'default';
  const access = resolveAssignableAccess(accessOverride ?? (fm.access as string | undefined));

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

export const GET: RequestHandler = async ({ locals, platform, url }) => {
  if (!locals.user) throw error(401, 'Authentication required');
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);
  const baseUrl = platform.env.BASE_URL ?? 'https://vibe.pub';

  if (isSharedWithMeQuery(url)) {
    const viewer = toAccessViewer(locals.user);
    if (!viewer) throw error(401, 'Authentication required');

    const shared = await getPagesSharedWithUser(db, viewer);
    return json(
      shared.map(({ page, shared_role, owner_username }) => ({
        id: page.id,
        slug: page.slug,
        title: page.title,
        view: page.view,
        access: page.access,
        agent_published: page.agent_published === 1,
        created: page.created,
        updated: page.updated,
        url: `${baseUrl}${buildCanonicalPath(page)}`,
        shared: true,
        shared_role,
        owner: owner_username ? `@${owner_username}` : null,
      }))
    );
  }

  const pages = await getPagesByUser(db, locals.user.id);

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
