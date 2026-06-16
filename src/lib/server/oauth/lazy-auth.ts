import { MCP_PUBLIC_TOOLS } from './constants';

export function callsProtectedMcpTool(body: unknown): boolean {
  const messages = Array.isArray(body) ? body : [body];
  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') continue;
    const method = (msg as { method?: unknown }).method;
    if (method !== 'tools/call') continue;
    const name = (msg as { params?: { name?: unknown } }).params?.name;
    if (typeof name === 'string' && !MCP_PUBLIC_TOOLS.has(name)) {
      return true;
    }
  }
  return false;
}
