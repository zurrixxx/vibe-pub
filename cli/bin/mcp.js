import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createApiClient } from '../lib/mcp/api-client.js';
import { registerVibePubTools } from '../lib/mcp/register-tools.js';
import { getBaseUrl, getToken } from '../lib/config.js';
import { DOC_FORMAT_DOC, KANBAN_FORMAT_DOC } from '../lib/handlers/format-text/index.js';

export async function startMcp() {
  const api = createApiClient({
    fetch: globalThis.fetch.bind(globalThis),
    getBaseUrl,
    getToken,
  });

  const server = new McpServer(
    { name: 'vibe-pub', version: '0.2.2' },
    { capabilities: { tools: {} } }
  );

  registerVibePubTools(server, {
    api,
    getToken,
    getBaseUrl,
    formatDocs: { doc: DOC_FORMAT_DOC, kanban: KANBAN_FORMAT_DOC },
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
