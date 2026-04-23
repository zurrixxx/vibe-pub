import type { Handle } from "@sveltejs/kit";
import { verifySessionToken, COOKIE_NAME } from "$lib/server/auth";

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.user = null;

  const token = event.cookies.get(COOKIE_NAME);
  if (token && event.platform) {
    const userId = await verifySessionToken(
      token,
      event.platform.env.JWT_SECRET,
    );
    if (userId) {
      const user = await event.platform.env.DB.prepare(
        "SELECT id, email, username FROM users WHERE id = ?",
      )
        .bind(userId)
        .first<{ id: string; email: string; username: string }>();

      if (user) {
        event.locals.user = user;
      }
    }
  }

  return resolve(event);
};
