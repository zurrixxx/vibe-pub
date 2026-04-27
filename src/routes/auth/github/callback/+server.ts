import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSessionToken, getSessionCookie } from '$lib/server/auth';
import { getUserByEmail, createUser, getDb } from '$lib/server/db';

export const GET: RequestHandler = async ({ url, platform }) => {
  if (!platform) throw error(500, 'Platform not available');

  const code = url.searchParams.get('code');
  if (!code) throw error(400, 'Missing code');

  // Exchange code for access token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: platform.env.GITHUB_CLIENT_ID,
      client_secret: platform.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
  };
  if (!tokenData.access_token) {
    throw error(400, `GitHub auth failed: ${tokenData.error ?? 'unknown error'}`);
  }

  // Get user email from GitHub
  const userRes = await fetch('https://api.github.com/user/emails', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'User-Agent': 'vibe-pub',
    },
  });

  const emails = (await userRes.json()) as {
    email: string;
    primary: boolean;
    verified: boolean;
  }[];
  const primaryEmail = emails.find((e) => e.primary && e.verified)?.email;
  if (!primaryEmail) throw error(400, 'No verified email found on GitHub account');

  // Get GitHub username for display
  const profileRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'User-Agent': 'vibe-pub',
    },
  });
  const profile = (await profileRes.json()) as { login: string };

  const db = getDb(platform);

  let user = await getUserByEmail(db, primaryEmail);
  if (!user) {
    // Use GitHub username, ensure uniqueness
    const rawUsername = profile.login.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
    const existing = await db
      .prepare('SELECT id FROM users WHERE username = ?')
      .bind(rawUsername)
      .first<{ id: string }>();
    const username = existing
      ? `${rawUsername}_${Math.random().toString(36).slice(2, 7)}`
      : rawUsername;
    user = await createUser(db, primaryEmail, username);
  }

  const sessionToken = await createSessionToken(user.id, platform.env.JWT_SECRET);

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/',
      'Set-Cookie': getSessionCookie(sessionToken),
    },
  });
};
