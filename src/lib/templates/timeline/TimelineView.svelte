<script lang="ts">
  import type { TimelineSection } from './parser';
  import type { Comment } from '$lib/types';

  interface Props {
    sections: TimelineSection[];
    title?: string | null;
    isOwner?: boolean;
    comments?: Comment[];
    pageId?: string;
  }

  let { sections, title, isOwner = false, comments = [], pageId = '' }: Props = $props();

  // Block comment state
  let activeBlockId = $state<string | null>(null);
  let commentName = $state('');
  let commentBody = $state('');
  let commentPosting = $state(false);

  function slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

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
      const anchor = { type: 'block', block_type: 'section', block_id: activeBlockId };
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
</script>

<div class="timeline">
  {#if title}
    <h1 class="timeline-title">{title}</h1>
  {/if}

  {#each sections as section, si}
    {@const blockId = slugify(section.title)}
    <div class="timeline-section" class:block-active={activeBlockId === blockId}>
      <h2 class="section-heading">
        {section.title}
        {#if pageId}
          <button
            class="block-comment-btn"
            class:has-comments={commentCount(blockId) > 0}
            onclick={() => (activeBlockId = activeBlockId === blockId ? null : blockId)}
          >
            {commentCount(blockId) > 0 ? commentCount(blockId) : ''}
          </button>
        {/if}
      </h2>

      {#if activeBlockId === blockId}
        <div class="comment-card">
          {#each blockComments(blockId) as c}
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

      <div class="section-body">
        {#each section.periods as period, pi}
          <div class="period-row">
            <div class="period-label">
              <span class="period-title">{period.title}</span>
            </div>

            <div class="period-spine">
              <span class="spine-dot"></span>
              {#if !(si === sections.length - 1 && pi === section.periods.length - 1)}
                <span class="spine-line"></span>
              {/if}
            </div>

            <div class="period-events">
              {#each period.events as event}
                <div class="event">
                  <span class="event-text">{event.text}</span>
                  {#if event.detail}
                    <span class="event-detail">{event.detail}</span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>

    {#if si < sections.length - 1}
      <div class="section-separator"></div>
    {/if}
  {/each}

  {#if sections.length === 0}
    <div class="empty-state">
      <p>No timeline events yet.</p>
    </div>
  {/if}
</div>

<style>
  .timeline {
    max-width: 640px;
    margin: 0 auto;
  }

  .timeline-title {
    font-family: var(--font-serif);
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    margin: 0 0 36px;
  }

  .timeline-section {
    display: flex;
    flex-direction: column;
  }

  .section-heading {
    font-family: var(--font-serif);
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    margin: 0 0 24px;
    padding: 12px 20px;
    background: var(--surface);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-body {
    display: flex;
    flex-direction: column;
  }

  .period-row {
    display: grid;
    grid-template-columns: 120px 24px 1fr;
    gap: 0;
    min-height: 0;
  }

  .period-label {
    text-align: right;
    padding: 2px 12px 0 0;
  }

  .period-title {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .period-spine {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
  }

  .spine-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--text-primary);
    flex-shrink: 0;
    margin-top: 5px;
    z-index: 1;
  }

  .spine-line {
    width: 1.5px;
    flex: 1;
    background: var(--border);
    min-height: 16px;
  }

  .period-events {
    padding: 0 0 28px 12px;
  }

  .event {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 2px 0;
  }

  .event-text {
    font-family: var(--font-prose);
    font-size: 14px;
    line-height: 1.65;
    color: var(--text-primary);
  }

  .event-detail {
    font-family: var(--font-prose);
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-tertiary);
  }

  .section-separator {
    height: 1px;
    margin: 12px 0 28px;
    background: var(--border);
  }

  .empty-state {
    text-align: center;
    padding: 48px 24px;
    color: var(--text-tertiary);
    font-size: 14px;
    font-style: italic;
  }

  /* ── Block comment button ── */
  .block-comment-btn {
    margin-left: auto;
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

  .block-comment-btn::before {
    content: '';
    width: 12px;
    height: 10px;
    border: 1.2px solid currentColor;
    border-radius: 2px 2px 2px 0;
    display: block;
  }

  .block-comment-btn.has-comments::before {
    display: none;
  }

  .block-comment-btn.has-comments {
    opacity: 0.45;
    font-weight: 600;
    color: var(--accent);
    font-size: 9px;
  }

  .section-heading:hover .block-comment-btn {
    opacity: 0.35;
  }

  .block-comment-btn:hover {
    opacity: 0.8 !important;
  }

  /* Active block highlight */
  .timeline-section.block-active .section-heading {
    border-left: 2px solid color-mix(in srgb, var(--accent) 10%, transparent);
  }

  /* ── Comment card ── */
  .comment-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-card);
    padding: 10px;
    margin-bottom: 16px;
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

  @media (max-width: 640px) {
    .timeline {
      max-width: 100%;
    }

    .period-row {
      grid-template-columns: 1fr;
      gap: 0;
    }

    .period-label {
      text-align: left;
      padding: 0 0 4px 0;
    }

    .period-spine {
      display: none;
    }

    .period-events {
      padding: 0 0 20px 0;
      border-left: 1.5px solid var(--border);
      margin-left: 4px;
      padding-left: 16px;
    }

    .section-heading {
      font-size: 18px;
      padding: 10px 16px;
    }

    .block-comment-btn {
      opacity: 0.3 !important;
    }
    .block-comment-btn.has-comments {
      opacity: 0.5 !important;
    }
  }

  @media print {
    .block-comment-btn,
    .comment-card {
      display: none !important;
    }
  }
</style>
