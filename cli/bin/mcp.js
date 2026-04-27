import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as api from '../lib/api.js';

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
        .string()
        .optional()
        .describe('Page view: doc, kanban, changelog, timeline, slides, dashboard'),
      access: z
        .enum(['public', 'unlisted', 'private'])
        .optional()
        .describe('Access level (default: unlisted)'),
      theme: z.string().optional().describe('Page theme'),
    },
    async ({ markdown, slug, view, access, theme }) => {
      const result = await api.publish(markdown, { slug, view, access, theme });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  // --- get_page ---
  server.tool(
    'get_page',
    'Get a page by its slug. Returns full page details including markdown content.',
    {
      slug: z.string().describe('Page slug'),
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
      slug: z.string().describe('Page slug'),
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
      slug: z.string().describe('Page slug'),
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
    'Get all comments for a page identified by slug.',
    {
      slug: z.string().describe('Page slug'),
    },
    async ({ slug }) => {
      const page = await resolveSlug(slug);
      const comments = await api.getComments(page.id);
      return { content: [{ type: 'text', text: JSON.stringify(comments) }] };
    }
  );

  // --- add_comment ---
  server.tool(
    'add_comment',
    'Add a comment to a page identified by slug.',
    {
      slug: z.string().describe('Page slug'),
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
      slug: z.string().describe('Page slug'),
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
      slug: z.string().describe('Page slug'),
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
      slug: z.string().describe('Page slug'),
      version: z.number().describe('Version number'),
    },
    async ({ slug, version }) => {
      const page = await resolveSlug(slug);
      const v = await api.getVersion(page.id, version);
      return { content: [{ type: 'text', text: JSON.stringify(v) }] };
    }
  );

  // --- create_collection ---
  server.tool(
    'create_collection',
    'Create a new collection of pages. Returns id, slug, and URL.',
    {
      title: z.string().describe('Collection title'),
      slug: z.string().optional().describe('Custom URL slug'),
      page_slugs: z.array(z.string()).optional().describe('Ordered page slugs to include'),
      access: z
        .enum(['public', 'unlisted', 'private'])
        .optional()
        .describe('Access level (default: unlisted)'),
      description: z.string().optional().describe('Collection description'),
      theme: z.string().optional().describe('Collection theme'),
    },
    async ({ title, slug, page_slugs, access, description, theme }) => {
      const result = await api.createCollection(title, {
        slug,
        slugs: page_slugs,
        access,
        description,
        theme,
      });
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
      page_slug: z.string().describe('Page slug to add'),
      label: z.string().optional().describe('Display label (overrides page title in nav)'),
    },
    async ({ collection_slug, page_slug, label }) => {
      const result = await api.addToCollection(collection_slug, page_slug, { label });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  // --- remove_from_collection ---
  server.tool(
    'remove_from_collection',
    'Remove a page from a collection.',
    {
      collection_slug: z.string().describe('Collection slug'),
      page_slug: z.string().describe('Page slug to remove'),
    },
    async ({ collection_slug, page_slug }) => {
      const result = await api.removeFromCollection(collection_slug, page_slug);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
