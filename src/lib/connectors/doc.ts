/** Connector documentation metadata — keep in sync with cli/lib/mcp/register-tools.js */

export const MCP_SERVER_URL = 'https://vibe.pub/mcp';

export const OAUTH_SCOPES = [
  {
    scope: 'pages:read',
    description: 'Read your pages, comments, and version history',
  },
  {
    scope: 'pages:write',
    description: 'Publish, update, delete pages; add and resolve comments; manage page shares',
  },
  {
    scope: 'collections:read',
    description: 'Read your collections and collection parts',
  },
  {
    scope: 'collections:write',
    description: 'Create, update, delete collections; manage parts and collection shares',
  },
  {
    scope: 'offline_access',
    description: 'Issue refresh tokens so Claude can reconnect without re-authorizing',
  },
] as const;

export type ToolAccess = 'public' | 'auth';

export type ConnectorTool = {
  name: string;
  title: string;
  access: ToolAccess;
  hint: 'read' | 'write';
  summary: string;
};

export const CONNECTOR_TOOLS: ConnectorTool[] = [
  {
    name: 'format',
    title: 'Format reference',
    access: 'public',
    hint: 'read',
    summary: 'Load doc or kanban markdown format spec before writing',
  },
  {
    name: 'whoami',
    title: 'Who am I',
    access: 'public',
    hint: 'read',
    summary: 'Check authentication status and API base URL',
  },
  {
    name: 'get_page',
    title: 'Get page',
    access: 'public',
    hint: 'read',
    summary: 'Fetch a page by slug (respects access controls)',
  },
  {
    name: 'get_collection',
    title: 'Get collection',
    access: 'public',
    hint: 'read',
    summary: 'Fetch collection metadata, parts, and pages',
  },
  {
    name: 'get_comments',
    title: 'Get comments',
    access: 'public',
    hint: 'read',
    summary: 'List open comments on a page',
  },
  {
    name: 'get_versions',
    title: 'Get versions',
    access: 'public',
    hint: 'read',
    summary: 'List version history for a page',
  },
  {
    name: 'get_version',
    title: 'Get version',
    access: 'public',
    hint: 'read',
    summary: 'Fetch a specific page version snapshot',
  },
  {
    name: 'publish',
    title: 'Publish page',
    access: 'auth',
    hint: 'write',
    summary: 'Publish markdown to a new URL',
  },
  {
    name: 'update_page',
    title: 'Update page',
    access: 'auth',
    hint: 'write',
    summary: 'Replace page content or change access level',
  },
  {
    name: 'delete_page',
    title: 'Delete page',
    access: 'auth',
    hint: 'write',
    summary: 'Permanently delete a page',
  },
  {
    name: 'list_pages',
    title: 'List pages',
    access: 'auth',
    hint: 'read',
    summary: 'List pages you own or shared with you',
  },
  {
    name: 'add_comment',
    title: 'Add comment',
    access: 'auth',
    hint: 'write',
    summary: 'Add a block-anchored comment',
  },
  {
    name: 'resolve_comments',
    title: 'Resolve comments',
    access: 'auth',
    hint: 'write',
    summary: 'Resolve one, some, or all comments on a page',
  },
  {
    name: 'create_collection',
    title: 'Create collection',
    access: 'auth',
    hint: 'write',
    summary: 'Create a multi-page collection with optional parts',
  },
  {
    name: 'update_collection',
    title: 'Update collection',
    access: 'auth',
    hint: 'write',
    summary: 'Update collection title, description, or access',
  },
  {
    name: 'add_to_collection',
    title: 'Add to collection',
    access: 'auth',
    hint: 'write',
    summary: 'Add an existing page to a collection',
  },
  {
    name: 'list_collection_parts',
    title: 'List collection parts',
    access: 'auth',
    hint: 'read',
    summary: 'List sections within a collection',
  },
  {
    name: 'create_collection_part',
    title: 'Create collection part',
    access: 'auth',
    hint: 'write',
    summary: 'Add a new section to a collection',
  },
  {
    name: 'update_collection_part',
    title: 'Update collection part',
    access: 'auth',
    hint: 'write',
    summary: 'Rename or reorder a collection section',
  },
  {
    name: 'delete_collection_part',
    title: 'Delete collection part',
    access: 'auth',
    hint: 'write',
    summary: 'Remove a section (pages become ungrouped)',
  },
  {
    name: 'remove_from_collection',
    title: 'Remove from collection',
    access: 'auth',
    hint: 'write',
    summary: 'Remove a page from a collection',
  },
  {
    name: 'list_collections',
    title: 'List collections',
    access: 'auth',
    hint: 'read',
    summary: 'List collections you own or shared with you',
  },
  {
    name: 'delete_collection',
    title: 'Delete collection',
    access: 'auth',
    hint: 'write',
    summary: 'Delete a collection (pages are kept)',
  },
  {
    name: 'access_page_status',
    title: 'Page access status',
    access: 'auth',
    hint: 'read',
    summary: 'View access level and share list for a page',
  },
  {
    name: 'access_page_share',
    title: 'Share page',
    access: 'auth',
    hint: 'write',
    summary: 'Share a private page with a user or domain',
  },
  {
    name: 'access_page_unshare',
    title: 'Unshare page',
    access: 'auth',
    hint: 'write',
    summary: 'Revoke page share for a user or domain',
  },
  {
    name: 'access_collection_status',
    title: 'Collection access status',
    access: 'auth',
    hint: 'read',
    summary: 'View access level and share list for a collection',
  },
  {
    name: 'access_collection_share',
    title: 'Share collection',
    access: 'auth',
    hint: 'write',
    summary: 'Share a private collection with a user or domain',
  },
  {
    name: 'access_collection_unshare',
    title: 'Unshare collection',
    access: 'auth',
    hint: 'write',
    summary: 'Revoke collection share for a user or domain',
  },
];

export const ALLOWED_LINK_ORIGINS = ['https://vibe.pub'] as const;
