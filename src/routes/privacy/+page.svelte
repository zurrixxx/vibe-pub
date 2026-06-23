<script lang="ts">
  import StaticDoc from '$lib/components/StaticDoc.svelte';
</script>

<StaticDoc
  title="Privacy Policy"
  description="How Vibe Inc. collects, uses, and protects personal data when you use vibe.pub — the website, CLI, API, and MCP connector."
>
  <p>
    This Privacy Policy explains how <strong>Vibe Inc.</strong> (“Vibe,” “we,” “us,” or “our”)
    collects, uses, discloses, and protects Personal Data when you use
    <a href="https://vibe.pub">vibe.pub</a> — our markdown publishing service for humans and AI
    agents, including the website, CLI, REST API, and remote MCP connector (“<strong
      >vibe.pub</strong
    >” or the “<strong>Service</strong>”).
  </p>

  <p>
    <strong>Company-wide policies:</strong> vibe.pub is one product offered by Vibe Inc. For privacy
    practices that apply across all Vibe websites, devices, and SaaS products, see the
    <a href="https://vibe.us/privacy/">Vibe Privacy Policy</a>.
  </p>

  <p><strong>Last updated:</strong> June 22, 2026</p>

  <h2>1. Scope: What This Policy Covers</h2>
  <p>This Privacy Policy applies to:</p>
  <ol>
    <li>
      <strong>Website</strong> — browsing, publishing, reading, commenting, and account management at
      vibe.pub.
    </li>
    <li>
      <strong>CLI and API</strong> — command-line tools and programmatic access that create, read, update,
      or delete content on vibe.pub.
    </li>
    <li>
      <strong>MCP Connector</strong> — the remote Model Context Protocol server at
      <code>https://vibe.pub/mcp</code>, including OAuth authorization when you connect from Claude or
      other MCP clients.
    </li>
    <li>
      <strong>Integrations you enable</strong> — optional sign-in with Google or GitHub, and
      third-party AI clients (e.g., Anthropic Claude) that initiate OAuth on your behalf.
    </li>
  </ol>
  <p>
    This policy does <strong>not</strong> cover third-party services that have their own privacy
    policies (e.g., Google, GitHub, Anthropic). Those providers process data under their terms when
    you use their products.
  </p>

  <h2>2. Definitions</h2>
  <ul>
    <li>
      <strong>“Personal Data”</strong> means information that identifies, relates to, describes, or
      could reasonably be linked to an individual (e.g., email address, username).
    </li>
    <li>
      <strong>“Customer Content”</strong> means content you submit to or create within the Service —
      markdown pages, collections, comments, version snapshots, and related metadata (title, slug,
      theme, access settings).
    </li>
    <li>
      <strong>“Subprocessor”</strong> means a third-party service provider that processes Personal
      Data on our behalf.
    </li>
  </ul>

  <h2>3. Personal Data We Collect</h2>

  <h3>3.1 Account and profile data</h3>
  <p>When you create or use a vibe.pub account, we may collect:</p>
  <ul>
    <li>
      <strong>Identity data:</strong> email address, username (e.g., <code>@username</code> profile
      URL), and display information from optional Google or GitHub sign-in (provider account ID and
      email).
    </li>
    <li>
      <strong>Authentication data:</strong> session cookies, login events, and security-related
      signals.
    </li>
  </ul>

  <h3>3.2 Customer Content</h3>
  <p>Depending on features you use, Customer Content may include:</p>
  <ul>
    <li>Markdown and rendered pages, collections, and reader-guide text.</li>
    <li>Comments, anchors, and resolution status on pages you own or can access.</li>
    <li>Version history snapshots created when content is updated.</li>
    <li>Share settings — email addresses or domains you grant access to private resources.</li>
  </ul>

  <h3>3.3 MCP connector and OAuth data</h3>
  <p>When you connect vibe.pub as an MCP connector, we may process:</p>
  <ul>
    <li>OAuth authorization codes, access tokens, and refresh tokens (with scopes you approve).</li>
    <li>OAuth client metadata (client name, redirect URIs) for registered MCP clients.</li>
    <li>
      API requests authenticated with your token — tool calls such as publish, update, or list pages.
      We do <strong>not</strong> receive the full text of your conversations in Claude or other AI
      clients; we only receive authorization requests and Service API calls you initiate through the
      connector.
    </li>
  </ul>

  <h3>3.4 Technical and usage data</h3>
  <ul>
    <li>
      <strong>Device/browser data:</strong> IP address, browser type, request path, timestamps, and
      similar server log fields collected by our hosting provider.
    </li>
    <li>
      <strong>Email delivery metadata</strong> when we send magic-link sign-in messages (e.g.,
      recipient address, delivery status).
    </li>
  </ul>
  <p>
    vibe.pub does not use third-party advertising pixels or sell Personal Data for cross-context
    behavioral advertising.
  </p>

  <h2>4. How We Use Personal Data</h2>
  <p>We use Personal Data to:</p>
  <ol>
    <li>
      <strong>Provide and operate the Service</strong> — publish and host pages, enforce access
      controls, sync content across web/CLI/API/MCP, and deliver commenting and version history.
    </li>
    <li>
      <strong>Authenticate users and connectors</strong> — magic-link email, OAuth (including PKCE),
      and session management across clients.
    </li>
    <li>
      <strong>Communicate with you</strong> — transactional email (sign-in links, authorization
      notices) and responses to support requests.
    </li>
    <li>
      <strong>Maintain security and reliability</strong> — detect abuse, troubleshoot incidents, and
      protect accounts and infrastructure.
    </li>
    <li>
      <strong>Improve the product</strong> — understand aggregate usage patterns to improve
      performance and usability (without selling your data).
    </li>
  </ol>

  <h2>5. AI Processing and Data Use</h2>
  <p>
    vibe.pub is designed for AI agents and humans to publish markdown. When an AI client (such as
    Claude) calls our MCP tools on your behalf:
  </p>
  <ul>
    <li>
      The client sends <strong>Customer Content you authorize</strong> (e.g., markdown to publish) to
      our API using your OAuth token.
    </li>
    <li>
      We <strong>do not</strong> use your Customer Content to train or fine-tune foundation models.
    </li>
    <li>
      We <strong>do not</strong> receive or store your full chat history with Anthropic or other AI
      providers — only the API calls and content explicitly sent to vibe.pub.
    </li>
    <li>
      Public pages may be read by anyone with the URL; set <code>private</code> access if content
      should not be publicly visible.
    </li>
  </ul>
  <p>
    For how Vibe Inc. handles AI processing across other products, see
    <a href="https://vibe.us/privacy/#blog-5-ai-processing-and-data-use"
      >AI Processing and Data Use</a
    >
    in the company Privacy Policy.
  </p>

  <h2>6. How We Share Personal Data</h2>
  <p>We share Personal Data only as described below:</p>

  <h3>6.1 Subprocessors (service providers)</h3>
  <p>We use Subprocessors to operate vibe.pub, including:</p>
  <ul>
    <li>
      <strong>Cloudflare</strong> — hosting, Workers, D1 database, and R2 object storage (primary
      infrastructure for the Service).
    </li>
    <li><strong>Resend</strong> — transactional email for magic-link authentication.</li>
    <li>
      <strong>Google / GitHub</strong> — optional identity providers when you choose those sign-in
      methods.
    </li>
  </ul>
  <p>
    Subprocessors are required to protect Personal Data and use it only to provide services to Vibe.
  </p>

  <h3>6.2 Integrations you enable</h3>
  <p>
    When you connect vibe.pub from Claude or another MCP client, that client initiates OAuth and may
    display our authorization screen. Anthropic processes your use of Claude under
    <a href="https://www.anthropic.com/legal/privacy">Anthropic’s privacy policy</a>. We receive only
    the authorization and API traffic described in Section 3.3.
  </p>

  <h3>6.3 Legal, safety, and compliance</h3>
  <p>We may disclose Personal Data if we believe in good faith it is necessary to:</p>
  <ul>
    <li>comply with applicable law or legal process;</li>
    <li>respond to lawful requests from public authorities;</li>
    <li>protect the rights, security, and safety of Vibe, our users, or others.</li>
  </ul>
  <p>We do <strong>not</strong> sell Personal Data.</p>

  <h2>7. Data Retention and Deletion</h2>
  <p>We retain Personal Data only as long as necessary for the purposes described in this policy.</p>
  <ul>
    <li>
      <strong>Customer Content:</strong> stored until you (or an authorized editor) delete it, or until
      your account is deleted.
    </li>
    <li>
      <strong>OAuth authorization codes:</strong> expire after 15 minutes and are consumed on use.
    </li>
    <li>
      <strong>Access tokens:</strong> expire after one hour; refresh tokens remain until revoked (e.g.,
      sign-out or disconnecting the connector).
    </li>
    <li>
      <strong>Server logs:</strong> retained according to our hosting provider’s default retention
      windows.
    </li>
  </ul>
  <p>
    You may delete pages and collections you own, revoke MCP connector access in Claude settings, or
    request account deletion by contacting us (Section 14).
  </p>

  <h2>8. Cookies and Similar Technologies</h2>
  <p>We use cookies and similar technologies to:</p>
  <ul>
    <li>maintain signed-in sessions (<code>httpOnly</code> session cookies);</li>
    <li>complete OAuth authorization flows (short-lived pending-state cookies);</li>
    <li>support core site functionality.</li>
  </ul>
  <p>
    vibe.pub does not use cookies for third-party advertising. You can control cookies through your
    browser settings; disabling session cookies may prevent sign-in.
  </p>

  <h2>9. International Data Transfers</h2>
  <p>
    Vibe Inc. is based in the United States. Personal Data may be processed and stored in the U.S. and
    in regions where our Subprocessors operate (including Cloudflare’s global network). We take steps
    designed to protect Personal Data consistent with this policy and applicable law.
  </p>

  <h2>10. Security</h2>
  <p>
    We implement administrative, technical, and organizational measures designed to protect Personal
    Data, including:
  </p>
  <ul>
    <li>encryption in transit (HTTPS/TLS) for all Service endpoints;</li>
    <li>OAuth 2.0 with PKCE for MCP connector authorization;</li>
    <li>access controls on private pages, collections, and API endpoints;</li>
    <li>hashed or time-limited tokens for authentication flows.</li>
  </ul>
  <p>
    No method of transmission or storage is 100% secure. Report suspected vulnerabilities to
    <a href="mailto:ricky@vibe.us">ricky@vibe.us</a> or via
    <a href="https://github.com/zurrixxx/vibe-pub/security">GitHub Security Advisories</a>.
  </p>

  <h2>11. Children’s Privacy</h2>
  <p>
    vibe.pub is not directed at children under 13. We do not knowingly collect Personal Data from
    children. If you believe a child has provided Personal Data to us, please contact us and we will
    take appropriate steps.
  </p>

  <h2>12. Updates to This Policy</h2>
  <p>
    We may update this Privacy Policy from time to time to reflect changes in our practices or for
    legal, operational, or regulatory reasons. We will post the updated version with a new “Last
    updated” date. Material changes may also be communicated through the Service where appropriate.
  </p>

  <h2>13. Your Choices and Rights</h2>
  <p>Depending on where you live, you may have rights to access, correct, delete, or export Personal Data, or to object to certain processing. To exercise these rights:</p>
  <ul>
    <li>Delete content you own directly in the Service.</li>
    <li>Disconnect the vibe.pub connector in Claude or sign out of your account.</li>
    <li>Contact us at <a href="mailto:ricky@vibe.us">ricky@vibe.us</a>.</li>
  </ul>

  <h2>14. Contact Us</h2>
  <p>If you have questions or requests regarding vibe.pub privacy, contact:</p>
  <p>
    <strong>Email:</strong> <a href="mailto:ricky@vibe.us">ricky@vibe.us</a><br />
    <strong>Company privacy (all Vibe products):</strong>
    <a href="mailto:privacy@vibe.us">privacy@vibe.us</a><br />
    <strong>Mail:</strong> Vibe Inc., 2018 156th Ave NE, Office 165, Bellevue, WA 98007, United States
  </p>
  <p>
  <strong>Open source:</strong>
  <a href="https://github.com/zurrixxx/vibe-pub">github.com/zurrixxx/vibe-pub</a>
  </p>
</StaticDoc>
