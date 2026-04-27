<script lang="ts">
  import type { Comment } from '$lib/types';

  interface Props {
    html: string;
    title?: string | null;
    comments?: Comment[];
    pageId?: string;
  }
  let { html, title = null, comments = [], pageId = '' }: Props = $props();

  let showTitle = $derived(title && !html.trimStart().startsWith('<h1'));

  // Block comment state
  let activeBlockId = $state<string | null>(null);
  let commentName = $state('');
  let commentBody = $state('');
  let commentPosting = $state(false);

  function blockComments(blockId: string): Comment[] {
    return comments.filter((c) => {
      if (!c.anchor) return false;
      try {
        const a = typeof c.anchor === 'string' ? JSON.parse(c.anchor) : c.anchor;
        return a.block_id === blockId;
      } catch {
        return false;
      }
    });
  }

  function commentCount(blockId: string): number {
    return blockComments(blockId).length;
  }

  async function postComment() {
    if (!commentBody.trim() || !pageId || !activeBlockId) return;
    commentPosting = true;
    try {
      const res = await fetch(`/api/comment/${pageId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: commentBody.trim(),
          display_name: commentName.trim() || undefined,
          anchor: { type: 'block', block_id: activeBlockId },
          anchor_hint: activeBlockId,
        }),
      });
      if (res.ok) {
        commentBody = '';
        window.location.reload();
      }
    } catch {}
    commentPosting = false;
  }

  function timeAgo(dateStr: string): string {
    const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
  }

  function enhanceDoc(node: HTMLElement) {
    // Code block enhancements
    node.querySelectorAll('pre').forEach((pre) => {
      pre.style.position = 'relative';
      const code = pre.querySelector('code');
      const langClass = code?.className.match(/language-(\w+)/);
      const lang = langClass?.[1] ?? pre.getAttribute('data-language');
      if (lang) {
        const label = document.createElement('span');
        label.className = 'code-lang';
        label.textContent = lang;
        pre.appendChild(label);
      }
      const btn = document.createElement('button');
      btn.className = 'code-copy';
      btn.textContent = 'Copy';
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(code?.textContent ?? pre.textContent ?? '').then(() => {
          btn.textContent = 'Copied!';
          setTimeout(() => {
            btn.textContent = 'Copy';
          }, 2000);
        });
      });
      pre.appendChild(btn);
    });

    // Block comment buttons
    if (pageId) {
      let blockIdx = 0;
      Array.from(node.children).forEach((child) => {
        const el = child as HTMLElement;
        const blockId = el.id || `block-${blockIdx}`;
        if (!el.id) el.id = blockId;
        el.classList.add('block-el');
        el.setAttribute('data-block-id', blockId);

        const cbtn = document.createElement('button');
        cbtn.className = 'bcb';
        cbtn.setAttribute('data-for-block', blockId);
        const cnt = commentCount(blockId);
        if (cnt > 0) {
          cbtn.textContent = String(cnt);
          cbtn.classList.add('has-comments');
        }
        cbtn.addEventListener('click', (e) => {
          e.stopPropagation();
          activeBlockId = activeBlockId === blockId ? null : blockId;
        });
        el.appendChild(cbtn);
        blockIdx++;
      });
    }

    return { destroy() {} };
  }
</script>

<div class="doc-wrap">
  <article class="doc-view prose dark:prose-invert max-w-[680px]" use:enhanceDoc>
    {#if showTitle}
      <h1 class="doc-title">{title}</h1>
    {/if}
    {@html html}
  </article>

  <!-- Inline comment card (Google Docs style) -->
  {#if activeBlockId}
    <div
      class="comment-card"
      style="top: {(() => {
        const el = typeof document !== 'undefined' ? document.getElementById(activeBlockId) : null;
        return el ? `${el.offsetTop}px` : '100px';
      })()}"
    >
      {#each blockComments(activeBlockId) as c}
        <div class="cc-item">
          <span class="cc-author">{c.display_name ?? 'Anonymous'}</span>
          <span class="cc-time">{timeAgo(c.created)}</span>
          <p class="cc-body">{c.body}</p>
        </div>
      {/each}
      <div class="cc-form">
        <textarea
          class="cc-textarea"
          placeholder="Add a comment..."
          rows={2}
          bind:value={commentBody}
          onkeydown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postComment();
          }}
        ></textarea>
        <div class="cc-actions">
          <button class="cc-cancel" onclick={() => (activeBlockId = null)}>Cancel</button>
          <button
            class="cc-post"
            onclick={postComment}
            disabled={commentPosting || !commentBody.trim()}
          >
            {commentPosting ? '...' : 'Comment'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .doc-wrap {
    position: relative;
  }

  /* ── Block comment button (right margin) ── */
  article.doc-view :global(.block-el) {
    position: relative;
  }

  article.doc-view :global(.bcb) {
    position: absolute;
    right: -40px;
    top: 3px;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    cursor: pointer;
    opacity: 0;
    transition: opacity 100ms;
    border-radius: 3px;
    color: var(--text-tertiary);
    font-size: 10px;
    font-family: var(--font-mono);
    padding: 0;
  }

  article.doc-view :global(.bcb::before) {
    content: '';
    width: 12px;
    height: 10px;
    border: 1.2px solid currentColor;
    border-radius: 2px 2px 2px 0;
    display: block;
  }

  article.doc-view :global(.bcb.has-comments::before) {
    display: none;
  }

  article.doc-view :global(.bcb.has-comments) {
    opacity: 0.45;
    font-weight: 600;
    color: var(--accent);
    font-size: 9px;
  }

  article.doc-view :global(.block-el:hover > .bcb) {
    opacity: 0.35;
  }

  article.doc-view :global(.bcb:hover) {
    opacity: 0.8 !important;
  }

  /* ── Inline comment card ── */
  .comment-card {
    position: absolute;
    left: calc(100% + 24px);
    width: 240px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    padding: 10px;
    z-index: 20;
  }

  .cc-item {
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }

  .cc-item:last-of-type {
    border-bottom: none;
    margin-bottom: 8px;
    padding-bottom: 0;
  }

  .cc-author {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .cc-time {
    font-size: 10px;
    color: var(--text-tertiary);
    margin-left: 6px;
    font-family: var(--font-mono);
  }
  .cc-body {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 4px 0 0;
  }

  .cc-form {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .cc-textarea {
    width: 100%;
    padding: 6px 8px;
    font-size: 12px;
    font-family: var(--font-sans);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text-primary);
    outline: none;
    box-sizing: border-box;
    resize: none;
    line-height: 1.4;
  }
  .cc-textarea:focus {
    border-color: var(--border-hover);
  }

  .cc-actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }
  .cc-cancel {
    font-size: 12px;
    color: var(--text-tertiary);
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 8px;
  }
  .cc-cancel:hover {
    color: var(--text-primary);
  }
  .cc-post {
    font-size: 12px;
    font-weight: 500;
    color: white;
    background: var(--accent);
    border: none;
    border-radius: 6px;
    padding: 4px 12px;
    cursor: pointer;
  }
  .cc-post:disabled {
    opacity: 0.4;
    cursor: default;
  }

  @media (max-width: 900px) {
    .comment-card {
      left: auto;
      right: 0;
      width: calc(100vw - 48px);
      max-width: 300px;
    }
    article.doc-view :global(.bcb) {
      right: -8px;
      opacity: 0.3 !important;
    }
    article.doc-view :global(.bcb.has-comments) {
      opacity: 0.5 !important;
    }
  }

  @media print {
    article.doc-view :global(.bcb) {
      display: none !important;
    }
    .comment-card {
      display: none !important;
    }
  }

  /* ── Base article ── */
  article.doc-view {
    font-family: var(--font-prose, var(--font-sans));
    line-height: 1.8;
    --tw-prose-body: var(--text-primary);
    --tw-prose-headings: var(--text-primary);
    --tw-prose-links: var(--text-primary);
    --tw-prose-code: var(--text-primary);
    --tw-prose-quotes: var(--text-secondary);
    --tw-prose-quote-borders: var(--border);
  }

  .doc-title,
  article.doc-view :global(h1),
  article.doc-view :global(h2),
  article.doc-view :global(h3),
  article.doc-view :global(h4) {
    font-family: var(--font-serif, Georgia, serif);
  }

  article.doc-view :global(h1) {
    margin-top: 2em;
    margin-bottom: 0.6em;
  }
  article.doc-view :global(h2) {
    margin-top: 1.8em;
    margin-bottom: 0.5em;
  }
  article.doc-view :global(h3) {
    margin-top: 1.5em;
    margin-bottom: 0.4em;
  }

  article.doc-view :global(a) {
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-thickness: 1px;
    text-decoration-color: var(--border);
    transition: text-decoration-color 0.15s;
  }
  article.doc-view :global(a:hover) {
    text-decoration-color: currentColor;
  }
  article.doc-view :global(strong) {
    color: var(--text-primary);
    font-weight: 700;
  }
  article.doc-view :global(blockquote) {
    border-left: 3px solid var(--border);
    padding-left: 1em;
    font-style: italic;
    color: var(--text-secondary);
  }
  article.doc-view :global(:not(pre) > code) {
    background: color-mix(in srgb, var(--text-primary) 8%, transparent);
    border-radius: 4px;
    padding: 0.15em 0.35em;
    font-size: 0.875em;
  }

  article.doc-view :global(pre) {
    position: relative;
    background: #1a1a2e;
    border-radius: 8px;
    padding: 1.25em 1.5em;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    font-size: 0.875em;
    line-height: 1.6;
  }
  article.doc-view :global(pre.shiki) {
    background: var(--shiki-light-bg, #fff) !important;
  }
  :global(.dark) article.doc-view :global(pre.shiki) {
    background: var(--shiki-dark-bg, #1a1a2e) !important;
  }
  article.doc-view :global(pre.shiki span) {
    color: var(--shiki-light) !important;
  }
  :global(.dark) article.doc-view :global(pre.shiki span) {
    color: var(--shiki-dark) !important;
  }
  article.doc-view :global(pre:not(.shiki)) {
    background: #1a1a2e;
    color: #e2e8f0;
  }
  article.doc-view :global(pre code) {
    background: transparent;
    padding: 0;
    border-radius: 0;
    font-size: inherit;
  }

  article.doc-view :global(.code-lang) {
    position: absolute;
    top: 0;
    right: 3em;
    padding: 0.15em 0.5em;
    font-size: 0.7em;
    font-family: var(--font-sans);
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    user-select: none;
    pointer-events: none;
  }
  article.doc-view :global(.code-copy) {
    position: absolute;
    top: 0.5em;
    right: 0.5em;
    padding: 0.2em 0.5em;
    font-size: 0.7em;
    font-family: var(--font-sans);
    color: #94a3b8;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    cursor: pointer;
    opacity: 0;
    transition:
      opacity 0.15s,
      background 0.15s;
  }
  article.doc-view :global(pre:hover .code-copy) {
    opacity: 1;
  }
  article.doc-view :global(.code-copy:hover) {
    background: rgba(255, 255, 255, 0.15);
    color: #e2e8f0;
  }

  article.doc-view :global(table) {
    display: block;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  article.doc-view :global(th),
  article.doc-view :global(td) {
    white-space: nowrap;
  }
  @media (min-width: 640px) {
    article.doc-view :global(th),
    article.doc-view :global(td) {
      white-space: normal;
    }
  }
  article.doc-view :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
  }
  article.doc-view :global(hr) {
    border-color: var(--border);
    margin: 2em 0;
  }
  article.doc-view :global(ul),
  article.doc-view :global(ol) {
    padding-left: 1.25em;
    list-style-position: outside;
  }
  article.doc-view :global(li) {
    padding-left: 0.25em;
  }
  article.doc-view :global(li + li) {
    margin-top: 0.25em;
  }
</style>
