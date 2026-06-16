import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createMagicLinkToken } from '$lib/server/auth';
import {
  clearOAuthPendingCookie,
  parseAuthorizeParams,
  scopeList,
  setOAuthPendingCookie,
  validateAuthorizeRequest,
} from '$lib/server/oauth/authorize';
import { insertAuthorizationCode } from '$lib/server/oauth/db';
import { getDb } from '$lib/server/db';

export const load: PageServerLoad = async ({ url, locals, cookies, platform }) => {
  if (!platform) throw error(500, 'Platform unavailable');

  const params = parseAuthorizeParams(url.searchParams);
  const { clientHost } = await validateAuthorizeRequest(params);

  if (!locals.user) {
    setOAuthPendingCookie(cookies, params);
    return {
      user: null,
      clientHost,
      scope: scopeList(params.scope),
    };
  }

  clearOAuthPendingCookie(cookies);

  return {
    user: { username: locals.user.username, email: locals.user.email },
    clientHost,
    scope: scopeList(params.scope),
    params,
  };
};

export const actions: Actions = {
  authorize: async ({ locals, cookies, platform, url }) => {
    if (!platform) return fail(500, { error: 'Platform unavailable' });
    if (!locals.user) return fail(401, { error: 'Not signed in' });

    const params = parseAuthorizeParams(url.searchParams);
    await validateAuthorizeRequest(params);

    const code = crypto.randomUUID().replace(/-/g, '');
    const db = getDb(platform);
    await insertAuthorizationCode(db, {
      code,
      client_id: params.client_id,
      redirect_uri: params.redirect_uri,
      user_id: locals.user.id,
      scope: params.scope,
      code_challenge: params.code_challenge,
      code_challenge_method: params.code_challenge_method,
    });

    clearOAuthPendingCookie(cookies);

    const redirectTo = new URL(params.redirect_uri);
    redirectTo.searchParams.set('code', code);
    if (params.state) redirectTo.searchParams.set('state', params.state);
    throw redirect(302, redirectTo.toString());
  },

  deny: async ({ url }) => {
    const params = parseAuthorizeParams(url.searchParams);
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
