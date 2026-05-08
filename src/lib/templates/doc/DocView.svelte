<script lang="ts">
  import { tick } from 'svelte';
  import { get } from 'svelte/store';
  import { browser } from '$app/environment';
  import type { Comment } from '$lib/types';
  import {
    closeDocCommentsPanel,
    docCommentsPanelBlockId,
    docCommentsPanelOpen,
  } from '$lib/stores';

  /** Matches Reader_Doc.html thread / comment icon */
  const COMMENT_THREAD_SVG = `<svg class="bcb-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;

  interface Props {
    html: string;
    title?: string | null;
    comments?: Comment[];
    pageId?: string;
  }
  let { html, title = null, comments = $bindable([]), pageId = '' }: Props = $props();

  type EnhanceParams = { html: string; pageId: string };

  let docEnhanceOpts = $derived.by(
    (): EnhanceParams => ({
      html,
      pageId,
    })
  );

  let showTitle = $derived(title && !html.trimStart().startsWith('<h1'));

  function blockComments(blockId: string): Comment[] {
    return comments.filter((c) => {
      if (!c.anchor) return false;
      try {
        const a = typeof c.anchor === 'string' ? JSON.parse(c.anchor) : c.anchor;
        return a?.type === 'block' && a?.block_id === blockId;
      } catch {
        return false;
      }
    });
  }

  function commentCount(blockId: string): number {
    return blockComments(blockId).length;
  }

  function applyBcbState(btn: HTMLElement, blockId: string) {
    const thread = blockComments(blockId);
    const cnt = thread.length;
    const wrap = btn.closest('.block-el');
    const allResolved = cnt > 0 && thread.every((c) => c.resolved !== 0);
    if (cnt > 0) {
      btn.classList.add('has-comments');
      wrap?.classList.add('block-el-commented');
      wrap?.classList.toggle('block-el-resolved', allResolved);
      btn.classList.toggle('bcb-all-resolved', allResolved);
      const n = btn.querySelector('.bcb-cnt');
      if (n) n.textContent = String(cnt);
      else btn.innerHTML = `${COMMENT_THREAD_SVG}<span class="bcb-cnt">${cnt}</span>`;
      btn.title = allResolved ? 'All comments resolved on this block' : 'Comments on this block';
    } else {
      btn.classList.remove('has-comments', 'bcb-all-resolved');
      wrap?.classList.remove('block-el-commented', 'block-el-resolved');
      btn.replaceChildren();
      btn.title = 'Comments on this block';
    }
  }

  function syncBlockHighlight() {
    if (typeof document === 'undefined') return;
    document
      .querySelectorAll('.block-el.block-active')
      .forEach((el) => el.classList.remove('block-active'));
    const open = get(docCommentsPanelOpen);
    const id = get(docCommentsPanelBlockId);
    if (open && id) document.getElementById(id)?.classList.add('block-active');
  }

  $effect(() => {
    if (!browser) return;
    const u1 = docCommentsPanelBlockId.subscribe(syncBlockHighlight);
    const u2 = docCommentsPanelOpen.subscribe(syncBlockHighlight);
    syncBlockHighlight();
    return () => {
      u1();
      u2();
    };
  });

  // Keep gutter buttons in sync when `comments` updates (e.g. after post)
  $effect(() => {
    comments;
    if (!browser) return;
    void tick().then(() => {
      document.querySelectorAll<HTMLElement>('.bcb[data-for-block]').forEach((btn) => {
        const id = btn.getAttribute('data-for-block');
        if (id) applyBcbState(btn, id);
      });
    });
  });

  function sameEnhanceParams(a: EnhanceParams, b: EnhanceParams) {
    return a.html === b.html && a.pageId === b.pageId;
  }

  function stripDocEnhancements(node: HTMLElement) {
    node.querySelectorAll('.bcb').forEach((b) => b.remove());
    node.querySelectorAll('pre').forEach((pre) => {
      pre.querySelector('.code-lang')?.remove();
      pre.querySelector('.code-copy')?.remove();
    });
    node.querySelectorAll('.block-el').forEach((el) => {
      el.classList.remove('block-el', 'block-el-commented', 'block-el-resolved', 'block-active');
    });
  }

  function applyDocEnhancements(node: HTMLElement, o: EnhanceParams) {
    stripDocEnhancements(node);

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

    if (o.pageId) {
      let blockIdx = 0;
      Array.from(node.children).forEach((child) => {
        const el = child as HTMLElement;
        const blockId = el.id || `block-${blockIdx}`;
        if (!el.id) el.id = blockId;
        el.classList.add('block-el');
        el.setAttribute('data-block-id', blockId);

        const cbtn = document.createElement('button');
        cbtn.type = 'button';
        cbtn.className = 'bcb';
        cbtn.setAttribute('data-for-block', blockId);
        cbtn.title = 'Comment on this block';
        applyBcbState(cbtn, blockId);
        cbtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const cur = get(docCommentsPanelBlockId);
          const open = get(docCommentsPanelOpen);
          if (open && cur === blockId) {
            closeDocCommentsPanel();
            return;
          }
          docCommentsPanelBlockId.set(blockId);
          docCommentsPanelOpen.set(true);
        });
        el.appendChild(cbtn);
        blockIdx++;
      });
    }
  }

  function enhanceDoc(node: HTMLElement, opts: EnhanceParams) {
    let last: EnhanceParams | null = null;

    function apply(o: EnhanceParams) {
      applyDocEnhancements(node, o);
      last = { html: o.html, pageId: o.pageId };
    }

    apply(opts);

    return {
      update(o: EnhanceParams) {
        if (last && sameEnhanceParams(o, last)) return;
        apply(o);
      },
      destroy() {
        stripDocEnhancements(node);
      },
    };
  }
</script>

<div class="doc-wrap">
  <article class="doc-view prose dark:prose-invert max-w-[680px]" use:enhanceDoc={docEnhanceOpts}>
    {#if showTitle}
      <h1 class="doc-title">{title}</h1>
    {/if}
    {@html html}
  </article>
</div>

<style>
  .doc-wrap {
    position: relative;
    overflow-x: visible;
  }

  /* ── Block + gutter comment control (Reader_Doc.html: pill + icon + count, left rail when commented) ── */
  article.doc-view {
    overflow-x: visible;
  }

  article.doc-view :global(.block-el) {
    position: relative;
    border-radius: 6px;
    scroll-margin-top: 5.5rem;
    transition:
      background 0.15s,
      border-color 0.2s,
      padding 0.15s,
      margin 0.15s;
  }

  article.doc-view :global(.block-el:hover) {
    background: rgba(0, 0, 0, 0.015);
  }

  :global(.dark) article.doc-view :global(.block-el:hover) {
    background: rgba(255, 255, 255, 0.04);
  }

  article.doc-view :global(.block-el.block-el-commented) {
    padding-left: 14px;
    margin-left: -14px;
    border-left: 2px solid color-mix(in srgb, var(--text-primary) 30%, transparent);
    border-radius: 0 6px 6px 0;
  }

  article.doc-view :global(.block-el.block-el-commented.block-active) {
    border-left-color: var(--text-primary);
    background: color-mix(in srgb, var(--text-primary) 4%, transparent);
  }

  :global(.dark) article.doc-view :global(.block-el.block-el-commented.block-active) {
    background: color-mix(in srgb, var(--text-primary) 8%, transparent);
  }

  /* Reader_Doc.html — .block.commented.resolved + green gutter button */
  article.doc-view :global(.block-el.block-el-commented.block-el-resolved) {
    border-left-color: rgba(34, 197, 94, 0.4);
  }

  article.doc-view :global(.block-el.block-el-commented.block-el-resolved.block-active) {
    border-left-color: rgba(34, 197, 94, 0.65);
  }

  article.doc-view :global(.bcb.has-comments.bcb-all-resolved) {
    color: #15803d;
    border-color: rgba(34, 197, 94, 0.35);
  }

  article.doc-view :global(.bcb.has-comments.bcb-all-resolved .bcb-cnt) {
    opacity: 0.88;
    color: inherit;
  }

  article.doc-view :global(.bcb.has-comments.bcb-all-resolved:hover) {
    color: #166534;
    border-color: rgba(22, 101, 52, 0.45);
    background: color-mix(in srgb, #15803d 6%, var(--bg));
  }

  :global(.dark) article.doc-view :global(.bcb.has-comments.bcb-all-resolved) {
    color: #86efac;
    border-color: rgba(134, 239, 172, 0.35);
  }

  :global(.dark) article.doc-view :global(.bcb.has-comments.bcb-all-resolved:hover) {
    color: #bbf7d0;
    border-color: rgba(187, 247, 208, 0.45);
    background: color-mix(in srgb, #86efac 8%, transparent);
  }

  article.doc-view :global(.block-el.block-active > .bcb.has-comments.bcb-all-resolved) {
    border-color: rgba(34, 197, 94, 0.55);
    color: #15803d;
  }

  :global(.dark)
    article.doc-view
    :global(.block-el.block-active > .bcb.has-comments.bcb-all-resolved) {
    color: #86efac;
    border-color: rgba(134, 239, 172, 0.5);
  }

  article.doc-view :global(.block-el.block-active:not(.block-el-commented)) {
    background: rgba(26, 25, 23, 0.04);
    border-left: 2px solid var(--text-primary);
    padding-left: 14px;
    margin-left: -14px;
    border-radius: 0 6px 6px 0;
  }

  :global(.dark) article.doc-view :global(.block-el.block-active:not(.block-el-commented)) {
    background: rgba(255, 255, 255, 0.06);
  }

  article.doc-view :global(.bcb) {
    position: absolute;
    left: calc(100% + 12px);
    top: 2px;
    transform: none;
    z-index: 2;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    line-height: 1;
    opacity: 0;
    transition:
      opacity 120ms ease,
      color 0.15s,
      border-color 0.15s,
      background 0.15s;
    /* no-comments: icon-only, transparent until hover / active block */
    width: 26px;
    height: 26px;
    min-width: 26px;
    padding: 0;
    border-radius: 999px;
    border: 1px solid transparent;
    background: transparent;
    box-shadow: none;
    color: var(--text-tertiary);
    font-family: var(--font-sans);
    font-style: normal;
    font-weight: 500;
    font-size: 15px;
  }

  article.doc-view :global(.bcb:not(.has-comments)::before) {
    content: '+';
  }

  article.doc-view :global(.bcb.has-comments) {
    width: auto;
    min-width: auto;
    height: 28px;
    padding: 0 10px 0 8px;
    border-radius: 999px;
    background: var(--surface);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-card);
    color: var(--text-secondary);
    font-family: var(--font-sans);
    font-style: normal;
    font-size: 11px;
    font-weight: 500;
    opacity: 1;
  }

  article.doc-view :global(.bcb.has-comments .bcb-svg) {
    flex-shrink: 0;
    display: block;
  }

  article.doc-view :global(.bcb.has-comments .bcb-cnt) {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    opacity: 0.55;
  }

  article.doc-view :global(.block-el:hover > .bcb),
  article.doc-view :global(.block-el.block-active > .bcb),
  article.doc-view :global(.bcb.has-comments) {
    opacity: 1;
  }

  /* No-comments: plain + on block hover (Reader_Doc .block:not(.commented) button); white pill only on button:hover */
  article.doc-view :global(.bcb:not(.has-comments):hover) {
    background: var(--surface);
    border-color: var(--border);
    color: var(--text-primary);
    box-shadow: var(--shadow-card);
  }

  article.doc-view :global(.bcb.has-comments:hover) {
    color: var(--text-primary);
    border-color: var(--text-primary);
    background: var(--bg);
  }

  article.doc-view :global(.block-el.block-active > .bcb.has-comments) {
    border-color: var(--text-primary);
    color: var(--text-primary);
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

  @media (max-width: 900px) {
    article.doc-view :global(.bcb) {
      left: auto;
      right: 0;
      top: -30px;
    }

    article.doc-view :global(.block-el.block-el-commented) {
      padding-left: 0;
      margin-left: 0;
      border-left: none;
      background: rgba(0, 0, 0, 0.03);
      border-radius: 6px;
      padding: 4px 10px;
      margin: 0 -10px 22px -10px;
    }

    :global(.dark) article.doc-view :global(.block-el.block-el-commented) {
      background: rgba(255, 255, 255, 0.04);
    }

    article.doc-view :global(.block-el.block-active:not(.block-el-commented)) {
      margin-left: 0;
      padding-left: 10px;
    }

    article.doc-view :global(.block-el.block-el-commented.block-active) {
      border-left: none;
      padding-left: 10px;
    }
  }

  @media print {
    article.doc-view :global(.bcb) {
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
    display: flex;
    flex-direction: column;
    gap: 0.65em;
    padding: 14px 16px 14px 24px;
    border-left: 2px solid var(--text-primary);
    font-style: italic;
    color: var(--text-secondary);
    font-family: var(--font-serif);
    quotes: none;
  }

  article.doc-view :global(blockquote::before),
  article.doc-view :global(blockquote::after) {
    content: none;
  }

  article.doc-view :global(blockquote > *) {
    margin: 0;
  }

  article.doc-view :global(:not(pre) > code) {
    font-family: var(--font-mono);
    font-size: 0.88em;
    background: rgba(0, 0, 0, 0.05);
    padding: 2px 6px;
    border-radius: 4px;
  }

  /* Layout for all code blocks; Shiki uses github-dark (see renderMarkdown). */
  article.doc-view :global(pre) {
    position: relative;
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
