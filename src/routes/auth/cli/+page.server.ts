import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
  createMagicLinkToken,
  COOKIE_NAME,
  createSessionToken,
  validateCliAuthParams,
  buildCliCallbackUrl,
  buildCliAuthPageUrl,
  setCliAuthCookie,
  CLI_AUTH_COOKIE,
  parseCliAuthCookie,
} from '$lib/server/auth';

export const load: PageServerLoad = async ({ url, locals, cookies, platform }) => {
  if (!platform) throw error(500, 'Platform not available');

  let pending;
  try {
    pending = validateCliAuthParams(url.searchParams.get('state'), url.searchParams.get('port'));
  } catch (e) {
    throw error(400, e instanceof Error ? e.message : 'Invalid CLI auth request');
  }

  setCliAuthCookie(cookies, pending);

  return {
    user: locals.user ? { username: locals.user.username, email: locals.user.email } : null,
  };
};

export const actions: Actions = {
  authorize: async ({ locals, cookies, platform }) => {
    if (!platform) return fail(500, { error: 'Platform not available' });
    if (!locals.user) return fail(401, { error: 'Not signed in' });

    const pending = parseCliAuthCookie(cookies.get(CLI_AUTH_COOKIE));
    if (!pending) {
      return fail(400, { error: 'CLI sign-in session expired. Run vibe-pub login again.' });
    }

    const sessionToken =
      cookies.get(COOKIE_NAME) ??
      (await createSessionToken(locals.user.id, platform.env.JWT_SECRET));

    cookies.delete(CLI_AUTH_COOKIE, { path: '/' });
    throw redirect(302, buildCliCallbackUrl(pending, sessionToken));
  },

  signOut: async ({ cookies }) => {
    const pending = parseCliAuthCookie(cookies.get(CLI_AUTH_COOKIE));
    if (!pending) {
      return fail(400, { error: 'CLI sign-in session expired. Run vibe-pub login again.' });
    }

    cookies.delete(COOKIE_NAME, { path: '/' });
    throw redirect(302, buildCliAuthPageUrl(pending));
  },

  magicLink: async ({ request, platform, cookies }) => {
    if (!platform) return fail(500, { error: 'Platform not available' });

    const pendingRaw = cookies.get(CLI_AUTH_COOKIE);
    if (!pendingRaw) {
      return fail(400, { error: 'CLI sign-in session expired. Run vibe-pub login again.' });
    }

    const data = await request.formData();
    const email = data.get('email')?.toString().trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return fail(400, { error: 'Valid email is required' });
    }

    const token = await createMagicLinkToken(email, platform.env.JWT_SECRET);
    const pending = parseCliAuthCookie(pendingRaw);
    const verifyParams = new URLSearchParams({ token });
    if (pending) {
      verifyParams.set('state', pending.state);
      verifyParams.set('port', String(pending.port));
    }
    const magicLink = `${platform.env.BASE_URL}/auth/verify?${verifyParams}`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${platform.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: platform.env.RESEND_FROM,
        to: email,
        subject: 'Your magic link',
        html: `<p>Click <a href="${magicLink}">here</a> to sign in to vibe-pub CLI. This link expires in 15 minutes.</p><p>Or copy this URL: ${magicLink}</p>`,
      }),
    });

    if (!res.ok) {
      console.error('Resend error:', await res.text());
      return fail(500, { error: 'Failed to send email. Please try again.' });
    }

    return { sent: true, email };
  },
};
