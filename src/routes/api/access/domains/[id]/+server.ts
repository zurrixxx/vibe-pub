import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { deleteDomain, getDomainOwnedByUser, requireUser, updateDomain } from '$lib/server/access';

export const GET: RequestHandler = async ({ params, platform, locals }) => {
  if (!platform) throw error(500, 'No platform');
  const user = requireUser(locals);
  const domain = await getDomainOwnedByUser(getDb(platform), params.id, user.id);
  if (!domain) throw error(404, 'Domain not found');
  return json({ domain });
};

export const PUT: RequestHandler = async ({ params, platform, locals, request }) => {
  if (!platform) throw error(500, 'No platform');
  const user = requireUser(locals);
  const body = (await request.json()) as {
    display_name?: string | null;
  };

  const domain = await updateDomain(getDb(platform), params.id, user.id, {
    display_name: body.display_name,
  });

  return json({ domain });
};

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
  if (!platform) throw error(500, 'No platform');
  const user = requireUser(locals);
  await deleteDomain(getDb(platform), params.id, user.id);
  return new Response(null, { status: 204 });
};
