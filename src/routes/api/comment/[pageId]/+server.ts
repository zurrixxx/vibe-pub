import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCommentsByPage, createComment, getPageById } from '$lib/server/db';

export const GET: RequestHandler = async ({ params, platform }) => {
  if (!platform) throw error(500, 'Platform not available');
  const comments = await getCommentsByPage(platform.env.DB, params.pageId);
  return json(comments);
};

export const POST: RequestHandler = async ({ params, request, platform, locals }) => {
  if (!platform) throw error(500, 'Platform not available');
  const db = platform.env.DB;

  const page = await getPageById(db, params.pageId);
  if (!page) throw error(404, 'Page not found');

  const body = await request.json();
  if (!body.body?.trim()) throw error(400, 'Comment body is required');

  const comment = await createComment(db, {
    page_id: params.pageId,
    user_id: locals.user?.id,
    display_name: body.display_name || (locals.user ? undefined : 'Anonymous'),
    body: body.body,
    anchor: body.anchor
  });

  return json(comment, { status: 201 });
};
