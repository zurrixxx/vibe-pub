import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { createMagicLinkToken } from '$lib/server/auth';

export const actions: Actions = {
  default: async ({ request, platform }) => {
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
        subject: 'Your magic link',
        html: `<p>Click <a href="${magicLink}">here</a> to sign in. This link expires in 15 minutes.</p><p>Or copy this URL: ${magicLink}</p>`,
      }),
    });

    if (!res.ok) {
      console.error('Resend error:', await res.text());
      return fail(500, { error: 'Failed to send email. Please try again.' });
    }

    return { sent: true, email };
  },
};
