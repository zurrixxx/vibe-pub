import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authorizationServerMetadata } from '$lib/server/oauth/metadata';

/** Claude Code discovers OAuth metadata relative to the MCP URL path. */
export const GET: RequestHandler = async ({ platform, url }) => {
  const baseUrl = platform?.env.BASE_URL ?? url.origin;
  return json(authorizationServerMetadata(baseUrl), {
    headers: { 'Cache-Control': 'public, max-age=300' },
  });
};
