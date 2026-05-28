import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import {
  isAccessRole,
  removeGroupMember,
  requireUser,
  updateGroupMember,
} from '$lib/server/access';

export const PUT: RequestHandler = async ({ params, platform, locals, request }) => {
  if (!platform) throw error(500, 'No platform');
  const user = requireUser(locals);
  const body = (await request.json()) as { access_role?: string };

  if (!body.access_role || !isAccessRole(body.access_role)) {
    throw error(400, 'access_role must be viewer or editor');
  }

  await updateGroupMember(getDb(platform), params.id, params.userId, user.id, body.access_role);
  return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
  if (!platform) throw error(500, 'No platform');
  const user = requireUser(locals);
  await removeGroupMember(getDb(platform), params.id, params.userId, user.id);
  return new Response(null, { status: 204 });
};
