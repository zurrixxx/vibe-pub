import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createApiClient } from '../../../../cli/lib/mcp/api-client.js';
import { registerVibePubTools } from '../../../../cli/lib/mcp/register-tools.js';
import {
  DOC_FORMAT_DOC,
  KANBAN_FORMAT_DOC,
} from '../../../../cli/lib/handlers/format-text/index.js';

export async function createVibePubMcpServer(options: {
  fetch: typeof fetch;
  baseUrl: string;
  token: string | null;
  user?: { id: string; email: string; username: string } | null;
}) {
  const { fetch, baseUrl, token, user = null } = options;
  const getToken = () => token;
  const getBaseUrl = () => baseUrl;
  const getAuthUser = () => user;

  const api = createApiClient({ fetch, getBaseUrl, getToken });

  const server = new McpServer(
    { name: 'vibe-pub', version: '0.2.2' },
    { capabilities: { tools: {} } }
  );

  registerVibePubTools(server, {
    api,
    getToken,
    getBaseUrl,
    getAuthUser,
    formatDocs: { doc: DOC_FORMAT_DOC, kanban: KANBAN_FORMAT_DOC },
  });

  return server;
}
