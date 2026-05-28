import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { addGroupMember, isAccessRole, listGroupMembers, requireUser } from '$lib/server/access';

export const GET: RequestHandler = async ({ params, platform, locals }) => {
  if (!platform) throw error(500, 'No platform');
  const user = requireUser(locals);
  const members = await listGroupMembers(getDb(platform), params.id, user.id);
  return json({ members });
};

export const POST: RequestHandler = async ({ params, platform, locals, request }) => {
  if (!platform) throw error(500, 'No platform');
  const user = requireUser(locals);
  const body = (await request.json()) as { email?: string; access_role?: string };

  if (!body.email?.trim()) throw error(400, 'email is required');

  const member = await addGroupMember(getDb(platform), params.id, user.id, {
    email: body.email,
    access_role: body.access_role && isAccessRole(body.access_role) ? body.access_role : undefined,
  });

  return json({ member }, { status: 201 });
};
