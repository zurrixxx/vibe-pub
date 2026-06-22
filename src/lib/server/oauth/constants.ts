/** OAuth scopes advertised for vibe.pub MCP. */
export const OAUTH_SCOPES = [
  'pages:read',
  'pages:write',
  'collections:read',
  'collections:write',
  'offline_access',
] as const;

export const DEFAULT_MCP_SCOPE =
  'pages:read pages:write collections:read collections:write offline_access';

/** Tools callable without a bearer token (lazy auth). */
export const MCP_PUBLIC_TOOLS = new Set([
  'format',
  'whoami',
  'get_page',
  'get_collection',
  'get_comments',
  'get_versions',
  'get_version',
]);

export function mcpResourcePath(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/mcp`;
}

export function protectedResourceMetadataUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/.well-known/oauth-protected-resource/mcp`;
}
