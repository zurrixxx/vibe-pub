import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { purgeExpiredOAuthRows } from '$lib/server/oauth/db';
import { getDb } from '$lib/server/db';

function authorizeCron(request: Request, secret: string | undefined): void {
  if (!secret) throw error(503, 'CRON_SECRET is not configured');
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) throw error(401, 'Unauthorized');
}

export const POST: RequestHandler = async ({ request, platform }) => {
  if (!platform) throw error(500, 'Platform unavailable');
  authorizeCron(request, platform.env.CRON_SECRET);

  const result = await purgeExpiredOAuthRows(getDb(platform));
  return json({ ok: true, deleted: result });
};
