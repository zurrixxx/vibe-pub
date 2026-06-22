import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createMagicLinkToken } from '$lib/server/auth';
import type { OAuthAuthorizeRequest } from '$lib/server/oauth/authorize';
import {
  OAUTH_PENDING_COOKIE,
  clearOAuthPendingCookie,
  resolveAuthorizeParams,
  scopeList,
  setOAuthPendingCookie,
  validateAuthorizeRequest,
} from '$lib/server/oauth/authorize';
import { hasOAuthGrant, insertAuthorizationCode, upsertOAuthGrant } from '$lib/server/oauth/db';
import { getDb } from '$lib/server/db';
import type { D1Database } from '@cloudflare/workers-types';
import type { Cookies } from '@sveltejs/kit';

async function redirectWithAuthCode(
  params: OAuthAuthorizeRequest,
  userId: string,
  db: D1Database,
  cookies: Cookies
): Promise<never> {
  const code = crypto.randomUUID().replace(/-/g, '');
  await insertAuthorizationCode(db, {
    code,
    client_id: params.client_id,
    redirect_uri: params.redirect_uri,
    user_id: userId,
    scope: params.scope,
    code_challenge: params.code_challenge,
    code_challenge_method: params.code_challenge_method,
  });
  clearOAuthPendingCookie(cookies);
  const redirectTo = new URL(params.redirect_uri);
  redirectTo.searchParams.set('code', code);
  if (params.state) redirectTo.searchParams.set('state', params.state);
  throw redirect(302, redirectTo.toString());
}

export const load: PageServerLoad = async ({ url, locals, cookies, platform }) => {
  if (!platform) throw error(500, 'Platform unavailable');

  const db = getDb(platform);
  const params = resolveAuthorizeParams(url.searchParams, cookies.get(OAUTH_PENDING_COOKIE));
  setOAuthPendingCookie(cookies, params);
  const { clientHost } = await validateAuthorizeRequest(params, db);

  // Claude Code may restart OAuth instead of refreshing; skip consent if already approved.
  if (locals.user && (await hasOAuthGrant(db, locals.user.id, params.client_id))) {
    await redirectWithAuthCode(params, locals.user.id, db, cookies);
  }

  return {
    user: locals.user ? { username: locals.user.username, email: locals.user.email } : null,
    clientHost,
    scope: scopeList(params.scope),
  };
};

export const actions: Actions = {
  authorize: async ({ locals, cookies, platform, url }) => {
    if (!platform) return fail(500, { error: 'Platform unavailable' });
    if (!locals.user) return fail(401, { error: 'Not signed in' });

    const db = getDb(platform);
    const params = resolveAuthorizeParams(url.searchParams, cookies.get(OAUTH_PENDING_COOKIE));
    await validateAuthorizeRequest(params, db);

    await upsertOAuthGrant(db, locals.user.id, params.client_id);
    await redirectWithAuthCode(params, locals.user.id, db, cookies);
  },

  deny: async ({ cookies, platform, url }) => {
    if (!platform) return fail(500, { error: 'Platform unavailable' });

    const db = getDb(platform);
    const params = resolveAuthorizeParams(url.searchParams, cookies.get(OAUTH_PENDING_COOKIE));
    await validateAuthorizeRequest(params, db);
    clearOAuthPendingCookie(cookies);

    const redirectTo = new URL(params.redirect_uri);
    redirectTo.searchParams.set('error', 'access_denied');
    if (params.state) redirectTo.searchParams.set('state', params.state);
    throw redirect(302, redirectTo.toString());
  },

  magicLink: async ({ request, platform }) => {
    if (!platform) return fail(500, { error: 'Platform not available' });

    const data = await request.formData();
    const email = data.get('email')?.toString().trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return fail(400, { error: 'Valid email is required' });
    }

    const token = await createMagicLinkToken(email, platform.env.JWT_SECRET);
    const magicLink = `${platform.env.BASE_URL}/auth/verify?token=${token}`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${platform.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: platform.env.RESEND_FROM,
        to: email,
        subject: 'Your vibe.pub sign-in link',
        html: `<p>Click <a href="${magicLink}">here</a> to sign in and authorize the connector. This link expires in 15 minutes.</p><p>Or copy: ${magicLink}</p>`,
      }),
    });

    if (!res.ok) {
      console.error('Resend error:', await res.text());
      return fail(500, { error: 'Failed to send email. Please try again.' });
    }

    return { sent: true, email };
  },
};
