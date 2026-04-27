<script lang="ts">
  let installCopied = $state(false);

  function copyCmd() {
    navigator.clipboard.writeText('npx vibe-pub publish notes.md');
    installCopied = true;
    setTimeout(() => {
      installCopied = false;
    }, 2000);
  }
</script>

<svelte:head>
  <title>vibe.pub — turn markdown into shareable pages</title>
</svelte:head>

<div class="page">
  <!-- ═══ HERO ═══ -->
  <section class="hero">
    <h1>
      Turn markdown<br />
      into
      <em
        >shareable<br />
        pages.</em
      >
    </h1>
    <div class="hero-aside">
      <p>
        One command. Auto-detects docs, kanban boards, changelogs. Built for AI agents and
        developers.
      </p>
      <div
        class="hero-cmd"
        onclick={copyCmd}
        role="button"
        tabindex="0"
        onkeydown={(e) => e.key === 'Enter' && copyCmd()}
      >
        <code>$ npx vibe-pub publish</code>
        <span class="hero-cmd-copy">{installCopied ? 'Copied' : 'Copy'}</span>
      </div>
      <nav class="hero-nav">
        <a href="/c/docs">Docs</a>
        <a href="/c/examples">Examples</a>
        <a href="https://github.com">GitHub</a>
      </nav>
    </div>
  </section>

  <!-- ═══ VIEWS ═══ -->
  <section class="views">
    <div class="section-label">Views</div>
    <div class="views-grid">
      <a href="/c/examples?page=welcome" class="view-card">
        <div class="view-preview">
          <div class="thumb" aria-hidden="true">
            <div class="t-page">
              <div class="t-toc">
                <div class="t-toc-label">On this page</div>
                <div class="t-toc-item active">How It Works</div>
                <div class="t-toc-item">Doc View</div>
                <div class="t-toc-item">Markdown</div>
                <div class="t-toc-item">Tables</div>
                <div class="t-toc-item">CLI</div>
              </div>
              <div class="t-doc">
                <div class="t-h1">Welcome to vibe.pub</div>
                <div class="t-body">
                  The publishing layer for AI agents. Your AI generates content — vibe.pub makes it
                  beautiful.
                </div>
                <div class="t-h2">How It Works</div>
                <div class="t-body">1. <strong>Generate</strong> — your AI creates content</div>
                <div class="t-body">2. <strong>Publish</strong> — one command</div>
                <div class="t-body">3. <strong>Share</strong> — anyone can read</div>
                <div class="t-code">curl -X POST vibe.pub/api/pub</div>
                <div class="t-h2">Features</div>
                <div class="t-body">TOC sidebar, code highlighting, comments, 14 themes...</div>
              </div>
            </div>
          </div>
        </div>
        <div class="view-info">
          <span class="view-name">Doc</span>
          <span class="view-desc">Typography, TOC, code highlighting, comments</span>
        </div>
      </a>

      <a href="/c/examples?page=sample-kanban-v2" class="view-card">
        <div class="view-preview">
          <div class="thumb" aria-hidden="true">
            <div class="t-board">
              <div class="t-col">
                <div class="t-col-h">Backlog <span>4</span></div>
                <div class="t-card">Write launch blog post</div>
                <div class="t-card">Design social media assets</div>
                <div class="t-card">Prepare press kit</div>
                <div class="t-card">Set up analytics</div>
              </div>
              <div class="t-col">
                <div class="t-col-h">In Progress <span>3</span></div>
                <div class="t-card">Landing page copy review</div>
                <div class="t-card">Beta tester outreach</div>
                <div class="t-card">API documentation</div>
              </div>
              <div class="t-col">
                <div class="t-col-h">Review <span>2</span></div>
                <div class="t-card">Pricing page design</div>
                <div class="t-card">Onboarding flow</div>
              </div>
              <div class="t-col">
                <div class="t-col-h">Done <span>3</span></div>
                <div class="t-card done">CI/CD pipeline</div>
                <div class="t-card done">Domain config</div>
                <div class="t-card done">Core features</div>
              </div>
            </div>
          </div>
        </div>
        <div class="view-info">
          <span class="view-name">Kanban</span>
          <span class="view-desc">Auto-detected from checkbox lists, drag and drop</span>
        </div>
      </a>

      <a href="/c/docs" class="view-card">
        <div class="view-preview">
          <div class="thumb" aria-hidden="true">
            <div class="t-coll">
              <div class="t-coll-bar">
                <span class="t-coll-title">Documentation</span>
                <span class="t-coll-tab active">Overview</span>
                <span class="t-coll-tab">Quick Start</span>
                <span class="t-coll-tab">API</span>
                <span class="t-coll-tab">Views</span>
                <span class="t-coll-tab">Frontmatter</span>
              </div>
              <div class="t-doc" style="padding-top: 12px;">
                <div class="t-h1">Documentation</div>
                <div class="t-body">Everything you need to publish with vibe.pub.</div>
                <div class="t-h2">Getting started</div>
                <div class="t-body">Quick Start — publish your first page in 30 seconds</div>
                <div class="t-h2">Reference</div>
                <div class="t-body">API Reference — endpoints, parameters, responses</div>
                <div class="t-body">Views — doc and kanban auto-detection</div>
                <div class="t-body">Frontmatter — title, theme, access control</div>
              </div>
            </div>
          </div>
        </div>
        <div class="view-info">
          <span class="view-name">Collection</span>
          <span class="view-desc">Multi-page docs with tab navigation</span>
        </div>
      </a>
    </div>

    <!-- Coming soon row -->
    <div class="coming-row">
      <div class="coming-item">
        <span class="coming-name">Changelog</span>
        <span class="coming-tag">soon</span>
      </div>
      <div class="coming-item">
        <span class="coming-name">Timeline</span>
        <span class="coming-tag">soon</span>
      </div>
      <div class="coming-item">
        <span class="coming-name">Slides</span>
        <span class="coming-tag">soon</span>
      </div>
    </div>
  </section>

  <!-- ═══ INTEGRATIONS ═══ -->
  <section class="integrations">
    <div class="section-label">Integrations</div>
    <div class="int-grid">
      <div class="int-item">
        <svg
          class="int-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          ><path
            d="M12 2a7 7 0 0 1 7 7c0 3-2 5.5-4 7l-1 2H10l-1-2c-2-1.5-4-4-4-7a7 7 0 0 1 7-7z"
          /><path d="M10 18h4" /><path d="M10 21h4" /></svg
        >
        <div class="int-name">Claude Code</div>
        <div class="int-desc">MCP or CLI via Bash tool</div>
      </div>
      <div class="int-item">
        <svg
          class="int-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          ><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg
        >
        <div class="int-name">Cursor / Cline</div>
        <div class="int-desc">MCP integration</div>
      </div>
      <div class="int-item">
        <svg
          class="int-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          ><circle cx="12" cy="12" r="3" /><path
            d="M12 1v4m0 14v4m-9-9h4m14 0h4M5.6 5.6l2.8 2.8m7.2 7.2 2.8 2.8M5.6 18.4l2.8-2.8m7.2-7.2 2.8-2.8"
          /></svg
        >
        <div class="int-name">GitHub Actions</div>
        <div class="int-desc">Auto-publish on push</div>
      </div>
      <div class="int-item">
        <svg
          class="int-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          ><rect x="3" y="3" width="18" height="18" rx="3" /><path
            d="M7 8h4m-4 4h10m-10 4h7"
          /></svg
        >
        <div class="int-name">Any terminal</div>
        <div class="int-desc">npx — zero install</div>
      </div>
    </div>
  </section>

  <!-- ═══ PASTE CTA ═══ -->
  <section class="paste-cta">
    <span class="paste-text">Want to publish manually?</span>
    <a href="/new" class="paste-link">Paste markdown &rarr;</a>
  </section>

  <!-- ═══ FOOTER ═══ -->
  <footer class="ft">
    <span>vibe.pub</span>
    <span class="ft-right">The publishing layer for AI agents.</span>
  </footer>
</div>

<style>
  /* ═══ BASE ═══ */
  .page {
    max-width: 1080px;
    margin: 0 auto;
    padding: 0 48px;
  }

  /* ═══ HERO ═══ */
  .hero {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 64px;
    align-items: end;
    padding: 140px 0 100px;
    border-bottom: 1px solid var(--border);
  }

  .hero h1 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 72px;
    font-weight: 400;
    letter-spacing: -0.045em;
    line-height: 1;
    color: var(--text-primary);
    margin: 0;
  }

  .hero h1 em {
    font-style: italic;
  }

  .hero-aside {
    padding-bottom: 8px;
  }

  .hero-aside p {
    font-size: 16px;
    color: var(--text-secondary);
    line-height: 1.65;
    margin: 0 0 28px;
  }

  .hero-cmd {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #0f0f14;
    border-radius: 8px;
    padding: 14px 18px;
    cursor: pointer;
    margin-bottom: 28px;
    transition: background 150ms;
  }

  .hero-cmd:hover {
    background: #191920;
  }

  .hero-cmd code {
    font-family: var(--font-mono);
    font-size: 14px;
    color: #e2e8f0;
  }

  .hero-cmd-copy {
    font-family: var(--font-mono);
    font-size: 11px;
    color: #64748b;
    transition: color 150ms;
  }

  .hero-cmd:hover .hero-cmd-copy {
    color: #94a3b8;
  }

  .hero-nav {
    display: flex;
    gap: 24px;
  }

  .hero-nav a {
    font-size: 14px;
    color: var(--text-tertiary);
    text-decoration: none;
    transition: color 150ms;
  }

  .hero-nav a:hover {
    color: var(--text-primary);
  }

  /* ═══ VIEWS ═══ */
  .views {
    padding: 56px 0;
    border-bottom: 1px solid var(--border);
  }

  .views-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 20px;
  }

  .view-card {
    background: var(--surface);
    border-radius: 12px;
    box-shadow: var(--shadow-card);
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    transition:
      transform 150ms,
      box-shadow 150ms;
  }

  .view-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  }

  /* View preview — scaled thumbnail */
  .view-preview {
    height: 200px;
    border-bottom: 1px solid var(--border);
    overflow: hidden;
    position: relative;
  }

  .thumb {
    transform: scale(0.55);
    transform-origin: top left;
    width: 182%; /* 100/0.55 */
    height: 182%;
    font-family: var(--font-sans);
    pointer-events: none;
    user-select: none;
  }

  /* Thumbnail doc page */
  .t-page {
    display: flex;
    gap: 16px;
    padding: 12px;
  }

  .t-toc {
    width: 90px;
    flex-shrink: 0;
    padding-top: 24px;
  }

  .t-toc-label {
    font-size: 7px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-tertiary);
    margin-bottom: 6px;
  }

  .t-toc-item {
    font-size: 8px;
    color: var(--text-tertiary);
    padding: 2px 0 2px 8px;
    border-left: 1.5px solid transparent;
  }

  .t-toc-item.active {
    color: var(--text-primary);
    border-left-color: var(--text-primary);
  }

  .t-doc {
    flex: 1;
    background: var(--surface);
    border-radius: 6px;
    padding: 14px 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }

  .t-h1 {
    font-family: var(--font-serif);
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .t-h2 {
    font-family: var(--font-serif);
    font-size: 10px;
    font-weight: 700;
    color: var(--text-primary);
    margin-top: 10px;
    margin-bottom: 3px;
  }

  .t-body {
    font-size: 8px;
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: 2px;
  }

  .t-body strong {
    color: var(--text-primary);
  }

  .t-code {
    font-family: var(--font-mono);
    font-size: 7px;
    color: #94a3b8;
    background: #0f0f14;
    padding: 6px 8px;
    border-radius: 4px;
    margin-top: 4px;
  }

  /* Thumbnail kanban */
  .t-board {
    display: flex;
    gap: 6px;
    padding: 12px;
  }

  .t-col {
    flex: 1;
    min-width: 0;
  }

  .t-col-h {
    font-size: 7px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-tertiary);
    margin-bottom: 6px;
    display: flex;
    justify-content: space-between;
  }

  .t-col-h span {
    font-weight: 400;
    background: var(--surface-hover);
    padding: 0 4px;
    border-radius: 3px;
    font-size: 7px;
  }

  .t-card {
    font-size: 8px;
    padding: 6px 8px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 5px;
    margin-bottom: 3px;
    color: var(--text-primary);
    line-height: 1.3;
  }

  .t-card.done {
    color: var(--text-tertiary);
    text-decoration: line-through;
  }

  /* Thumbnail collection */
  .t-coll {
    padding: 0;
  }

  .t-coll-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }

  .t-coll-title {
    font-family: var(--font-serif);
    font-size: 9px;
    font-weight: 700;
    color: var(--text-primary);
    margin-right: 8px;
  }

  .t-coll-tab {
    font-size: 7px;
    color: var(--text-tertiary);
    padding: 3px 6px;
    border-radius: 3px;
  }

  .t-coll-tab.active {
    background: var(--bg);
    color: var(--text-primary);
  }

  .t-coll .t-doc {
    margin: 10px 12px;
    border-radius: 6px;
  }

  /* View info */
  .view-info {
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .view-name {
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .view-desc {
    font-size: 12px;
    color: var(--text-tertiary);
    line-height: 1.4;
  }

  /* Coming soon row */
  .coming-row {
    display: flex;
    gap: 16px;
    padding-top: 8px;
  }

  .coming-item {
    display: flex;
    align-items: center;
    gap: 8px;
    opacity: 0.45;
  }

  .coming-name {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .coming-tag {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-tertiary);
    background: var(--surface);
    padding: 1px 6px;
    border-radius: 3px;
  }

  /* ═══ INTEGRATIONS ═══ */
  .integrations {
    padding: 56px 0;
    border-bottom: 1px solid var(--border);
  }

  .section-label {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-tertiary);
    margin-bottom: 28px;
  }

  .int-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
  }

  .int-icon {
    width: 20px;
    height: 20px;
    color: var(--text-tertiary);
    margin-bottom: 10px;
  }

  .int-item {
    padding: 20px 0;
    border-top: 1px solid var(--border);
  }

  .int-name {
    font-family: var(--font-sans);
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .int-desc {
    font-size: 13px;
    color: var(--text-tertiary);
    line-height: 1.5;
  }

  /* ═══ PASTE CTA ═══ */
  .paste-cta {
    padding: 40px 0;
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .paste-text {
    font-size: 14px;
    color: var(--text-tertiary);
  }

  .paste-link {
    font-size: 14px;
    color: var(--text-secondary);
    text-decoration: none;
    border-bottom: 1px solid var(--border);
    padding-bottom: 1px;
    transition:
      color 150ms,
      border-color 150ms;
  }

  .paste-link:hover {
    color: var(--text-primary);
    border-color: var(--text-primary);
  }

  /* ═══ FOOTER ═══ */
  .ft {
    border-top: 1px solid var(--border);
    padding: 28px 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .ft span:first-child {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 15px;
    color: var(--text-tertiary);
    letter-spacing: -0.02em;
  }
  .ft-right {
    font-size: 13px;
    color: var(--text-tertiary);
    font-style: italic;
  }

  /* ═══ RESPONSIVE ═══ */
  @media (max-width: 800px) {
    .page {
      padding: 0 28px;
    }
    .hero {
      grid-template-columns: 1fr;
      gap: 32px;
      padding: 80px 0 56px;
    }
    .hero h1 {
      font-size: 48px;
    }
    .ex-link {
      grid-template-columns: 32px 1fr 20px;
    }
    .ex-desc {
      display: none;
    }
    .int-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .views-grid {
      grid-template-columns: 1fr;
    }
    .coming-row {
      flex-wrap: wrap;
    }
    .editor-section {
      padding: 48px 0 64px;
    }
  }

  @media (max-width: 500px) {
    .page {
      padding: 0 20px;
    }
    .hero {
      padding: 56px 0 40px;
    }
    .hero h1 {
      font-size: 38px;
    }
    .hero-nav {
      gap: 16px;
    }
  }
</style>
