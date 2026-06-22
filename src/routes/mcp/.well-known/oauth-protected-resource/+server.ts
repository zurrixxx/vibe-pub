import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { protectedResourceMetadata } from '$lib/server/oauth/metadata';

/** Claude Code may probe OAuth metadata under the MCP resource path. */
export const GET: RequestHandler = async ({ platform, url }) => {
  const baseUrl = platform?.env.BASE_URL ?? url.origin;
  return json(protectedResourceMetadata(baseUrl), {
    headers: { 'Cache-Control': 'public, max-age=300' },
  });
};
