import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { createGroup, listGroupsForOwner, requireUser } from '$lib/server/access';

export const GET: RequestHandler = async ({ platform, locals }) => {
  if (!platform) throw error(500, 'No platform');
  const user = requireUser(locals);
  const groups = await listGroupsForOwner(getDb(platform), user.id);
  return json({ groups });
};

export const POST: RequestHandler = async ({ platform, locals, request }) => {
  if (!platform) throw error(500, 'No platform');
  const user = requireUser(locals);
  const body = (await request.json()) as { name?: string; domain_id?: string | null };

  if (!body.name?.trim()) throw error(400, 'name is required');

  const group = await createGroup(getDb(platform), user.id, {
    name: body.name,
    domain_id: body.domain_id ?? null,
  });

  return json({ group }, { status: 201 });
};
