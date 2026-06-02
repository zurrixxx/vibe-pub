import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb, createPage } from '$lib/server/db';
import { buildCanonicalPath } from '$lib/server/slug';
import { parseFrontmatter } from '$lib/server/markdown';
import { detectView } from '$lib/templates/detect';
import { resolveAssignableAccess } from '$lib/constants/page';

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

    const { data: fm, content } = parseFrontmatter(markdown);

    // PageView: frontmatter wins; detectView never returns slides/dashboard
    const view = fm.view ?? detectView(markdown);
    const theme = fm.theme ?? 'default';
    const access = resolveAssignableAccess(fm.access as string | undefined);

    // Extract title: frontmatter > first # heading > undefined
    let title = fm.title as string | undefined;
    if (!title) {
      const h1Match = content.match(/^#\s+(.+)/m);
      if (h1Match) title = h1Match[1].trim();
    }

    const page = await createPage(db, {
      user_id: locals.user?.id,
      title,
      markdown,
      view,
      theme,
      access,
      expires_at: fm.expires ?? undefined,
    });

    const canonicalPath = buildCanonicalPath(page);
    const baseUrl = platform.env.BASE_URL ?? 'https://vibe.pub';
    const url = `${baseUrl}${canonicalPath}`;

    return { url, canonicalPath };
  },
};
