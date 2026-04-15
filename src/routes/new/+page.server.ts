import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb, createPage } from '$lib/server/db';
import { generateSlug } from '$lib/server/slug';
import { parseFrontmatter } from '$lib/server/markdown';
import { detectView } from '$lib/templates/detect';

export const load: PageServerLoad = async () => {
  return {};
};

export const actions: Actions = {
  publish: async ({ request, locals, platform }) => {
    if (!platform) return fail(500, { error: 'No platform' });
    const db = getDb(platform);

    const formData = await request.formData();
    const markdown = (formData.get('markdown') as string)?.trim();

    if (!markdown) {
      return fail(400, { error: 'Markdown content is required' });
    }

    const { data: fm } = parseFrontmatter(markdown);

    const slug = generateSlug();
    const view = (fm.view as 'doc' | 'kanban') ?? detectView(markdown);
    const theme = fm.theme ?? 'default';
    const access = fm.access ?? 'unlisted';

    const page = await createPage(db, {
      slug,
      user_id: locals.user?.id,
      title: fm.title ?? undefined,
      markdown,
      view,
      theme,
      access,
      expires_at: fm.expires ?? undefined
    });

    const baseUrl = platform.env.BASE_URL ?? 'https://vibe.pub';
    const url = `${baseUrl}/${page.slug}`;

    return { url, slug: page.slug };
  }
};
