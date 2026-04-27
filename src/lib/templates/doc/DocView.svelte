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
      const anchor = { type: 'block', block_id: activeBlockId };
      const res = await fetch(`/api/comment/${pageId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: commentBody.trim(),
          display_name: commentName.trim() || undefined,
          anchor,
          anchor_hint: activeBlockId,
        }),
      });
      if (res.ok) {
        const saved = await res.json().catch(() => null);
        comments = [
          ...comments,
          {
            id: saved?.id ?? crypto.randomUUID(),
            page_id: pageId,
            user_id: null,
            display_name: commentName.trim() || null,
            anchor: JSON.stringify(anchor),
            anchor_hint: activeBlockId,
            body: commentBody.trim(),
            resolved: 0,
            created: new Date().toISOString(),
          },
        ];
        commentBody = '';
        // Update the button count for this block
        const btn = document.querySelector(`.bcb[data-for-block="${activeBlockId}"]`);
        if (btn) {
          const cnt = commentCount(activeBlockId);
          btn.textContent = String(cnt);
          btn.classList.add('has-comments');
        }
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

  // Track active block highlight
  $effect(() => {
    if (typeof document === 'undefined') return;
    document
      .querySelectorAll('.block-el.block-active')
      .forEach((el) => el.classList.remove('block-active'));
    if (activeBlockId) {
      document.getElementById(activeBlockId)?.classList.add('block-active');
    }
  });

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

  /* ── Block comment button (right margin, L3 design: 28px circle, serif italic glyph) ── */
  article.doc-view :global(.block-el) {
    position: relative;
    border-radius: 6px;
    transition: background 0.15s;
  }

  article.doc-view :global(.block-el:hover) {
    background: rgba(0, 0, 0, 0.015);
  }

  article.doc-view :global(.bcb) {
    position: absolute;
    right: -52px;
    top: 50%;
    transform: translateY(-50%);
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--surface);
    box-shadow: var(--shadow-card);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-serif);
    font-style: italic;
    font-size: 15px;
    color: var(--text-tertiary);
    opacity: 0;
    transition: opacity 0.15s;
    padding: 0;
  }

  /* Show "+" glyph by default, count when has comments */
  article.doc-view :global(.bcb::before) {
    content: '+';
  }

  article.doc-view :global(.bcb.has-comments::before) {
    content: none;
  }

  article.doc-view :global(.bcb.has-comments) {
    opacity: 0.45;
    font-weight: 600;
    color: var(--accent);
    font-family: var(--font-mono);
    font-style: normal;
    font-size: 10px;
  }

  article.doc-view :global(.block-el:hover > .bcb) {
    opacity: 1;
  }

  article.doc-view :global(.bcb:hover) {
    opacity: 1 !important;
    color: var(--text-primary);
    box-shadow: 0 0 0 1.5px var(--text-primary);
  }

  /* Active block highlight (L3: subtle background, no left-bar shift to avoid covering list numbers) */
  article.doc-view :global(.block-el.block-active) {
    background: rgba(26, 25, 23, 0.04);
    border-left: 3px solid var(--text-primary);
    padding-left: 12px;
  }

  /* Comment dot indicator on blocks with comments but not selected */
  article.doc-view :global(.block-el.has-block-comments:not(.block-active))::after {
    content: '';
    position: absolute;
    right: -28px;
    top: 10px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--text-primary);
  }

  /* Ensure pre/table don't clip the comment button */
  article.doc-view :global(pre.block-el),
  article.doc-view :global(table.block-el) {
    overflow: visible;
  }

  article.doc-view :global(pre.block-el > code) {
    display: block;
    overflow-x: auto;
  }

  /* ── Inline comment card (L3 design: surface bg, shadow-card, serif quote) ── */
  .comment-card {
    position: absolute;
    left: calc(100% + 32px);
    width: 280px;
    z-index: 20;
  }

  /* When inside a two-column grid layout, keep card from overlapping the rail */
  @media (max-width: 1199px) {
    .comment-card {
      left: auto;
      right: -20px;
    }
  }

  .cc-item {
    background: var(--surface);
    border-radius: 10px;
    padding: 12px 14px;
    margin-bottom: 8px;
    box-shadow: var(--shadow-card);
  }

  .cc-item:last-of-type {
    margin-bottom: 8px;
  }

  .cc-author {
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .cc-time {
    font-family: var(--font-mono);
    font-size: 10px;
    opacity: 0.5;
    margin-left: 6px;
  }
  .cc-body {
    font-family: var(--font-prose);
    font-size: 13px;
    line-height: 1.55;
    color: var(--text-secondary);
    margin: 8px 0 0;
    padding-top: 8px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }

  .cc-form {
    background: var(--surface);
    border-radius: 10px;
    padding: 10px 12px;
    box-shadow: var(--shadow-card);
    margin-top: 8px;
  }

  .cc-textarea {
    width: 100%;
    border: none;
    outline: none;
    resize: none;
    font-family: var(--font-prose);
    font-size: 13px;
    line-height: 1.55;
    color: var(--text-primary);
    background: transparent;
    min-height: 20px;
    box-sizing: border-box;
    padding: 0;
  }
  .cc-textarea::placeholder {
    color: var(--text-tertiary);
    font-style: italic;
  }

  .cc-actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
    align-items: center;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--border);
  }
  .cc-cancel {
    font-family: var(--font-mono);
    font-size: 10px;
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
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 600;
    padding: 5px 12px;
    border-radius: 999px;
    border: none;
    cursor: pointer;
    background: var(--text-primary);
    color: var(--bg);
  }
  .cc-post:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  @media (max-width: 639px) {
    .comment-card {
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

  /* ── Base article (L3 design system prose) ── */
  article.doc-view {
    font-family: var(--font-prose);
    font-size: 18px;
    line-height: 1.7;
    color: var(--text-primary);
    --tw-prose-body: var(--text-primary);
    --tw-prose-headings: var(--text-primary);
    --tw-prose-links: var(--text-primary);
    --tw-prose-code: var(--text-primary);
    --tw-prose-quotes: var(--text-secondary);
    --tw-prose-quote-borders: var(--text-primary);
  }

  article.doc-view :global(p) {
    margin: 0 0 22px;
  }

  .doc-title,
  article.doc-view :global(h1),
  article.doc-view :global(h2),
  article.doc-view :global(h3),
  article.doc-view :global(h4) {
    font-family: var(--font-serif);
  }

  article.doc-view :global(h1) {
    font-weight: 400;
    font-size: 40px;
    line-height: 1.1;
    letter-spacing: -0.025em;
    margin: 56px 0 20px;
  }

  article.doc-view :global(h2) {
    font-weight: 400;
    font-size: 32px;
    line-height: 1.15;
    letter-spacing: -0.015em;
    margin: 48px 0 16px;
  }

  article.doc-view :global(h3) {
    font-weight: 400;
    font-size: 24px;
    line-height: 1.2;
    letter-spacing: -0.01em;
    margin: 36px 0 12px;
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
    margin: 24px 0;
    padding: 8px 0 8px 24px;
    border-left: 2px solid var(--text-primary);
    font-style: italic;
    color: var(--text-secondary);
    font-family: var(--font-serif);
  }

  article.doc-view :global(:not(pre) > code) {
    font-family: var(--font-mono);
    font-size: 0.88em;
    background: rgba(0, 0, 0, 0.05);
    padding: 2px 6px;
    border-radius: 4px;
  }

  article.doc-view :global(pre) {
    position: relative;
    background: var(--text-primary);
    color: var(--bg);
    padding: 18px 22px;
    border-radius: 10px;
    font-family: var(--font-mono);
    font-size: 14px;
    line-height: 1.65;
    margin: 24px 0;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    border: none;
    box-shadow: none;
  }
  article.doc-view :global(pre.shiki) {
    background: var(--shiki-light-bg, var(--text-primary)) !important;
  }
  :global(.dark) article.doc-view :global(pre.shiki) {
    background: var(--shiki-dark-bg, var(--text-primary)) !important;
  }
  article.doc-view :global(pre.shiki span) {
    color: var(--shiki-light) !important;
  }
  :global(.dark) article.doc-view :global(pre.shiki span) {
    color: var(--shiki-dark) !important;
  }
  article.doc-view :global(pre:not(.shiki)) {
    background: var(--text-primary);
    color: var(--bg);
  }
  article.doc-view :global(pre code) {
    background: transparent;
    padding: 0;
    border-radius: 0;
    font-size: inherit;
    color: inherit;
  }

  article.doc-view :global(.code-lang) {
    position: absolute;
    top: 0;
    right: 3em;
    padding: 0.15em 0.5em;
    font-size: 0.7em;
    font-family: var(--font-sans);
    color: rgba(237, 234, 229, 0.5);
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
    color: rgba(237, 234, 229, 0.5);
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
    color: var(--bg);
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
