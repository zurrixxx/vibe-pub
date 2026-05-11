import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCommentsByPage, createComment, getPageById } from '$lib/server/db';
import type { CommentAnchor } from '$lib/templates/types';

function parseAnchor(raw: string | null): CommentAnchor | string | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CommentAnchor;
  } catch {
    // legacy: plain string anchor
    return raw;
  }
}

export const GET: RequestHandler = async ({ params, platform, url }) => {
  if (!platform) throw error(500, 'Platform not available');
  const includeAll =
    url.searchParams.get('all') === '1' ||
    url.searchParams.get('all') === 'true' ||
    url.searchParams.get('include_resolved') === '1' ||
    url.searchParams.get('include_resolved') === 'true';
  const rawComments = await getCommentsByPage(platform.env.DB, params.pageId, {
    unresolvedOnly: !includeAll,
  });
  // Parse anchor JSON for each comment
  const comments = rawComments.map((c) => ({
    ...c,
    anchor: parseAnchor(c.anchor),
  }));
  return json(comments);
};

export const POST: RequestHandler = async ({ params, request, platform, locals }) => {
  if (!platform) throw error(500, 'Platform not available');
  const db = platform.env.DB;

  const page = await getPageById(db, params.pageId);
  if (!page) throw error(404, 'Page not found');

  const body = (await request.json()) as {
    body?: string;
    anchor?: CommentAnchor | string | null;
    anchor_hint?: string;
    display_name?: string;
    agent_published?: boolean;
  };
  if (!body.body?.trim()) throw error(400, 'Comment body is required');

  // anchor may be a CommentAnchor object or legacy string
  const anchor = body.anchor ?? null;
  const anchor_hint: string | undefined = body.anchor_hint;

  const trimmedName = typeof body.display_name === 'string' ? body.display_name.trim() : '';
  const wantsAgentDisplay = (n: string) => {
    const x = n.toLowerCase();
    return x === 'agent' || x === 'vibe agent';
  };
  const isPageOwner = !!(locals.user?.id && page.user_id && locals.user.id === page.user_id);

  let display_name: string;
  if (trimmedName) {
    if (wantsAgentDisplay(trimmedName)) {
      display_name = isPageOwner ? trimmedName : (locals.user?.username ?? 'Anonymous');
    } else {
      display_name = trimmedName;
    }
  } else {
    display_name = locals.user ? locals.user.username : 'Anonymous';
  }

  /** True when JSON sets `agent_published: true` (CLI/MCP, or owner “Suggestion for revise” comment). */
  const agent_published = body.agent_published === true;

  const comment = await createComment(db, {
    page_id: params.pageId,
    user_id: locals.user?.id,
    display_name,
    body: body.body,
    anchor,
    anchor_hint,
    agent_published,
  });

  // Return with parsed anchor
  return json({ ...comment, anchor: parseAnchor(comment.anchor) }, { status: 201 });
};
