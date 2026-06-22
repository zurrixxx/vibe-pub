<script lang="ts">
  import StaticDoc from '$lib/components/StaticDoc.svelte';
</script>

<StaticDoc
  title="Privacy Policy"
  description="How vibe.pub collects, uses, and stores your data when you use the website, CLI, or MCP connector."
>
  <p><strong>Last updated:</strong> June 22, 2026</p>

  <p>
    vibe.pub ("we", "us") operates the publishing service at
    <a href="https://vibe.pub">https://vibe.pub</a>, including the website, CLI, REST API, and
    remote MCP connector. This policy describes what data we collect, how we use it, and your
    choices.
  </p>

  <h2>Data we collect</h2>

  <h3>Account information</h3>
  <ul>
    <li>
      <strong>Email address</strong> — when you sign in via magic link or OAuth authorization.
    </li>
    <li>
      <strong>Username</strong> — assigned or chosen when you create an account (e.g.
      <code>@username</code> profile URL).
    </li>
    <li>
      <strong>Third-party identity</strong> — if you sign in with Google or GitHub, we receive your provider
      account ID and email from that provider.
    </li>
  </ul>

  <h3>Content you publish</h3>
  <ul>
    <li>Markdown and metadata for pages and collections (title, slug, theme, access level).</li>
    <li>Comments you or others leave on your pages.</li>
    <li>Version snapshots created when pages are updated.</li>
    <li>Share settings (email addresses or domains you grant access to).</li>
  </ul>

  <h3>Authentication and connector data</h3>
  <ul>
    <li>
      OAuth authorization codes, refresh tokens, and access tokens when you connect vibe.pub as an
      MCP connector in Claude or other clients.
    </li>
    <li>OAuth client metadata (client name, redirect URIs) for registered MCP clients.</li>
    <li>Session cookies for web sign-in.</li>
  </ul>

  <h3>Technical data</h3>
  <ul>
    <li>Standard server logs (IP address, request path, timestamps) retained by our host.</li>
    <li>Email delivery metadata when we send magic-link messages.</li>
  </ul>

  <h2>How we use data</h2>
  <ul>
    <li>Provide publishing, reading, commenting, and sharing features.</li>
    <li>Authenticate you across the website, CLI, API, and MCP connector.</li>
    <li>Send transactional email (sign-in links, authorization notices).</li>
    <li>Enforce access controls on private pages and collections.</li>
    <li>Maintain security, prevent abuse, and debug service issues.</li>
  </ul>

  <p>We do not sell your personal data. We do not use your published content to train AI models.</p>

  <h2>Third-party services</h2>
  <ul>
    <li>
      <strong>Cloudflare</strong> — hosting (Pages, Workers, D1 database, R2 storage). Data is processed
      in Cloudflare's infrastructure.
    </li>
    <li>
      <strong>Resend</strong> — transactional email delivery for magic-link sign-in.
    </li>
    <li>
      <strong>Google / GitHub</strong> — optional OAuth sign-in providers. Their privacy policies apply
      when you use those login methods.
    </li>
    <li>
      <strong>Anthropic / Claude</strong> — when you connect vibe.pub as a connector, Claude initiates
      OAuth on your behalf. We do not receive your Claude conversation data; we only receive authorization
      requests and API calls authenticated with tokens you approve.
    </li>
  </ul>

  <h2>Data storage and retention</h2>
  <ul>
    <li>Account and published content are stored in Cloudflare D1 until you delete them.</li>
    <li>OAuth authorization codes expire after 15 minutes.</li>
    <li>Access tokens expire after one hour; refresh tokens can be revoked by signing out.</li>
    <li>Server logs are retained according to Cloudflare's default retention policies.</li>
  </ul>

  <h2>Your choices</h2>
  <ul>
    <li>Delete pages and collections you own at any time.</li>
    <li>Revoke connector access by disconnecting vibe.pub in Claude settings or signing out.</li>
    <li>Set pages to <code>private</code> to restrict who can read them.</li>
    <li>Request account deletion by contacting us (see below).</li>
  </ul>

  <h2>Children</h2>
  <p>
    vibe.pub is not directed at children under 13. We do not knowingly collect data from children.
  </p>

  <h2>Changes</h2>
  <p>
    We may update this policy. Material changes will be reflected in the "Last updated" date above.
  </p>

  <h2>Contact</h2>
  <p>
    Questions or privacy requests:
    <a href="https://github.com/zurrixxx/vibe-pub/issues">GitHub Issues</a>
    or email the maintainers listed in the repository.
  </p>

  <p>
    Security vulnerabilities: please report privately via GitHub Security Advisories on
    <a href="https://github.com/zurrixxx/vibe-pub">github.com/zurrixxx/vibe-pub</a>.
  </p>
</StaticDoc>
