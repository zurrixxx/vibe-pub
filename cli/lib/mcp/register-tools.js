import { z } from 'zod';
import { PAGE_VIEW_TYPE, RESOURCE_ACCESS_INPUT, coerceLegacyAccess } from '../constants.js';
import { formatAccessStatus } from '../handlers/helpers.js';
import { buildShareBody, mcpJson, parseUnshareTarget, revokeResourceShare } from './helpers.js';

const resourceAccessEnum = RESOURCE_ACCESS_INPUT;
const pageViewEnum = PAGE_VIEW_TYPE;
/** @type {[string, ...string[]]} */
const shareRoleEnum = ['viewer', 'editor'];

const shareInputSchema = {
  email: z.string().optional().describe('Share with a user by email'),
  domain: z.string().optional().describe('Share with an email domain (e.g. @company.com)'),
  role: z.enum(shareRoleEnum).optional().describe('Permission when sharing (default: viewer)'),
};

const unshareInputSchema = {
  email: z.string().optional().describe('Remove share for a user by email'),
  domain: z.string().optional().describe('Remove share for an email domain'),
};

const readerGuideSchema = {
  readers_guide: z
    .string()
    .optional()
    .describe(
      "Cover lede under «A reader's guide»: 1–3 sentences overview — scope, tone, how chapters fit together. Shown in large serif above the guide cards."
    ),
  what_its_about: z
    .string()
    .optional()
    .describe(
      "Cover card «What it's about»: 1–3 sentences on the collection's subject and thesis. Write for this specific collection, not generic platform copy."
    ),
  who_its_for: z
    .string()
    .optional()
    .describe(
      "Cover card «Who it's for»: who should read this (role, team, prior knowledge). Be concrete."
    ),
  how_to_read_it: z
    .string()
    .optional()
    .describe(
      'Cover card «How to read it»: how to navigate (sidebar, suggested starting chapter, optional vs sequential reading).'
    ),
};

/**
 * Accept any McpServer instance — root app and CLI may resolve separate SDK copies.
 * @param {{ registerTool: (...args: any[]) => unknown }} server
 * @param {{
 *   api: ReturnType<import('./api-client.js').createApiClient>;
 *   getToken: () => string | null;
 *   getBaseUrl: () => string;
 *   getAuthUser?: () => { id: string; email: string; username: string } | null;
 *   formatDocs: { doc: string; kanban: string };
 * }} handlers
 */
export function registerVibePubTools(server, handlers) {
  const { api, getToken, getBaseUrl, getAuthUser, formatDocs } = handlers;

  /** @param {string} slug */
  async function resolveSlug(slug) {
    return api.getBySlug(slug);
  }

  /**
   * @param {string} name
   * @param {string} description
   * @param {Record<string, import('zod').ZodTypeAny>} inputSchema
   * @param {(args: any) => Promise<{ content: [{ type: 'text', text: string }] }>} handler
   * @param {{ title?: string; readOnlyHint?: boolean; destructiveHint?: boolean }} [annotations]
   */
  function tool(name, description, inputSchema, handler, annotations) {
    return server.registerTool(
      name,
      {
        description,
        inputSchema,
        ...(annotations && { annotations }),
      },
      handler
    );
  }

  tool(
    'publish',
    'Publish markdown content to vibe.pub. Returns the page id, slug, and URL.',
    {
      markdown: z.string().describe('Markdown content to publish'),
      slug: z.string().optional().describe('Custom URL slug'),
      view: z
        .enum(pageViewEnum)
        .optional()
        .describe('Page view: doc, kanban, changelog, timeline, slides, dashboard'),
      access: z.enum(resourceAccessEnum).optional().describe('Access level (default: public)'),
      theme: z.string().optional().describe('Page theme'),
      agent_published: z
        .boolean()
        .optional()
        .describe(
          'If false, page is not tagged as agent-published (/@username filter). Defaults to true for MCP.'
        ),
    },
    async ({ markdown, slug, view, access, theme, agent_published }) => {
      const result = await api.publish(markdown, {
        slug,
        view,
        access: coerceLegacyAccess(access),
        theme,
        agentPublished: agent_published !== false,
      });
      return mcpJson(result);
    },
    { title: 'Publish page', destructiveHint: true }
  );

  tool(
    'get_page',
    'Get a page by its slug. Returns full page details including markdown content.',
    {
      slug: z.string().describe('Page id, or `slug-id` URL fragment'),
    },
    async ({ slug }) => mcpJson(await api.getBySlug(slug)),
    { title: 'Get page', readOnlyHint: true }
  );

  tool(
    'update_page',
    'Update a page identified by slug. Pass markdown to replace content (creates a version snapshot), and/or access to change visibility only.',
    {
      slug: z.string().describe('Page id, or `slug-id` URL fragment'),
      markdown: z.string().optional().describe('New markdown content'),
      access: z
        .enum(resourceAccessEnum)
        .optional()
        .describe('Change access without editing content'),
    },
    async ({ slug, markdown, access }) => {
      const page = await resolveSlug(slug);
      const coercedAccess = coerceLegacyAccess(access);

      if (coercedAccess !== undefined && (markdown === undefined || !markdown.trim())) {
        return mcpJson(await api.updatePage(page.id, { access: coercedAccess }));
      }

      if (!markdown?.trim()) {
        throw new Error('Provide markdown and/or access');
      }

      return mcpJson(await api.update(page.id, markdown, { access: coercedAccess }));
    },
    { title: 'Update page', destructiveHint: true }
  );

  tool(
    'delete_page',
    'Delete a page identified by slug.',
    {
      slug: z.string().describe('Page id, or `slug-id` URL fragment'),
    },
    async ({ slug }) => {
      const page = await resolveSlug(slug);
      await api.remove(page.id);
      return mcpJson({ deleted: true, id: page.id, slug: page.slug });
    },
    { title: 'Delete page', destructiveHint: true }
  );

  tool(
    'list_pages',
    'List pages for the authenticated user. Requires auth token.',
    {
      shared_to_me: z
        .boolean()
        .optional()
        .describe('If true, list private pages others shared with you instead of your own pages'),
    },
    async ({ shared_to_me }) => mcpJson(await api.list(shared_to_me === true)),
    { title: 'List pages', readOnlyHint: true }
  );

  tool(
    'get_comments',
    'List comments for a page by slug. Each block-anchored comment includes block_text (plain-text preview of the anchored block). Existing comments expose anchor.block_id for reuse when anchoring new replies. By default only unresolved (open) comments; set include_resolved to include resolved threads.',
    {
      slug: z.string().describe('Page id, or `slug-id` URL fragment'),
      include_resolved: z
        .boolean()
        .optional()
        .describe('If true, return every comment including resolved'),
    },
    async ({ slug, include_resolved }) => {
      const page = await resolveSlug(slug);
      return mcpJson(await api.getComments(page.id, { all: include_resolved === true }));
    },
    { title: 'Get comments', readOnlyHint: true }
  );

  tool(
    'add_comment',
    'Add a comment to a page identified by slug.',
    {
      slug: z.string().describe('Page id, or `slug-id` URL fragment'),
      body: z.string().describe('Comment body text'),
      anchor: z.string().optional().describe('Block ID to anchor the comment to'),
    },
    async ({ slug, body, anchor }) => {
      const page = await resolveSlug(slug);
      return mcpJson(await api.addComment(page.id, body, { anchor }));
    },
    { title: 'Add comment', destructiveHint: true }
  );

  tool(
    'resolve_comments',
    'Resolve comments on a page. Either resolve all comments or specific ones by ID.',
    {
      slug: z.string().describe('Page id, or `slug-id` URL fragment'),
      all: z.boolean().optional().describe('Resolve all comments'),
      comment_ids: z.array(z.string()).optional().describe('Specific comment IDs to resolve'),
    },
    async ({ slug, all, comment_ids }) => {
      const page = await resolveSlug(slug);
      return mcpJson(await api.resolveComments(page.id, { all, comment_ids }));
    },
    { title: 'Resolve comments', destructiveHint: true }
  );

  tool(
    'get_versions',
    'List version history for a page identified by slug.',
    {
      slug: z.string().describe('Page id, or `slug-id` URL fragment'),
    },
    async ({ slug }) => {
      const page = await resolveSlug(slug);
      return mcpJson(await api.getVersions(page.id));
    },
    { title: 'Get versions', readOnlyHint: true }
  );

  tool(
    'get_version',
    'Get a specific version of a page by slug and version number.',
    {
      slug: z.string().describe('Page id, or `slug-id` URL fragment'),
      version: z.number().describe('Version number'),
    },
    async ({ slug, version }) => {
      const page = await resolveSlug(slug);
      return mcpJson(await api.getVersion(page.id, version));
    },
    { title: 'Get version', readOnlyHint: true }
  );

  tool(
    'create_collection',
    'Create a collection. Prefer `parts` for grouped sections; use `page_slugs` for ungrouped pages (after parts). Fill readers_guide, what_its_about, who_its_for, and how_to_read_it for the cover. Returns id, slug, url, parts, ungrouped_pages.',
    {
      title: z.string().describe('Collection title'),
      slug: z.string().optional().describe('Custom URL slug'),
      page_slugs: z.array(z.string()).optional().describe('Ordered page slugs (ungrouped)'),
      parts: z
        .array(
          z.object({
            title: z.string(),
            page_slugs: z.array(z.string()).optional(),
          })
        )
        .optional()
        .describe('Ordered parts with optional page slugs each'),
      access: z.enum(resourceAccessEnum).optional().describe('Access level (default: public)'),
      description: z
        .string()
        .optional()
        .describe('Short subtitle under the title on the cover (one line or short paragraph)'),
      ...readerGuideSchema,
      theme: z.string().optional().describe('Collection theme'),
      agent_published: z
        .boolean()
        .optional()
        .describe(
          'If false, collection is not tagged as agent-published. Defaults to true for MCP.'
        ),
    },
    async ({
      title,
      slug,
      page_slugs,
      parts,
      access,
      description,
      readers_guide,
      what_its_about,
      who_its_for,
      how_to_read_it,
      theme,
      agent_published,
    }) => {
      const result = await api.createCollection(title, {
        slug,
        slugs: page_slugs,
        parts,
        access: coerceLegacyAccess(access),
        description,
        readers_guide,
        what_its_about,
        who_its_for,
        how_to_read_it,
        theme,
        agentPublished: agent_published !== false,
      });
      return mcpJson(result);
    },
    { title: 'Create collection', destructiveHint: true }
  );

  tool(
    'update_collection',
    "Update collection metadata (title, description, access, reader's guide fields).",
    {
      slug: z.string().describe('Collection slug'),
      title: z.string().optional(),
      description: z.string().optional(),
      access: z.enum(resourceAccessEnum).optional(),
      ...readerGuideSchema,
    },
    async ({
      slug,
      title,
      description,
      access,
      readers_guide,
      what_its_about,
      who_its_for,
      how_to_read_it,
    }) => {
      const data = {};
      if (title !== undefined) data.title = title;
      if (description !== undefined) data.description = description;
      if (access !== undefined) data.access = coerceLegacyAccess(access);
      if (readers_guide !== undefined) data.readers_guide = readers_guide;
      if (what_its_about !== undefined) data.what_its_about = what_its_about;
      if (who_its_for !== undefined) data.who_its_for = who_its_for;
      if (how_to_read_it !== undefined) data.how_to_read_it = how_to_read_it;
      return mcpJson(await api.updateCollection(slug, data));
    },
    { title: 'Update collection', destructiveHint: true }
  );

  tool(
    'get_collection',
    'Get collection details and its pages by slug.',
    {
      slug: z.string().describe('Collection slug'),
    },
    async ({ slug }) => mcpJson(await api.getCollection(slug)),
    { title: 'Get collection', readOnlyHint: true }
  );

  tool(
    'add_to_collection',
    'Add a page to an existing collection.',
    {
      collection_slug: z.string().describe('Collection slug'),
      page_slug: z.string().describe('Page id or slug-id URL segment (same as get)'),
      label: z.string().optional().describe('Display label (overrides page title in nav)'),
      part_id: z.string().optional().describe('Part id to add the page into'),
    },
    async ({ collection_slug, page_slug, label, part_id }) =>
      mcpJson(await api.addToCollection(collection_slug, page_slug, { label, part_id })),
    { title: 'Add to collection', destructiveHint: true }
  );

  tool(
    'list_collection_parts',
    'List parts in a collection.',
    {
      collection_slug: z.string().describe('Collection slug'),
    },
    async ({ collection_slug }) => mcpJson(await api.listCollectionParts(collection_slug)),
    { title: 'List collection parts', readOnlyHint: true }
  );

  tool(
    'create_collection_part',
    'Create a part (section) in a collection. Returns id and title.',
    {
      collection_slug: z.string().describe('Collection slug'),
      title: z.string().describe('Part title'),
      sort_order: z.number().int().optional().describe('Order among parts'),
    },
    async ({ collection_slug, title, sort_order }) =>
      mcpJson(await api.createCollectionPart(collection_slug, title, { sort_order })),
    { title: 'Create collection part', destructiveHint: true }
  );

  tool(
    'update_collection_part',
    'Update a collection part title or sort order.',
    {
      collection_slug: z.string().describe('Collection slug'),
      part_id: z.string().describe('Part id'),
      title: z.string().optional().describe('New title'),
      sort_order: z.number().int().optional().describe('New sort order'),
    },
    async ({ collection_slug, part_id, title, sort_order }) => {
      const data = {};
      if (title !== undefined) data.title = title;
      if (sort_order !== undefined) data.sort_order = sort_order;
      return mcpJson(await api.updateCollectionPart(collection_slug, part_id, data));
    },
    { title: 'Update collection part', destructiveHint: true }
  );

  tool(
    'delete_collection_part',
    'Delete a part. Pages in the part become ungrouped.',
    {
      collection_slug: z.string().describe('Collection slug'),
      part_id: z.string().describe('Part id'),
    },
    async ({ collection_slug, part_id }) =>
      mcpJson(await api.deleteCollectionPart(collection_slug, part_id)),
    { title: 'Delete collection part', destructiveHint: true }
  );

  tool(
    'remove_from_collection',
    'Remove a page from a collection.',
    {
      collection_slug: z.string().describe('Collection slug'),
      page_slug: z.string().describe('Page id or slug-id URL segment (same as get)'),
    },
    async ({ collection_slug, page_slug }) =>
      mcpJson(await api.removeFromCollection(collection_slug, page_slug)),
    { title: 'Remove from collection', destructiveHint: true }
  );

  tool(
    'list_collections',
    'List collections for the authenticated user. Requires auth token.',
    {
      shared_to_me: z
        .boolean()
        .optional()
        .describe(
          'If true, list private collections others shared with you instead of your own collections'
        ),
    },
    async ({ shared_to_me }) => mcpJson(await api.listCollections(shared_to_me === true)),
    { title: 'List collections', readOnlyHint: true }
  );

  tool(
    'delete_collection',
    'Delete a collection by slug. Pages in the collection are not deleted.',
    {
      slug: z.string().describe('Collection slug'),
    },
    async ({ slug }) => {
      const result = await api.deleteCollection(slug);
      return mcpJson(result ?? { deleted: true, slug });
    },
    { title: 'Delete collection', destructiveHint: true }
  );

  tool(
    'format',
    'Get markdown format reference for agents before publishing. Use doc for long-form pages or kanban for board pages.',
    {
      name: z.enum(['doc', 'kanban']).describe('Format to load: doc or kanban'),
    },
    async ({ name }) => {
      const documentation = name === 'kanban' ? formatDocs.kanban : formatDocs.doc;
      return mcpJson({ format: name, documentation });
    },
    { title: 'Format reference', readOnlyHint: true }
  );

  tool(
    'whoami',
    'Show current authentication status and API base URL.',
    {},
    async () => {
      const user = getAuthUser?.() ?? null;
      return mcpJson({
        authenticated: getAuthUser ? !!user : !!getToken(),
        base_url: getBaseUrl(),
        ...(user && { user: { id: user.id, email: user.email, username: user.username } }),
      });
    },
    { title: 'Who am I', readOnlyHint: true }
  );

  tool(
    'access_page_status',
    'Get access level and share list for a page (domains and users with access).',
    {
      slug: z.string().describe('Page id, or `slug-id` URL fragment'),
    },
    async ({ slug }) => {
      const page = await resolveSlug(slug);
      const payload = await api.listPageShares(page.id);
      return mcpJson(formatAccessStatus(page.access, payload));
    },
    { title: 'Page access status', readOnlyHint: true }
  );

  tool(
    'access_page_share',
    'Share a private page with a user by email or an email domain.',
    {
      slug: z.string().describe('Page id, or `slug-id` URL fragment'),
      ...shareInputSchema,
    },
    async ({ slug, email, domain, role }) => {
      const page = await resolveSlug(slug);
      const body = buildShareBody({ email, domain, role });
      const payload = await api.addPageShare(page.id, body);
      return mcpJson(formatAccessStatus(page.access, payload));
    },
    { title: 'Share page', destructiveHint: true }
  );

  tool(
    'access_page_unshare',
    'Remove a page share for a user by email or an email domain.',
    {
      slug: z.string().describe('Page id, or `slug-id` URL fragment'),
      ...unshareInputSchema,
    },
    async ({ slug, email, domain }) => {
      const page = await resolveSlug(slug);
      const target = parseUnshareTarget({ email, domain });
      const payload = await api.listPageShares(page.id);
      await revokeResourceShare(
        payload,
        target,
        (granteeId) =>
          api.removePageShare(page.id, { grantee_type: 'domain', grantee_id: granteeId }),
        (groupId, userId) => api.removeAccessGroupMember(groupId, userId)
      );
      const updated = await api.listPageShares(page.id);
      return mcpJson(formatAccessStatus(page.access, updated));
    },
    { title: 'Unshare page', destructiveHint: true }
  );

  tool(
    'access_collection_status',
    'Get access level and share list for a collection.',
    {
      slug: z.string().describe('Collection slug'),
    },
    async ({ slug }) => {
      const collection = await api.getCollection(slug);
      const payload = await api.listCollectionShares(slug);
      return mcpJson(formatAccessStatus(collection.access, payload));
    },
    { title: 'Collection access status', readOnlyHint: true }
  );

  tool(
    'access_collection_share',
    'Share a private collection with a user by email or an email domain.',
    {
      slug: z.string().describe('Collection slug'),
      ...shareInputSchema,
    },
    async ({ slug, email, domain, role }) => {
      const body = buildShareBody({ email, domain, role });
      const collection = await api.getCollection(slug);
      const payload = await api.addCollectionShare(slug, body);
      return mcpJson(formatAccessStatus(collection.access, payload));
    },
    { title: 'Share collection', destructiveHint: true }
  );

  tool(
    'access_collection_unshare',
    'Remove a collection share for a user by email or an email domain.',
    {
      slug: z.string().describe('Collection slug'),
      ...unshareInputSchema,
    },
    async ({ slug, email, domain }) => {
      const target = parseUnshareTarget({ email, domain });
      const collection = await api.getCollection(slug);
      const payload = await api.listCollectionShares(slug);
      await revokeResourceShare(
        payload,
        target,
        (granteeId) =>
          api.removeCollectionShare(slug, { grantee_type: 'domain', grantee_id: granteeId }),
        (groupId, userId) => api.removeAccessGroupMember(groupId, userId)
      );
      const updated = await api.listCollectionShares(slug);
      return mcpJson(formatAccessStatus(collection.access, updated));
    },
    { title: 'Unshare collection', destructiveHint: true }
  );
}
