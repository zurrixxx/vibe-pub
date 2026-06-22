import type { RequestHandler } from './$types';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createVibePubMcpServer } from '$lib/server/mcp/create-server';
import { COOKIE_NAME } from '$lib/server/auth';
import { callsProtectedMcpTool } from '$lib/server/oauth/lazy-auth';
import { buildWwwAuthenticateHeader } from '$lib/server/oauth/metadata';
import { resolveUserIdFromBearer } from '$lib/server/oauth/resolve-auth';

function extractBearerToken(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }

  const cookie = request.headers.get('cookie');
  if (cookie) {
    const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    if (match?.[1]) return match[1];
  }

  return null;
}

const handleMcp: RequestHandler = async ({ request, platform, fetch }) => {
  if (!platform) {
    return new Response('Platform unavailable', { status: 500 });
  }

  const baseUrl = platform.env.BASE_URL ?? new URL(request.url).origin;
  const token = extractBearerToken(request);

  let parsedBody: unknown;
  if (request.method === 'POST') {
    try {
      parsedBody = await request.clone().json();
    } catch {
      parsedBody = undefined;
    }
  }

  const userId = await resolveUserIdFromBearer(token, platform.env.JWT_SECRET, baseUrl);
  const authed = !!userId;

  if (!authed && request.method === 'POST' && callsProtectedMcpTool(parsedBody)) {
    return new Response(
      JSON.stringify({
        error: 'invalid_token',
        error_description: 'Authentication required for this tool',
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': buildWwwAuthenticateHeader(baseUrl),
        },
      }
    );
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  const server = await createVibePubMcpServer({ fetch, baseUrl, token });
  await server.connect(transport);

  return transport.handleRequest(request, { parsedBody });
};

export const GET = handleMcp;
export const POST = handleMcp;
export const DELETE = handleMcp;
