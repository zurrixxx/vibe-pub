<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import { marked } from 'marked';
  import { detectView } from '$lib/templates/detect';

  interface Props {
    form: { url?: string; slug?: string; error?: string } | null;
  }
  let { form }: Props = $props();

  let user = $derived($page.data.user);

  let dragging = $state(false);
  let copied = $state(false);
  let markdownInput = $state('');
  let publishing = $state(false);
  let fileWarning = $state('');

  const MAX_SIZE = 512 * 1024; // 512KB
  let contentSize = $derived(new Blob([markdownInput]).size);
  let sizeWarning = $derived(contentSize > MAX_SIZE);

  let detectedView = $derived(detectView(markdownInput));

  let wordCount = $derived.by(() => {
    const text = markdownInput.trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
  });
  let readingTime = $derived(Math.max(1, Math.ceil(wordCount / 250)));

  let previewHtml = $derived.by(() => {
    if (!markdownInput.trim()) return '';
    return marked.parse(markdownInput.replace(/^---\n[\s\S]*?\n---\n?/, ''), {
      async: false,
      breaks: true,
    }) as string;
  });

  $effect(() => {
    if (form?.url) {
      navigator.clipboard
        .writeText(form.url)
        .then(() => {
          copied = true;
          setTimeout(() => {
            copied = false;
          }, 3000);
        })
        .catch(() => {});
    }
  });

  function handleFile(file: File) {
    const valid =
      file.name.endsWith('.md') ||
      file.name.endsWith('.markdown') ||
      file.name.endsWith('.txt') ||
      file.type === 'text/plain' ||
      file.type === 'text/markdown';
    if (!valid) {
      fileWarning = 'Only .md, .markdown, and .txt files are supported.';
      setTimeout(() => {
        fileWarning = '';
      }, 4000);
      return;
    }
    fileWarning = '';
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) markdownInput = e.target.result as string;
    };
    reader.readAsText(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  }
  function onFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    if (f) handleFile(f);
    input.value = '';
  }
</script>

<svelte:head>
  <title>New page — vibe.pub</title>
</svelte:head>

<div class="new-page">
  <div class="new-inner">
    {#if form?.url}
      <!-- Published success modal overlay -->
      <div class="modal-bg">
        <div class="modal">
          <div class="success-mark">&#10003;</div>
          <h2>Published</h2>
          <p class="modal-sub">Your page is live and ready to share.</p>
          <div class="url-box">
            <span class="url">{form.url}</span>
            <button
              type="button"
              onclick={() => {
                if (form?.url) navigator.clipboard.writeText(form.url);
                copied = true;
                setTimeout(() => (copied = false), 2000);
              }}
            >
              {copied ? 'copied' : 'copy'}
            </button>
          </div>
          <div class="modal-actions">
            <a href={`/${form.slug}`} class="btn primary">View page</a>
            {#if user}
              <a href={`/@${user.username}`} class="btn">My workspace</a>
            {:else}
              <a href="/" class="btn">Home</a>
            {/if}
            <button
              type="button"
              class="btn"
              onclick={() => {
                form = null;
                markdownInput = '';
              }}>Publish another</button
            >
          </div>
        </div>
      </div>
    {:else}
      <div class="page-header">
        <h1 class="new-title">New page</h1>
        <label class="upload-btn">
          Upload .md
          <input type="file" accept=".md,.markdown,.txt" onchange={onFileInput} hidden />
        </label>
      </div>

      {#if form?.error}<p class="err">{form.error}</p>{/if}
      {#if fileWarning}<p class="err">{fileWarning}</p>{/if}

      <form
        method="POST"
        action="?/publish"
        use:enhance={() => {
          publishing = true;
          return async ({ update }) => {
            publishing = false;
            await update();
          };
        }}
      >
        <div
          class="split-editor"
          class:dragging
          ondragover={(e) => {
            e.preventDefault();
            dragging = true;
          }}
          ondragleave={() => (dragging = false)}
          ondrop={onDrop}
        >
          <!-- Left pane: markdown editor -->
          <div class="pane pane-left">
            <div class="pane-head">
              <span>Markdown</span>
              <span class="chip">{wordCount} words &middot; {readingTime} min read</span>
            </div>
            <textarea
              bind:value={markdownInput}
              name="markdown"
              class="md-editor"
              spellcheck="false"
              placeholder={dragging
                ? 'Drop .md here...'
                : '# Your title here\n\nWrite something worth sharing...'}
            ></textarea>
          </div>

          <!-- Right pane: live preview -->
          <div class="pane pane-right">
            <div class="pane-head">
              <span>Preview {detectedView !== 'doc' ? '' : ''}</span>
              <span class="chip"
                >{detectedView !== 'doc' ? `auto-detected: ${detectedView}` : 'live'}</span
              >
            </div>
            <div class="preview-body">
              {#if !markdownInput.trim()}
                <p class="preview-empty">Start writing to see a preview...</p>
              {:else if detectedView === 'kanban'}
                <div class="detected-badge-wrap">
                  <span class="detected-badge">kanban detected</span>
                  <p class="detected-note">Kanban board will render after publishing.</p>
                </div>
              {:else if detectedView === 'changelog'}
                <div class="detected-badge-wrap">
                  <span class="detected-badge changelog">changelog detected</span>
                  <p class="detected-note">Changelog view will render after publishing.</p>
                </div>
              {:else if detectedView === 'timeline'}
                <div class="detected-badge-wrap">
                  <span class="detected-badge timeline">timeline detected</span>
                  <p class="detected-note">Timeline view will render after publishing.</p>
                </div>
              {:else}
                <div class="preview-html">{@html previewHtml}</div>
              {/if}
            </div>
          </div>
        </div>

        <div class="actions">
          <div class="actions-left">
            {#if sizeWarning}
              <span class="size-warn"
                >Content too large ({(contentSize / 1024).toFixed(0)}KB / 512KB max)</span
              >
            {:else if wordCount > 0}
              <span class="note">{(contentSize / 1024).toFixed(1)}KB</span>
            {/if}
          </div>
          <div class="actions-right">
            <span class="note">No signup required</span>
            <button type="submit" class="btn-publish" disabled={publishing || sizeWarning}>
              {publishing ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>
      </form>
    {/if}
  </div>
</div>

<style>
  /* ── Page layout ─────────────────────────────── */
  .new-page {
    min-height: calc(100vh - 56px);
    padding: 32px 32px 80px;
  }

  .new-inner {
    max-width: 1200px;
    margin: 0 auto;
  }

  .page-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin: 0 0 24px;
  }

  .new-title {
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 400;
    letter-spacing: -0.03em;
    color: var(--text-primary);
    margin: 0;
  }

  .upload-btn {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 5px 12px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    user-select: none;
    transition: all var(--ease-fast);
  }
  .upload-btn:hover {
    color: var(--text-primary);
    border-color: var(--border-hover);
  }

  /* ── Error messages ──────────────────────────── */
  .err {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--error);
    margin: 0 0 12px;
  }

  /* ── Split editor container ──────────────────── */
  .split-editor {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    min-height: calc(100vh - 260px);
    border-radius: 14px;
    overflow: hidden;
    box-shadow: var(--shadow-card);
  }
  .split-editor.dragging {
    box-shadow:
      0 0 0 2px var(--accent),
      var(--shadow-card);
  }

  /* ── Pane shared styles ──────────────────────── */
  .pane {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .pane-left {
    background: var(--surface);
    border-radius: 14px 0 0 14px;
    box-shadow: var(--shadow-card);
  }

  .pane-right {
    background: var(--bg);
    border-radius: 0 14px 14px 0;
    border-left: 1px solid var(--border);
  }

  .pane-head {
    padding: 14px 22px;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-tertiary);
  }

  .chip {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 500;
    padding: 3px 8px;
    border-radius: var(--radius-pill);
    background: rgba(0, 0, 0, 0.04);
    color: var(--text-secondary);
    letter-spacing: 0.04em;
    text-transform: none;
  }

  /* ── Markdown editor (left pane) ─────────────── */
  .md-editor {
    flex: 1;
    padding: 28px 32px 40px;
    font-family: var(--font-mono);
    font-size: 14px;
    line-height: 1.7;
    color: var(--text-primary);
    background: transparent;
    border: none;
    outline: none;
    resize: none;
    min-height: 400px;
    width: 100%;
    box-sizing: border-box;
  }
  .md-editor::placeholder {
    color: var(--text-tertiary);
  }

  /* ── Preview (right pane) ────────────────────── */
  .preview-body {
    flex: 1;
    padding: 40px 48px;
    overflow-y: auto;
    max-height: calc(100vh - 260px);
  }

  .preview-empty {
    color: var(--text-tertiary);
    font-style: italic;
    font-size: 14px;
    font-family: var(--font-prose);
    margin: 0;
  }

  .detected-badge-wrap {
    padding: 20px 0;
  }

  .detected-badge {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    padding: 3px 10px;
    background: rgba(59, 130, 246, 0.12);
    color: var(--info);
    border-radius: var(--radius-pill);
  }
  .detected-badge.changelog {
    background: rgba(139, 92, 246, 0.1);
    color: var(--purple);
  }
  .detected-badge.timeline {
    background: rgba(245, 158, 11, 0.1);
    color: var(--warning);
  }

  .detected-note {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 8px 0 0;
    font-family: var(--font-prose);
  }

  /* ── Preview rendered HTML ───────────────────── */
  .preview-html :global(h1) {
    font-family: var(--font-serif);
    font-weight: 400;
    font-size: 44px;
    line-height: 1.04;
    letter-spacing: -0.025em;
    margin: 0 0 16px;
  }
  .preview-html :global(h1 em) {
    font-style: italic;
  }
  .preview-html :global(h2) {
    font-family: var(--font-serif);
    font-weight: 400;
    font-size: 26px;
    line-height: 1.15;
    letter-spacing: -0.015em;
    margin: 32px 0 12px;
  }
  .preview-html :global(h2 em) {
    font-style: italic;
  }
  .preview-html :global(h3) {
    font-family: var(--font-serif);
    font-size: 18px;
    margin: 20px 0 8px;
  }
  .preview-html :global(p) {
    font-family: var(--font-prose);
    font-size: 16px;
    line-height: 1.7;
    color: var(--text-primary);
    margin: 0 0 18px;
  }
  .preview-html :global(strong) {
    color: var(--text-primary);
    font-weight: 700;
  }
  .preview-html :global(blockquote) {
    border-left: 2px solid var(--text-primary);
    padding-left: 20px;
    margin: 20px 0;
    font-family: var(--font-serif);
    font-style: italic;
    color: var(--text-secondary);
    font-size: 17px;
    line-height: 1.5;
  }
  .preview-html :global(pre) {
    background: var(--text-primary);
    color: var(--bg);
    padding: 16px 20px;
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: 13px;
    line-height: 1.6;
    margin: 20px 0;
    overflow-x: auto;
  }
  .preview-html :global(code) {
    font-family: var(--font-mono);
    font-size: 0.88em;
    background: rgba(0, 0, 0, 0.05);
    padding: 2px 6px;
    border-radius: var(--radius-xs);
  }
  .preview-html :global(pre code) {
    background: none;
    padding: 0;
  }
  .preview-html :global(ul),
  .preview-html :global(ol) {
    padding-left: 1.25em;
    margin: 0 0 16px;
    font-family: var(--font-prose);
    font-size: 16px;
    line-height: 1.7;
  }

  /* ── Actions bar ─────────────────────────────── */
  .actions {
    margin-top: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .actions-left {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .actions-right {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .btn-publish {
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 600;
    padding: 10px 28px;
    background: var(--accent);
    color: var(--bg);
    border: none;
    border-radius: var(--radius-pill);
    cursor: pointer;
    transition: background var(--ease-fast);
    box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.2);
  }
  .btn-publish:hover {
    background: var(--accent-hover);
  }
  .btn-publish:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .note {
    font-size: 12px;
    color: var(--text-tertiary);
    font-family: var(--font-mono);
  }
  .size-warn {
    font-size: 12px;
    color: var(--error);
    font-family: var(--font-mono);
  }

  /* ── Published success modal ─────────────────── */
  .modal-bg {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(26, 25, 23, 0.4);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal {
    background: var(--surface);
    border-radius: 18px;
    padding: 40px;
    max-width: 480px;
    width: calc(100% - 40px);
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
    text-align: center;
  }

  .success-mark {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--success);
    color: white;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    margin-bottom: 20px;
  }

  .modal h2 {
    font-family: var(--font-serif);
    font-weight: 400;
    font-size: 36px;
    letter-spacing: -0.02em;
    margin: 0 0 8px;
    color: var(--text-primary);
  }

  .modal-sub {
    font-family: var(--font-prose);
    font-style: italic;
    font-size: 15px;
    color: var(--text-secondary);
    margin: 0 0 28px;
  }

  .url-box {
    background: var(--text-primary);
    color: var(--bg);
    padding: 14px 18px;
    border-radius: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: var(--font-mono);
    font-size: 14px;
    margin-bottom: 20px;
  }
  .url-box .url {
    color: #95e0a1;
    word-break: break-all;
  }
  .url-box button {
    background: rgba(237, 234, 229, 0.1);
    color: var(--bg);
    border: none;
    border-radius: var(--radius-sm);
    padding: 5px 11px;
    font-family: var(--font-mono);
    font-size: 11px;
    cursor: pointer;
    flex-shrink: 0;
    margin-left: 12px;
  }
  .url-box button:hover {
    background: rgba(237, 234, 229, 0.2);
  }

  .modal-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
  }

  .btn {
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 500;
    padding: 8px 14px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all var(--ease-fast);
    text-decoration: none;
  }
  .btn:hover {
    color: var(--text-primary);
    background: var(--surface-hover);
    border-color: var(--border-hover);
  }
  .btn.primary {
    background: var(--text-primary);
    color: var(--bg);
    border-color: var(--text-primary);
    padding: 8px 18px;
    font-weight: 600;
    box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.2);
  }
  .btn.primary:hover {
    background: var(--accent-hover);
    color: var(--bg);
    border-color: var(--accent-hover);
  }

  /* ── Responsive: stack panes on narrow screens ── */
  @media (max-width: 768px) {
    .split-editor {
      grid-template-columns: 1fr;
      min-height: auto;
    }

    .pane-left {
      border-radius: 14px 14px 0 0;
    }
    .pane-right {
      border-radius: 0 0 14px 14px;
      border-left: none;
      border-top: 1px solid var(--border);
    }

    .md-editor {
      min-height: 300px;
    }

    .preview-body {
      max-height: 50vh;
      padding: 24px 28px;
    }

    .new-inner {
      max-width: 100%;
    }

    .page-header {
      flex-wrap: wrap;
      gap: 12px;
    }
  }
</style>
