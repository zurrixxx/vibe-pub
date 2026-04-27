<script lang="ts">
  import { enhance } from '$app/forms';
  import { marked } from 'marked';
  import { detectView } from '$lib/templates/detect';

  interface Props {
    form: { url?: string; slug?: string; error?: string } | null;
  }
  let { form }: Props = $props();

  let dragging = $state(false);
  let copied = $state(false);
  let markdownInput = $state('');
  let activeTab = $state<'write' | 'preview'>('write');

  let detectedView = $derived(detectView(markdownInput));
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
    if (
      !file.name.endsWith('.md') &&
      !file.name.endsWith('.markdown') &&
      !file.name.endsWith('.txt') &&
      file.type !== 'text/plain' &&
      file.type !== 'text/markdown'
    )
      return;
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
    <h1 class="new-title">New page</h1>

    {#if form?.url}
      <div class="published">
        <span>Published:</span>
        <a href={`/${form.slug}`}>{form.url}</a>
        <button
          type="button"
          onclick={() => {
            navigator.clipboard.writeText(form.url);
            copied = true;
            setTimeout(() => (copied = false), 2000);
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    {/if}
    {#if form?.error}<p class="err">{form.error}</p>{/if}

    <form method="POST" action="?/publish" use:enhance>
      <div
        class="editor"
        class:dragging
        ondragover={(e) => {
          e.preventDefault();
          dragging = true;
        }}
        ondragleave={() => (dragging = false)}
        ondrop={onDrop}
      >
        <div class="editor-bar">
          <label class="upload"
            >Upload .md<input
              type="file"
              accept=".md,.markdown,.txt"
              onchange={onFileInput}
              hidden
            /></label
          >
          <div class="tabs">
            <button
              type="button"
              class:active={activeTab === 'write'}
              onclick={() => (activeTab = 'write')}>Write</button
            >
            <button
              type="button"
              class:active={activeTab === 'preview'}
              onclick={() => (activeTab = 'preview')}>Preview</button
            >
          </div>
        </div>

        {#if activeTab === 'write'}
          <textarea
            bind:value={markdownInput}
            name="markdown"
            rows={16}
            placeholder={dragging
              ? 'Drop .md here...'
              : '# Your title here\n\nWrite something worth sharing...'}
          ></textarea>
        {:else}
          <input type="hidden" name="markdown" value={markdownInput} />
          <div class="preview">
            {#if !markdownInput.trim()}<p class="preview-empty">
                Start writing to see a preview...
              </p>
            {:else if detectedView === 'kanban'}<span class="badge">kanban detected</span>
              <p class="badge-note">Kanban board will render after publishing.</p>
            {:else}<div class="preview-html">{@html previewHtml}</div>{/if}
          </div>
        {/if}
      </div>
      <div class="actions">
        <button type="submit" class="btn-publish">Publish</button>
        <span class="note">No signup required</span>
      </div>
    </form>
  </div>
</div>

<style>
  .new-page {
    min-height: calc(100vh - 56px);
    padding: 48px 32px 80px;
  }

  .new-inner {
    max-width: 720px;
    margin: 0 auto;
  }

  .new-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 32px;
    font-weight: 400;
    letter-spacing: -0.03em;
    color: var(--text-primary);
    margin: 0 0 28px;
  }

  .published {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 18px;
    margin-bottom: 20px;
    background: rgba(34, 197, 94, 0.06);
    border: 1px solid rgba(34, 197, 94, 0.15);
    border-radius: 10px;
    font-family: var(--font-mono);
    font-size: 13px;
  }
  .published span:first-child {
    color: var(--text-tertiary);
  }
  .published a {
    color: var(--text-primary);
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-color: rgba(34, 197, 94, 0.4);
    word-break: break-all;
  }
  .published button {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
    background: transparent;
    border: 1px solid rgba(34, 197, 94, 0.2);
    border-radius: 6px;
    padding: 2px 10px;
    cursor: pointer;
    margin-left: auto;
  }

  .err {
    font-family: var(--font-mono);
    font-size: 13px;
    color: #ef4444;
    margin: 0 0 12px;
  }

  .editor {
    background: var(--surface);
    border-radius: 12px;
    box-shadow: var(--shadow-elevated);
    overflow: hidden;
  }
  .editor.dragging {
    box-shadow:
      0 0 0 2px var(--accent),
      var(--shadow-elevated);
  }

  .editor-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border);
  }

  .upload {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 3px 10px;
    border-radius: 6px;
    border: 1px solid rgba(0, 0, 0, 0.12);
    user-select: none;
  }
  .upload:hover {
    color: var(--text-primary);
    border-color: rgba(0, 0, 0, 0.2);
  }

  .tabs {
    display: flex;
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
  }
  .tabs button {
    font-family: var(--font-mono);
    font-size: 11px;
    padding: 3px 10px;
    color: var(--text-tertiary);
    cursor: pointer;
    background: transparent;
    border: none;
  }
  .tabs button:hover {
    color: var(--text-secondary);
  }
  .tabs button.active {
    background: var(--bg);
    color: var(--text-secondary);
  }

  textarea {
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
  textarea::placeholder {
    color: var(--text-tertiary);
  }

  .preview {
    padding: 24px 28px;
    min-height: 300px;
    line-height: 1.8;
    font-family: var(--font-prose, var(--font-sans));
  }
  .preview-empty {
    color: var(--text-tertiary);
    font-style: italic;
    font-size: 14px;
    margin: 0;
  }
  .badge {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 11px;
    padding: 3px 10px;
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    border-radius: 6px;
  }
  .badge-note {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 8px 0 0;
  }

  .preview-html :global(h1) {
    font-family: var(--font-serif);
    font-size: 28px;
    margin: 0 0 16px;
  }
  .preview-html :global(h2) {
    font-family: var(--font-serif);
    font-size: 22px;
    margin: 24px 0 12px;
  }
  .preview-html :global(h3) {
    font-family: var(--font-serif);
    font-size: 18px;
    margin: 20px 0 8px;
  }
  .preview-html :global(p) {
    margin: 0 0 16px;
    font-size: 16px;
  }
  .preview-html :global(strong) {
    color: var(--text-primary);
    font-weight: 700;
  }
  .preview-html :global(pre) {
    background: #1a1a2e;
    color: #e2e8f0;
    padding: 16px;
    border-radius: 8px;
    font-size: 13px;
    margin: 0 0 16px;
    overflow-x: auto;
  }
  .preview-html :global(code) {
    font-family: var(--font-mono);
    font-size: 0.9em;
  }
  .preview-html :global(ul),
  .preview-html :global(ol) {
    padding-left: 1.25em;
    margin: 0 0 16px;
  }

  .actions {
    margin-top: 16px;
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .btn-publish {
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 500;
    padding: 10px 28px;
    background: var(--accent);
    color: var(--bg);
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }
  .btn-publish:hover {
    background: var(--accent-hover);
  }

  .note {
    font-size: 12px;
    color: var(--text-tertiary);
    font-family: var(--font-mono);
  }
</style>
