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

export const GET: RequestHandler = async ({ params, platform }) => {
  if (!platform) throw error(500, 'Platform not available');
  const rawComments = await getCommentsByPage(platform.env.DB, params.pageId);
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

  const body = await request.json();
  if (!body.body?.trim()) throw error(400, 'Comment body is required');

  // anchor may be a CommentAnchor object or legacy string
  const anchor = body.anchor ?? null;
  const anchor_hint: string | undefined = body.anchor_hint;

  const comment = await createComment(db, {
    page_id: params.pageId,
    user_id: locals.user?.id,
    display_name: body.display_name || (locals.user ? undefined : 'Anonymous'),
    body: body.body,
    anchor,
    anchor_hint,
  });

  // Return with parsed anchor
  return json({ ...comment, anchor: parseAnchor(comment.anchor) }, { status: 201 });
};
