import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as api from '../lib/api.js';
import { PAGE_VIEW_TYPE, RESOURCE_ACCESS_INPUT, coerceLegacyAccess } from '../lib/constants.js';

/** @type {[string, ...string[]]} */
const resourceAccessEnum = RESOURCE_ACCESS_INPUT;
/** @type {[string, ...string[]]} */
const pageViewEnum = PAGE_VIEW_TYPE;

async function resolveSlug(slug) {
  return api.getBySlug(slug);
}

export async function startMcp() {
  const server = new McpServer(
    { name: 'vibe-pub', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  // --- publish ---
  server.tool(
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
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  // --- get_page ---
  server.tool(
    'get_page',
    'Get a page by its slug. Returns full page details including markdown content.',
    {
      slug: z.string().describe('Page id, or `slug-id` URL fragment'),
    },
    async ({ slug }) => {
      const page = await api.getBySlug(slug);
      return { content: [{ type: 'text', text: JSON.stringify(page) }] };
    }
  );

  // --- update_page ---
  server.tool(
    'update_page',
    'Update a page identified by slug. Automatically creates a version snapshot before updating.',
    {
      slug: z.string().describe('Page id, or `slug-id` URL fragment'),
      markdown: z.string().describe('New markdown content'),
    },
    async ({ slug, markdown }) => {
      const page = await resolveSlug(slug);
      const result = await api.update(page.id, markdown);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  // --- delete_page ---
  server.tool(
    'delete_page',
    'Delete a page identified by slug.',
    {
      slug: z.string().describe('Page id, or `slug-id` URL fragment'),
    },
    async ({ slug }) => {
      const page = await resolveSlug(slug);
      await api.remove(page.id);
      return {
        content: [
          { type: 'text', text: JSON.stringify({ deleted: true, id: page.id, slug: page.slug }) },
        ],
      };
    }
  );

  // --- list_pages ---
  server.tool(
    'list_pages',
    'List all pages owned by the authenticated user. Requires auth token.',
    async () => {
      const pages = await api.list();
      return { content: [{ type: 'text', text: JSON.stringify(pages) }] };
    }
  );

  // --- get_comments ---
  server.tool(
    'get_comments',
    'List comments for a page by slug. Existing comments expose anchor.block_id for reuse when anchoring new replies. By default only unresolved (open) comments; set include_resolved to include resolved threads.',
    {
      slug: z.string().describe('Page id, or `slug-id` URL fragment'),
      include_resolved: z
        .boolean()
        .optional()
        .describe('If true, return every comment including resolved'),
    },
    async ({ slug, include_resolved }) => {
      const page = await resolveSlug(slug);
      const comments = await api.getComments(page.id, { all: include_resolved === true });
      return { content: [{ type: 'text', text: JSON.stringify(comments) }] };
    }
  );

  // --- add_comment ---
  server.tool(
    'add_comment',
    'Add a comment to a page identified by slug.',
    {
      slug: z.string().describe('Page id, or `slug-id` URL fragment'),
      body: z.string().describe('Comment body text'),
      anchor: z.string().optional().describe('Block ID to anchor the comment to'),
    },
    async ({ slug, body, anchor }) => {
      const page = await resolveSlug(slug);
      const comment = await api.addComment(page.id, body, { anchor });
      return { content: [{ type: 'text', text: JSON.stringify(comment) }] };
    }
  );

  // --- resolve_comments ---
  server.tool(
    'resolve_comments',
    'Resolve comments on a page. Either resolve all comments or specific ones by ID.',
    {
      slug: z.string().describe('Page id, or `slug-id` URL fragment'),
      all: z.boolean().optional().describe('Resolve all comments'),
      comment_ids: z.array(z.string()).optional().describe('Specific comment IDs to resolve'),
    },
    async ({ slug, all, comment_ids }) => {
      const page = await resolveSlug(slug);
      const result = await api.resolveComments(page.id, { all, comment_ids });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  // --- get_versions ---
  server.tool(
    'get_versions',
    'List version history for a page identified by slug.',
    {
      slug: z.string().describe('Page id, or `slug-id` URL fragment'),
    },
    async ({ slug }) => {
      const page = await resolveSlug(slug);
      const versions = await api.getVersions(page.id);
      return { content: [{ type: 'text', text: JSON.stringify(versions) }] };
    }
  );

  // --- get_version ---
  server.tool(
    'get_version',
    'Get a specific version of a page by slug and version number.',
    {
      slug: z.string().describe('Page id, or `slug-id` URL fragment'),
      version: z.number().describe('Version number'),
    },
    async ({ slug, version }) => {
      const page = await resolveSlug(slug);
      const v = await api.getVersion(page.id, version);
      return { content: [{ type: 'text', text: JSON.stringify(v) }] };
    }
  );

  // --- create_collection ---
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

  server.tool(
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
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  server.tool(
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
      const result = await api.updateCollection(slug, data);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  // --- get_collection ---
  server.tool(
    'get_collection',
    'Get collection details and its pages by slug.',
    {
      slug: z.string().describe('Collection slug'),
    },
    async ({ slug }) => {
      const result = await api.getCollection(slug);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  // --- add_to_collection ---
  server.tool(
    'add_to_collection',
    'Add a page to an existing collection.',
    {
      collection_slug: z.string().describe('Collection slug'),
      page_slug: z.string().describe('Page id or slug-id URL segment (same as get)'),
      label: z.string().optional().describe('Display label (overrides page title in nav)'),
      part_id: z.string().optional().describe('Part id to add the page into'),
    },
    async ({ collection_slug, page_slug, label, part_id }) => {
      const result = await api.addToCollection(collection_slug, page_slug, { label, part_id });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  // --- list_collection_parts ---
  server.tool(
    'list_collection_parts',
    'List parts in a collection.',
    {
      collection_slug: z.string().describe('Collection slug'),
    },
    async ({ collection_slug }) => {
      const result = await api.listCollectionParts(collection_slug);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  // --- create_collection_part ---
  server.tool(
    'create_collection_part',
    'Create a part (section) in a collection. Returns id and title.',
    {
      collection_slug: z.string().describe('Collection slug'),
      title: z.string().describe('Part title'),
      sort_order: z.number().int().optional().describe('Order among parts'),
    },
    async ({ collection_slug, title, sort_order }) => {
      const result = await api.createCollectionPart(collection_slug, title, { sort_order });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  // --- update_collection_part ---
  server.tool(
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
      const result = await api.updateCollectionPart(collection_slug, part_id, data);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  // --- delete_collection_part ---
  server.tool(
    'delete_collection_part',
    'Delete a part. Pages in the part become ungrouped.',
    {
      collection_slug: z.string().describe('Collection slug'),
      part_id: z.string().describe('Part id'),
    },
    async ({ collection_slug, part_id }) => {
      const result = await api.deleteCollectionPart(collection_slug, part_id);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  // --- remove_from_collection ---
  server.tool(
    'remove_from_collection',
    'Remove a page from a collection.',
    {
      collection_slug: z.string().describe('Collection slug'),
      page_slug: z.string().describe('Page id or slug-id URL segment (same as get)'),
    },
    async ({ collection_slug, page_slug }) => {
      const result = await api.removeFromCollection(collection_slug, page_slug);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
