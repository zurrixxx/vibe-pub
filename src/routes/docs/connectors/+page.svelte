<script lang="ts">
  import StaticDoc from '$lib/components/StaticDoc.svelte';
  import {
    ALLOWED_LINK_ORIGINS,
    CONNECTOR_TOOLS,
    MCP_SERVER_URL,
    OAUTH_SCOPES,
  } from '$lib/connectors/doc';

  const publicTools = CONNECTOR_TOOLS.filter((t) => t.access === 'public');
  const authTools = CONNECTOR_TOOLS.filter((t) => t.access === 'auth');
</script>

<StaticDoc
  title="Claude Connector"
  description="Connect Claude to vibe.pub — publish markdown, manage pages and collections, and close the comment feedback loop."
>
  <p>
    vibe.pub is a remote MCP server that turns agent-generated markdown into shareable web pages.
    Connect once via OAuth, then ask Claude to publish reports, kanban boards, changelogs, and
    multi-page collections.
  </p>

  <div class="note">
    <strong>Server URL:</strong> <code>{MCP_SERVER_URL}</code><br />
    <strong>Transport:</strong> Streamable HTTP<br />
    <strong>Authentication:</strong> OAuth 2.0 with PKCE and Client ID Metadata Documents (CIMD)
  </div>

  <h2>Connect in Claude</h2>

  <h3>Claude.ai / Claude Desktop</h3>
  <ol>
    <li>Open <strong>Settings → Connectors</strong>.</li>
    <li>Add a custom connector with URL <code>{MCP_SERVER_URL}</code>.</li>
    <li>Click <strong>Authenticate</strong> when prompted.</li>
    <li>Enter your email, open the magic link, and approve the requested scopes.</li>
  </ol>

  <h3>Claude Code</h3>
  <pre><code>claude mcp add --transport http vibe-pub {MCP_SERVER_URL}</code></pre>
  <p>
    Then run <code>/mcp</code>, select vibe.pub, and choose <strong>Authenticate</strong>. Claude
    opens the OAuth flow in your browser.
  </p>

  <h2>OAuth endpoints</h2>
  <table>
    <thead>
      <tr><th>Endpoint</th><th>URL</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>Authorization server metadata</td>
        <td><code>/.well-known/oauth-authorization-server</code></td>
      </tr>
      <tr>
        <td>Protected resource metadata</td>
        <td><code>/.well-known/oauth-protected-resource/mcp</code></td>
      </tr>
      <tr>
        <td>Authorize</td>
        <td><code>/oauth/authorize</code></td>
      </tr>
      <tr>
        <td>Token</td>
        <td><code>/oauth/token</code></td>
      </tr>
    </tbody>
  </table>

  <h2>Scopes</h2>
  <table>
    <thead>
      <tr><th>Scope</th><th>Grants</th></tr>
    </thead>
    <tbody>
      {#each OAUTH_SCOPES as { scope, description }}
        <tr>
          <td><code>{scope}</code></td>
          <td>{description}</td>
        </tr>
      {/each}
    </tbody>
  </table>

  <h2>Tools</h2>
  <p>
    All tools include a human-readable <code>title</code> and a
    <code>readOnlyHint</code> or <code>destructiveHint</code> annotation for Claude's tool picker.
  </p>

  <h3>Public (no OAuth required)</h3>
  <p>
    These tools work before authentication. Read tools enforce the same access rules as the web —
    private pages return 403 unless you are signed in with permission.
  </p>
  <table>
    <thead>
      <tr><th>Tool</th><th>Hint</th><th>Description</th></tr>
    </thead>
    <tbody>
      {#each publicTools as tool}
        <tr>
          <td><code>{tool.name}</code></td>
          <td>{tool.hint}</td>
          <td>{tool.summary}</td>
        </tr>
      {/each}
    </tbody>
  </table>

  <h3>Authenticated</h3>
  <p>Write tools and account-scoped reads require a valid OAuth access token.</p>
  <table>
    <thead>
      <tr><th>Tool</th><th>Hint</th><th>Description</th></tr>
    </thead>
    <tbody>
      {#each authTools as tool}
        <tr>
          <td><code>{tool.name}</code></td>
          <td>{tool.hint}</td>
          <td>{tool.summary}</td>
        </tr>
      {/each}
    </tbody>
  </table>

  <h2>Recommended agent workflow</h2>
  <ol>
    <li>Call <code>format</code> with <code>doc</code> or <code>kanban</code> before drafting.</li>
    <li>Generate markdown matching the format spec.</li>
    <li>Call <code>publish</code> and return the URL to the user.</li>
    <li>
      For revisions, use <code>update_page</code>. For feedback loops, use
      <code>get_comments</code> → edit → <code>update_page</code> →
      <code>resolve_comments</code>.
    </li>
  </ol>

  <h2>Templates</h2>
  <p>
    Pages auto-detect a view from markdown structure, or you can set <code>view</code> explicitly:
  </p>
  <ul>
    <li><strong>doc</strong> — long-form articles (default)</li>
    <li><strong>kanban</strong> — <code>## Column</code> + <code>### Card</code> boards</li>
    <li><strong>changelog</strong> — keepachangelog-style releases</li>
    <li><strong>timeline</strong> — roadmap sections and periods</li>
    <li><strong>slides</strong> — slide decks (<code>view: slides</code> in frontmatter)</li>
    <li><strong>dashboard</strong> — metrics panels (<code>view: dashboard</code>)</li>
  </ul>

  <h2>Local MCP (CLI)</h2>
  <p>
    For development or offline use, run the stdio MCP server bundled in the CLI. This is separate
    from the hosted connector and uses a personal API token instead of OAuth:
  </p>
  <pre><code>npx vibe-pub --mcp</code></pre>
  <p>
    Configure in Claude Desktop with command <code>npx</code>, args
    <code>["-y", "vibe-pub", "--mcp"]</code>, and env <code>VIBE_PUB_TOKEN</code>.
  </p>

  <h2>Allowed link origins</h2>
  <p>Published pages and tool responses link to:</p>
  <ul>
    {#each ALLOWED_LINK_ORIGINS as origin}
      <li><code>{origin}</code></li>
    {/each}
  </ul>

  <h2>Privacy &amp; support</h2>
  <ul>
    <li><a href="/privacy">Privacy Policy</a></li>
    <li>
      <a href="https://github.com/zurrixxx/vibe-pub">Source code</a> (MIT)
    </li>
    <li>
      <a href="https://github.com/zurrixxx/vibe-pub/issues">Issues &amp; support</a>
    </li>
  </ul>

  <h2>Directory review checklist</h2>
  <p>For Anthropic connector reviewers testing end-to-end access:</p>
  <ol>
    <li>Add connector URL <code>{MCP_SERVER_URL}</code> in Claude admin settings.</li>
    <li>Authenticate with the test account email provided in the submission portal.</li>
    <li>
      Verify public reads: <code>format</code> (doc), <code>whoami</code>, and
      <code>get_page</code> on a public demo slug.
    </li>
    <li>
      Verify writes: <code>publish</code> → <code>update_page</code> →
      <code>delete_page</code>.
    </li>
    <li>Optional: <code>create_collection</code> → <code>delete_collection</code>.</li>
  </ol>
</StaticDoc>
