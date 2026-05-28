import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { deleteGroup, getGroupOwnedByUser, requireUser, updateGroup } from '$lib/server/access';

export const GET: RequestHandler = async ({ params, platform, locals }) => {
  if (!platform) throw error(500, 'No platform');
  const user = requireUser(locals);
  const group = await getGroupOwnedByUser(getDb(platform), params.id, user.id);
  if (!group) throw error(404, 'Group not found');
  return json({ group });
};

export const PUT: RequestHandler = async ({ params, platform, locals, request }) => {
  if (!platform) throw error(500, 'No platform');
  const user = requireUser(locals);
  const body = (await request.json()) as { name?: string; domain_id?: string | null };

  const group = await updateGroup(getDb(platform), params.id, user.id, {
    name: body.name,
    domain_id: body.domain_id,
  });

  return json({ group });
};

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
  if (!platform) throw error(500, 'No platform');
  const user = requireUser(locals);
  await deleteGroup(getDb(platform), params.id, user.id);
  return new Response(null, { status: 204 });
};
