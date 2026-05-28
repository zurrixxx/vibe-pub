import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import {
  createDomain,
  deleteDomain,
  listDomainsForOwner,
  requireUser,
  updateDomain,
} from '$lib/server/access';

export const GET: RequestHandler = async ({ platform, locals }) => {
  if (!platform) throw error(500, 'No platform');
  const user = requireUser(locals);
  const domains = await listDomainsForOwner(getDb(platform), user.id);
  return json({ domains });
};

export const POST: RequestHandler = async ({ platform, locals, request }) => {
  if (!platform) throw error(500, 'No platform');
  const user = requireUser(locals);
  const body = (await request.json()) as {
    domain?: string;
    display_name?: string | null;
  };

  if (!body.domain?.trim()) throw error(400, 'domain is required');

  const domain = await createDomain(getDb(platform), user.id, {
    domain: body.domain,
    display_name: body.display_name,
  });

  return json({ domain }, { status: 201 });
};
