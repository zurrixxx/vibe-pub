<script lang="ts">
  import { enhance } from '$app/forms';

  interface Props {
    form: { url?: string; slug?: string; error?: string } | null;
  }
  let { form }: Props = $props();

  let view = $state<'doc' | 'kanban'>('doc');
  let textareaEl: HTMLTextAreaElement;
  let dragging = $state(false);

  function handleFile(file: File) {
    if (!file.name.endsWith('.md') && !file.name.endsWith('.markdown') && !file.name.endsWith('.txt') && file.type !== 'text/plain' && file.type !== 'text/markdown') return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && textareaEl) {
        textareaEl.value = e.target.result as string;
        textareaEl.dispatchEvent(new Event('input'));
      }
    };
    reader.readAsText(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }

  function onFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) handleFile(file);
    input.value = '';
  }
</script>

<svelte:head>
  <title>vibe.pub — markdown deserves a better home</title>
</svelte:head>

<main class="main-content animate-fade-in-up">

  <!-- Hero -->
  <div class="hero-section">
    <h1 class="hero-heading">
      Markdown deserves<br>a better home.
    </h1>
    <p class="hero-sub">
      Paste or upload your markdown — get an instant, beautiful shareable page.
    </p>
    <a href="/welcome" class="hero-example">See an example page &rarr;</a>
  </div>

  <!-- Success banner -->
  {#if form?.url}
    <div class="success-banner">
      <span class="success-label">published</span>
      <a href={`/${form.slug}`} class="success-link">
        {form.url}
      </a>
    </div>
  {/if}

  {#if form?.error}
    <div class="error-msg">{form.error}</div>
  {/if}

  <!-- Editor card -->
  <form method="POST" action="?/publish" use:enhance>
    <div
      class="editor-card"
      class:dragging
      ondragover={(e) => { e.preventDefault(); dragging = true; }}
      ondragleave={() => { dragging = false; }}
      ondrop={onDrop}
    >

      <!-- Editor title bar -->
      <div class="editor-titlebar">
        <div class="titlebar-left">
          <span class="editor-label">New page</span>
          <label class="upload-btn">
            Upload .md
            <input type="file" accept=".md,.markdown,.txt,text/plain,text/markdown" onchange={onFileInput} style="display: none;" />
          </label>
        </div>

        <div class="titlebar-right">
          <!-- Preview toggle (visual only) -->
          <div class="preview-toggle">
            <span class="preview-tab preview-tab-active">Write</span>
            <span class="preview-tab">Preview</span>
          </div>

          <!-- View control -->
          <div class="view-toggle">
            {#each (['doc', 'kanban'] as const) as v}
              <button
                type="button"
                onclick={() => { view = v; }}
                class="view-btn"
                class:view-btn-active={view === v}
              >
                {v}
              </button>
            {/each}
          </div>
        </div>
      </div>

      <!-- Textarea -->
      <textarea
        bind:this={textareaEl}
        name="markdown"
        placeholder={dragging ? 'Drop your .md file here...' : '# Your title here\n\nWrite something worth sharing...'}
        rows={16}
        class="editor-textarea"
      ></textarea>
    </div>

    <input type="hidden" name="view" value={view} />

    <!-- Action bar -->
    <div class="action-bar">
      <button type="submit" class="publish-btn">
        Publish
        <span class="publish-hint">&#8984;&#9166;</span>
      </button>
    </div>
  </form>

  <!-- Features -->
  <div class="features-grid">
    {#each [
      { marker: '01', title: 'Doc view', desc: 'Beautiful rendered markdown with serif headings and generous spacing.' },
      { marker: '02', title: 'Kanban view', desc: 'Turn task lists into visual boards — no setup required.' },
      { marker: '03', title: 'Comments', desc: 'Readers can leave comments without creating an account.' },
      { marker: '04', title: 'API + CLI', desc: 'Publish from the terminal with a single curl command.' },
    ] as feat}
      <div class="feature-card">
        <div class="feature-marker">{feat.marker}</div>
        <div>
          <div class="feature-title">{feat.title}</div>
          <div class="feature-desc">{feat.desc}</div>
        </div>
      </div>
    {/each}
  </div>

  <!-- CLI section -->
  <div class="cli-card">
    <div class="cli-header">From the terminal</div>
    <div class="cli-body">
      <pre class="cli-pre"><span class="cli-dim">$</span> curl -X POST vibe.pub/api/pub -d @notes.md</pre>
      <div class="cli-output">&#x2192; https://vibe.pub/abc123</div>
    </div>
  </div>

  <!-- Footer -->
  <footer class="footer">
    <div class="footer-links">
      <a href="https://github.com" class="footer-link">GitHub</a>
      <span class="footer-sep">&middot;</span>
      <a href="/welcome" class="footer-link">API docs</a>
      <span class="footer-sep">&middot;</span>
      <span class="footer-domain">vibe.pub</span>
    </div>
    <p class="footer-tagline">Built for makers and developers.</p>
  </footer>

</main>

<style>
  .main-content {
    max-width: 680px;
    margin: 0 auto;
    padding: 64px 24px 96px;
  }

  /* Hero */
  .hero-section {
    margin-bottom: 56px;
  }

  .hero-heading {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 44px;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--text-primary);
    margin: 0 0 20px 0;
    line-height: 1.12;
  }

  .hero-sub {
    font-size: 16px;
    color: var(--text-secondary);
    margin: 0 0 20px 0;
    line-height: 1.6;
    max-width: 480px;
  }

  .hero-example {
    display: inline-block;
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    text-decoration: none;
    padding: 8px 20px;
    border: 1px solid rgba(0,0,0,0.14);
    border-radius: var(--radius-button);
    transition: background 150ms, border-color 150ms;
  }

  .hero-example:hover {
    background: rgba(0,0,0,0.04);
    border-color: rgba(0,0,0,0.22);
  }

  /* Success / error */
  .success-banner {
    margin-bottom: 32px;
    padding: 14px 18px;
    background: rgba(34,197,94,0.07);
    box-shadow: 0 0 0 1px rgba(34,197,94,0.18);
    border-radius: var(--radius-card);
    font-family: var(--font-mono);
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 12px;
    animation: fadeInUp 0.25s ease both;
  }

  .success-label {
    color: var(--text-tertiary);
  }

  .success-link {
    color: var(--text-primary);
    text-decoration: underline;
    text-underline-offset: 4px;
    text-decoration-color: rgba(34,197,94,0.4);
    word-break: break-all;
    transition: text-decoration-color 150ms;
  }

  .success-link:hover {
    text-decoration-color: #22c55e;
  }

  .error-msg {
    margin-bottom: 16px;
    font-family: var(--font-mono);
    font-size: 13px;
    color: #ef4444;
  }

  /* Editor */
  .editor-card {
    background: var(--surface);
    box-shadow: var(--shadow-elevated);
    border-radius: var(--radius-card);
    overflow: hidden;
    transition: box-shadow 150ms;
  }

  .editor-card.dragging {
    box-shadow: 0 0 0 2px var(--accent), var(--shadow-elevated);
  }

  .editor-titlebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 11px 16px;
    border-bottom: 1px solid var(--border);
    gap: 12px;
  }

  .titlebar-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .titlebar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .editor-label {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-tertiary);
  }

  .upload-btn {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
    cursor: pointer;
    padding: 3px 10px;
    border-radius: var(--radius-button);
    border: 1px solid var(--border);
    transition: color 150ms, border-color 150ms;
    user-select: none;
  }

  .upload-btn:hover {
    color: var(--text-secondary);
    border-color: rgba(0,0,0,0.14);
  }

  /* Preview toggle (decorative) */
  .preview-toggle {
    display: flex;
    gap: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius-button);
    overflow: hidden;
  }

  .preview-tab {
    font-family: var(--font-mono);
    font-size: 11px;
    padding: 3px 10px;
    color: var(--text-tertiary);
    cursor: default;
    transition: background 150ms, color 150ms;
  }

  .preview-tab-active {
    background: var(--bg);
    color: var(--text-secondary);
  }

  /* View toggle */
  .view-toggle {
    display: flex;
    background: var(--bg);
    border-radius: var(--radius-button);
    padding: 2px;
    gap: 2px;
    border: 1px solid var(--border);
  }

  .view-btn {
    font-family: var(--font-mono);
    font-size: 11px;
    padding: 3px 10px;
    border-radius: var(--radius-button);
    border: none;
    cursor: pointer;
    transition: background 150ms, color 150ms;
    background: transparent;
    color: var(--text-tertiary);
  }

  .view-btn-active {
    background: var(--surface);
    color: var(--text-primary);
    box-shadow: 0 1px 2px rgba(0,0,0,0.06);
  }

  .editor-textarea {
    width: 100%;
    font-family: var(--font-mono);
    font-size: 14px;
    line-height: 1.75;
    background: transparent;
    border: none;
    outline: none;
    padding: 24px 28px;
    resize: vertical;
    color: var(--text-primary);
    box-sizing: border-box;
  }

  .editor-textarea::placeholder {
    color: var(--text-tertiary);
  }

  /* Action bar */
  .action-bar {
    margin-top: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .publish-btn {
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 500;
    padding: 10px 28px;
    background: var(--accent);
    color: var(--bg);
    border: none;
    border-radius: var(--radius-button);
    cursor: pointer;
    transition: background-color 150ms, box-shadow 150ms;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .publish-btn:hover {
    background: var(--accent-hover);
  }

  .publish-hint {
    font-family: var(--font-mono);
    font-size: 11px;
    opacity: 0.4;
  }

  /* Features */
  .features-grid {
    margin-top: 72px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  @media (max-width: 500px) {
    .features-grid {
      grid-template-columns: 1fr;
    }
  }

  .feature-card {
    background: var(--surface);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    padding: 22px 22px 22px 22px;
    display: flex;
    align-items: flex-start;
    gap: 16px;
  }

  .feature-marker {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
    flex-shrink: 0;
    margin-top: 2px;
    letter-spacing: 0.02em;
  }

  .feature-title {
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 5px;
  }

  .feature-desc {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.55;
  }

  /* CLI */
  .cli-card {
    margin-top: 12px;
    background: var(--surface);
    box-shadow: var(--shadow-card);
    border-radius: var(--radius-card);
    overflow: hidden;
  }

  .cli-header {
    padding: 11px 20px;
    border-bottom: 1px solid var(--border);
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
    letter-spacing: 0.04em;
  }

  .cli-body {
    padding: 20px 24px 22px;
  }

  .cli-pre {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-primary);
    margin: 0 0 10px 0;
    white-space: pre-wrap;
  }

  .cli-dim {
    color: var(--text-tertiary);
    user-select: none;
  }

  .cli-output {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-tertiary);
    margin-top: 4px;
  }

  /* Footer */
  .footer {
    margin-top: 80px;
    padding-top: 28px;
    border-top: 1px solid var(--border);
  }

  .footer-links {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  .footer-link {
    font-family: var(--font-sans);
    font-size: 13px;
    color: var(--text-tertiary);
    text-decoration: none;
    transition: color 150ms;
  }

  .footer-link:hover {
    color: var(--text-secondary);
  }

  .footer-sep {
    color: var(--text-tertiary);
    opacity: 0.4;
  }

  .footer-domain {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-tertiary);
    opacity: 0.6;
  }

  .footer-tagline {
    font-size: 12px;
    color: var(--text-tertiary);
    margin: 0;
    opacity: 0.7;
  }

  /* Responsive */
  @media (max-width: 500px) {
    .main-content {
      padding: 40px 16px 72px;
    }

    .hero-heading {
      font-size: 34px;
    }

    .titlebar-right {
      gap: 6px;
    }

    .preview-toggle {
      display: none;
    }
  }
</style>
