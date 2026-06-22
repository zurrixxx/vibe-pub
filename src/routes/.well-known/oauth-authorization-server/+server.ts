import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { authorizationServerMetadata } from '../../../lib/server/oauth/metadata';

export const GET: RequestHandler = async ({ platform, url }) => {
  const baseUrl = (platform as { env?: { BASE_URL?: string } })?.env?.BASE_URL ?? url.origin;
  return json(authorizationServerMetadata(baseUrl), {
    headers: { 'Cache-Control': 'public, max-age=300' },
  });
};
