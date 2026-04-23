import { redirect, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  verifyMagicLinkToken,
  createSessionToken,
  getSessionCookie,
} from "$lib/server/auth";
import { getUserByEmail, createUser } from "$lib/server/db";

export const GET: RequestHandler = async ({ url, platform }) => {
  if (!platform) throw error(500, "Platform not available");

  const token = url.searchParams.get("token");
  if (!token) throw error(400, "Missing token");

  const email = await verifyMagicLinkToken(token, platform.env.JWT_SECRET);
  if (!email) throw error(400, "Invalid or expired token");

  const db = platform.env.DB;

  let user = await getUserByEmail(db, email);
  if (!user) {
    // Derive username from email prefix, sanitize to alphanumeric + underscore
    const rawUsername = email
      .split("@")[0]
      .replace(/[^a-z0-9_]/gi, "_")
      .toLowerCase();
    // Ensure uniqueness by appending random suffix if needed
    const existing = await db
      .prepare("SELECT id FROM users WHERE username = ?")
      .bind(rawUsername)
      .first<{ id: string }>();
    const username = existing
      ? `${rawUsername}_${Math.random().toString(36).slice(2, 7)}`
      : rawUsername;
    user = await createUser(db, email, username);
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
