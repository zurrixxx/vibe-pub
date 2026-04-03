import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserByUsername, getPagesByUser, getCommentsByPage } from '$lib/server/db';
import { renderMarkdown, parseFrontmatter } from '$lib/server/markdown';

export const load: PageServerLoad = async ({ params, platform, locals }) => {
  if (!platform) throw error(500, 'Platform not available');
  const db = platform.env.DB;

  const user = await getUserByUsername(db, params.user);
  if (!user) throw error(404, 'User not found');

  // Find page by slug belonging to this user
  const pages = await getPagesByUser(db, user.id);
  const page = pages.find((p) => p.slug === params.slug);
  if (!page) throw error(404, 'Page not found');

  // Access control: private pages only visible to owner
  const isOwner = locals.user?.id === user.id;
  if (page.access === 'private' && !isOwner) {
    throw error(403, 'This page is private');
  }

  const { content } = parseFrontmatter(page.markdown);
  const html = await renderMarkdown(content);
  const comments = await getCommentsByPage(db, page.id);

  return { page, html, comments, isOwner };
};
