import { redirect, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createSessionToken, getSessionCookie } from "$lib/server/auth";
import { getUserByEmail, createUser, getDb } from "$lib/server/db";

export const GET: RequestHandler = async ({ url, platform }) => {
  if (!platform) throw error(500, "Platform not available");

  const code = url.searchParams.get("code");
  if (!code) throw error(400, "Missing code");

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: platform.env.GOOGLE_CLIENT_ID,
      client_secret: platform.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${platform.env.BASE_URL}/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    id_token?: string;
    error?: string;
  };
  if (!tokenData.access_token) {
    throw error(
      400,
      `Google auth failed: ${tokenData.error ?? "unknown error"}`,
    );
  }

  // Get user info
  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  const profile = (await userRes.json()) as {
    email: string;
    verified_email: boolean;
    name?: string;
  };
  if (!profile.email || !profile.verified_email) {
    throw error(400, "No verified email found on Google account");
  }

  const db = getDb(platform);

  let user = await getUserByEmail(db, profile.email);
  if (!user) {
    // Derive username from email prefix
    const rawUsername = profile.email
      .split("@")[0]
      .replace(/[^a-z0-9_]/gi, "_")
      .toLowerCase();
    const existing = await db
      .prepare("SELECT id FROM users WHERE username = ?")
      .bind(rawUsername)
      .first<{ id: string }>();
    const username = existing
      ? `${rawUsername}_${Math.random().toString(36).slice(2, 7)}`
      : rawUsername;
    user = await createUser(db, profile.email, username);
  }

  const sessionToken = await createSessionToken(
    user.id,
    platform.env.JWT_SECRET,
  );

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": getSessionCookie(sessionToken),
    },
  });
};
