import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
  if (!platform) throw redirect(302, '/auth/login');

  const params = new URLSearchParams({
    client_id: platform.env.GITHUB_CLIENT_ID,
    redirect_uri: `${platform.env.BASE_URL}/auth/github/callback`,
    scope: 'user:email',
  });

  throw redirect(302, `https://github.com/login/oauth/authorize?${params}`);
};
