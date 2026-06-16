import {
  DEFAULT_MCP_SCOPE,
  OAUTH_SCOPES,
  mcpResourcePath,
  protectedResourceMetadataUrl,
} from './constants';

export function authorizationServerMetadata(baseUrl: string) {
  const origin = baseUrl.replace(/\/$/, '');
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    scopes_supported: [...OAUTH_SCOPES],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
    client_id_metadata_document_supported: true,
  };
}

export function protectedResourceMetadata(baseUrl: string) {
  return {
    resource: mcpResourcePath(baseUrl),
    authorization_servers: [baseUrl.replace(/\/$/, '')],
    bearer_methods_supported: ['header'],
    scopes_supported: [...OAUTH_SCOPES],
  };
}

export function buildWwwAuthenticateHeader(baseUrl: string): string {
  const resourceMetadata = protectedResourceMetadataUrl(baseUrl);
  return (
    `Bearer error="invalid_token", ` +
    `error_description="Authentication required for this tool", ` +
    `resource_metadata="${resourceMetadata}", ` +
    `scope="${DEFAULT_MCP_SCOPE}"`
  );
}
