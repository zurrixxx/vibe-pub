<script lang="ts">
  import type { Slide } from './parser';
  import type { Comment } from '$lib/types';

  interface Props {
    slides: Slide[];
    title?: string | null;
    comments?: Comment[];
    pageId?: string;
  }

  let { slides, title, comments = [], pageId = '' }: Props = $props();

  let current = $state(0);
  let direction = $state<'next' | 'prev'>('next');
  let transitioning = $state(false);

  function goTo(index: number) {
    if (index < 0 || index >= slides.length || index === current || transitioning) return;
    direction = index > current ? 'next' : 'prev';
    transitioning = true;
    setTimeout(() => {
      current = index;
      transitioning = false;
    }, 150);
  }

  function next() {
    goTo(current + 1);
  }
  function prev() {
    goTo(current - 1);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      prev();
    }
  }

  let progress = $derived(slides.length > 1 ? ((current + 1) / slides.length) * 100 : 100);

  // Block comment state
  let activeBlockId = $state<string | null>(null);
  let commentName = $state('');
  let commentBody = $state('');
  let commentPosting = $state(false);

  let currentBlockId = $derived(`slide-${current}`);

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
      const anchor = { type: 'block', block_type: 'slide', block_id: activeBlockId };
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

  // Close comment card when navigating slides
  $effect(() => {
    current; // track
    activeBlockId = null;
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="slides-container">
  <!-- Progress bar -->
  <div class="slides-progress">
    <div class="slides-progress-bar" style="width: {progress}%"></div>
  </div>

  <!-- Slide area -->
  <div class="slides-viewport">
    {#if slides.length > 0}
      <div class="slide-card" class:slide-fade-out={transitioning}>
        {#if pageId}
          <button
            class="slide-comment-btn"
            class:has-comments={commentCount(currentBlockId) > 0}
            onclick={() =>
              (activeBlockId = activeBlockId === currentBlockId ? null : currentBlockId)}
          >
            {commentCount(currentBlockId) > 0 ? commentCount(currentBlockId) : ''}
          </button>
        {/if}
        <div class="slide-content prose">
          {@html slides[current].html}
        </div>
        {#if activeBlockId === currentBlockId}
          <div class="comment-card">
            {#each blockComments(currentBlockId) as c}
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
    {:else}
      <div class="slides-empty">
        <p>No slides.</p>
      </div>
    {/if}
  </div>

  <!-- Navigation -->
  {#if slides.length > 1}
    <div class="slides-nav">
      <button
        class="slides-nav-btn"
        onclick={prev}
        disabled={current === 0}
        aria-label="Previous slide"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <span class="slides-counter">
        {current + 1} / {slides.length}
      </span>

      <button
        class="slides-nav-btn"
        onclick={next}
        disabled={current === slides.length - 1}
        aria-label="Next slide"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  {/if}
</div>

<style>
  .slides-container {
    display: flex;
    flex-direction: column;
    min-height: calc(100vh - 48px);
    width: 100%;
  }

  /* ── Progress bar ── */
  .slides-progress {
    position: fixed;
    top: 48px;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--border);
    z-index: 20;
  }

  .slides-progress-bar {
    height: 100%;
    background: var(--accent);
    transition: width 300ms ease;
  }

  /* ── Viewport ── */
  .slides-viewport {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
  }

  .slide-card {
    background: var(--surface);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-elevated);
    padding: 48px 56px;
    max-width: 800px;
    width: 100%;
    opacity: 1;
    transition: opacity 150ms ease;
    position: relative;
  }

  .slide-card.slide-fade-out {
    opacity: 0;
  }

  .slide-content {
    max-width: none;
  }

  .slide-content :global(h1) {
    font-family: var(--font-serif);
    font-size: 36px;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin-top: 0;
  }

  .slide-content :global(h2) {
    font-family: var(--font-serif);
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin-top: 0;
  }

  .slide-content :global(h3) {
    font-family: var(--font-serif);
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin-top: 0;
  }

  .slide-content :global(p) {
    font-family: var(--font-prose);
    font-size: 18px;
    line-height: 1.75;
    color: var(--text-secondary);
  }

  .slide-content :global(ul),
  .slide-content :global(ol) {
    font-family: var(--font-prose);
    font-size: 18px;
    line-height: 1.75;
    color: var(--text-secondary);
  }

  .slide-content :global(li) {
    margin-bottom: 4px;
  }

  .slide-content :global(code):not(:global(pre) :global(code)) {
    font-family: var(--font-mono);
    font-size: 0.875em;
    background: rgba(0, 0, 0, 0.05);
    padding: 2px 6px;
    border-radius: 4px;
  }

  :global(.dark) .slide-content :global(code):not(:global(pre) :global(code)) {
    background: rgba(255, 255, 255, 0.07);
  }

  .slide-content :global(pre) {
    font-family: var(--font-mono);
    font-size: 14px;
    line-height: 1.6;
    border-radius: var(--radius-md);
    padding: 20px 24px;
    background: var(--text-primary);
    color: var(--bg);
    overflow-x: auto;
    box-shadow: var(--shadow-card);
  }

  .slide-content :global(blockquote) {
    border-left: 2px solid var(--border);
    padding-left: 16px;
    color: var(--text-secondary);
    font-style: italic;
  }

  .slide-content :global(strong) {
    color: var(--text-primary);
    font-weight: 700;
  }

  .slide-content :global(a) {
    color: var(--text-primary);
    text-decoration: underline;
    text-underline-offset: 4px;
    text-decoration-color: var(--border);
    transition: text-decoration-color 150ms;
  }

  .slide-content :global(a):hover {
    text-decoration-color: var(--text-primary);
  }

  /* ── Slide comment button (top-left) ── */
  .slide-comment-btn {
    position: absolute;
    top: 12px;
    left: 12px;
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
    z-index: 5;
  }

  .slide-comment-btn::before {
    content: '';
    width: 12px;
    height: 10px;
    border: 1.2px solid currentColor;
    border-radius: 2px 2px 2px 0;
    display: block;
  }

  .slide-comment-btn.has-comments::before {
    display: none;
  }

  .slide-comment-btn.has-comments {
    opacity: 0.45;
    font-weight: 600;
    color: var(--accent);
    font-size: 9px;
  }

  .slide-card:hover .slide-comment-btn {
    opacity: 0.35;
  }

  .slide-comment-btn:hover {
    opacity: 0.8 !important;
  }

  /* ── Comment card (slides) ── */
  .comment-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-card);
    padding: 10px;
    margin-top: 16px;
    max-width: 320px;
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

  /* ── Empty state ── */
  .slides-empty {
    text-align: center;
    padding: 48px 24px;
    color: var(--text-tertiary);
    font-size: 14px;
    font-style: italic;
  }

  /* ── Navigation ── */
  .slides-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 16px 24px 32px;
  }

  .slides-nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 150ms ease;
  }

  .slides-nav-btn:hover:not(:disabled) {
    border-color: var(--border-hover);
    color: var(--text-primary);
    box-shadow: var(--shadow-card);
  }

  .slides-nav-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .slides-counter {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-tertiary);
    min-width: 60px;
    text-align: center;
  }

  /* ── Responsive ── */
  @media (max-width: 640px) {
    .slide-card {
      padding: 28px 24px;
    }

    .slide-content :global(h1) {
      font-size: 28px;
    }

    .slide-content :global(h2) {
      font-size: 22px;
    }

    .slide-content :global(p),
    .slide-content :global(ul),
    .slide-content :global(ol) {
      font-size: 16px;
    }

    .slides-viewport {
      padding: 32px 16px;
    }
  }

  /* ── Print ── */
  @media print {
    .slides-container {
      min-height: auto;
    }

    .slides-progress,
    .slides-nav,
    .slide-comment-btn,
    .comment-card {
      display: none !important;
    }
  }
</style>
