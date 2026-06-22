<script lang="ts">
  interface Props {
    title: string;
    description?: string;
    children: import('svelte').Snippet;
  }

  let { title, description, children }: Props = $props();
</script>

<svelte:head>
  <title>{title} — vibe.pub</title>
  {#if description}
    <meta name="description" content={description} />
  {/if}
</svelte:head>

<article class="static-doc">
  <header class="static-doc-head">
    <p class="static-doc-eyebrow"><a href="/">vibe.pub</a></p>
    <h1>{title}</h1>
    {#if description}
      <p class="static-doc-lede">{description}</p>
    {/if}
  </header>
  <div class="static-doc-body">
    {@render children()}
  </div>
  <footer class="static-doc-foot">
    <a href="/privacy">Privacy</a>
    <a href="/docs/connectors">Connectors</a>
    <a href="https://github.com/zurrixxx/vibe-pub">GitHub</a>
  </footer>
</article>

<style>
  .static-doc {
    max-width: 720px;
    margin: 0 auto;
    padding: 48px 24px 80px;
    font-family: var(--font-prose);
    color: var(--text-primary);
  }

  .static-doc-eyebrow {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin: 0 0 20px;
  }

  .static-doc-eyebrow a {
    color: var(--text-tertiary);
    text-decoration: none;
  }

  .static-doc-eyebrow a:hover {
    color: var(--text-primary);
  }

  .static-doc-head h1 {
    font-family: var(--font-serif);
    font-weight: 400;
    font-size: clamp(36px, 6vw, 52px);
    line-height: 1.05;
    letter-spacing: -0.02em;
    margin: 0 0 16px;
  }

  .static-doc-lede {
    font-size: 18px;
    line-height: 1.5;
    color: var(--text-secondary);
    margin: 0;
  }

  .static-doc-body {
    margin-top: 40px;
    font-size: 16px;
    line-height: 1.65;
  }

  .static-doc-body :global(h2) {
    font-family: var(--font-serif);
    font-weight: 400;
    font-size: 28px;
    letter-spacing: -0.01em;
    margin: 48px 0 16px;
    padding-top: 8px;
    border-top: 1px solid var(--border);
  }

  .static-doc-body :global(h3) {
    font-family: var(--font-sans);
    font-size: 15px;
    font-weight: 600;
    margin: 28px 0 10px;
  }

  .static-doc-body :global(p),
  .static-doc-body :global(ul),
  .static-doc-body :global(ol) {
    margin: 0 0 16px;
    color: var(--text-secondary);
  }

  .static-doc-body :global(li) {
    margin-bottom: 6px;
  }

  .static-doc-body :global(a) {
    color: var(--text-primary);
    text-decoration: underline;
    text-decoration-color: var(--text-tertiary);
    text-underline-offset: 3px;
  }

  .static-doc-body :global(a:hover) {
    text-decoration-color: var(--text-primary);
  }

  .static-doc-body :global(code) {
    font-family: var(--font-mono);
    font-size: 0.88em;
    background: rgba(0, 0, 0, 0.05);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .static-doc-body :global(pre) {
    font-family: var(--font-mono);
    font-size: 13px;
    line-height: 1.55;
    background: var(--text-primary);
    color: var(--bg);
    padding: 16px 18px;
    border-radius: 10px;
    overflow-x: auto;
    margin: 0 0 20px;
  }

  .static-doc-body :global(pre code) {
    background: none;
    padding: 0;
    color: inherit;
  }

  .static-doc-body :global(table) {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-sans);
    font-size: 14px;
    margin: 0 0 24px;
  }

  .static-doc-body :global(th),
  .static-doc-body :global(td) {
    text-align: left;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
  }

  .static-doc-body :global(th) {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-tertiary);
  }

  .static-doc-body :global(.note) {
    padding: 14px 16px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--surface);
    font-family: var(--font-sans);
    font-size: 14px;
    margin: 0 0 20px;
  }

  .static-doc-foot {
    margin-top: 64px;
    padding-top: 24px;
    border-top: 1px solid var(--border);
    display: flex;
    gap: 20px;
    font-family: var(--font-mono);
    font-size: 11px;
  }

  .static-doc-foot a {
    color: var(--text-tertiary);
    text-decoration: none;
  }

  .static-doc-foot a:hover {
    color: var(--text-primary);
  }
</style>
