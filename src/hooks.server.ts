import type { Handle } from '@sveltejs/kit';
import { COOKIE_NAME } from '$lib/server/auth';
import { resolveUserIdFromBearer } from '$lib/server/oauth/resolve-auth';

function sessionTokenFromRequest(event: Parameters<Handle>[0]['event']): string | undefined {
  const cookieToken = event.cookies.get(COOKIE_NAME);
  if (cookieToken) return cookieToken;

  const auth = event.request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const bearer = auth.slice(7).trim();
    if (bearer) return bearer;
  }

  return undefined;
}

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.user = null;

  const token = sessionTokenFromRequest(event);
  if (token && event.platform) {
    const baseUrl = event.platform.env.BASE_URL ?? event.url.origin;
    const userId = await resolveUserIdFromBearer(token, event.platform.env.JWT_SECRET, baseUrl);
    if (userId) {
      const user = await event.platform.env.DB.prepare(
        'SELECT id, email, username FROM users WHERE id = ?'
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
