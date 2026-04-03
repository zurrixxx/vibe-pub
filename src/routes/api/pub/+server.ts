import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, createPage, getPagesByUser } from '$lib/server/db';
import { generateSlug, isValidSlug } from '$lib/server/slug';
import { parseFrontmatter } from '$lib/server/markdown';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const contentType = request.headers.get('content-type') ?? '';
  let markdown: string;
  let slugOverride: string | undefined;
  let viewOverride: 'doc' | 'kanban' | undefined;
  let accessOverride: 'public' | 'unlisted' | 'private' | undefined;

  if (contentType.includes('application/json')) {
    const body = await request.json();
    markdown = body.markdown ?? '';
    slugOverride = body.slug;
    viewOverride = body.view;
    accessOverride = body.access;
  } else {
    // Plain text body treated as raw markdown
    markdown = await request.text();
  }

  if (!markdown || !markdown.trim()) {
    throw error(400, 'Markdown content is required');
  }

  const { data: fm } = parseFrontmatter(markdown);

  // Determine slug
  let slug: string;
  if (slugOverride) {
    if (!isValidSlug(slugOverride)) throw error(400, 'Invalid slug format');
    slug = slugOverride;
  } else {
    slug = generateSlug();
  }

  const view = viewOverride ?? fm.view ?? 'doc';
  const access = accessOverride ?? fm.access ?? 'unlisted';
  const title = fm.title ?? null;
  const userId = locals.user?.id;

  const page = await createPage(db, {
    slug,
    user_id: userId,
    title: title ?? undefined,
    markdown,
    view,
    access,
    expires_at: fm.expires ?? undefined
  });

  const baseUrl = platform.env.BASE_URL ?? 'https://vibe.pub';
  const url = `${baseUrl}/${page.slug}`;

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
      created: p.created,
      updated: p.updated,
      url: `${baseUrl}/${p.slug}`
    }))
  );
};
