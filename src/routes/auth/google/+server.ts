import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ platform }) => {
  if (!platform) throw redirect(302, "/auth/login");

  const params = new URLSearchParams({
    client_id: platform.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${platform.env.BASE_URL}/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });

  throw redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};
