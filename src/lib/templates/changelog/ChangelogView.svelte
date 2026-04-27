<script lang="ts">
  import type { ChangelogRelease } from './parser';
  import type { Comment } from '$lib/types';

  interface Props {
    releases: ChangelogRelease[];
    title?: string | null;
    isOwner?: boolean;
    comments?: Comment[];
    pageId?: string;
  }

  let { releases, title, isOwner = false, comments = [], pageId = '' }: Props = $props();

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
      const anchor = { type: 'block', block_type: 'release', block_id: activeBlockId };
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

  const categoryColors: Record<string, { bg: string; text: string }> = {
    Added: { bg: 'var(--changelog-added-bg)', text: 'var(--changelog-added-text)' },
    Changed: { bg: 'var(--changelog-changed-bg)', text: 'var(--changelog-changed-text)' },
    Fixed: { bg: 'var(--changelog-fixed-bg)', text: 'var(--changelog-fixed-text)' },
    Removed: { bg: 'var(--changelog-removed-bg)', text: 'var(--changelog-removed-text)' },
    Deprecated: { bg: 'var(--changelog-deprecated-bg)', text: 'var(--changelog-deprecated-text)' },
    Security: { bg: 'var(--changelog-security-bg)', text: 'var(--changelog-security-text)' },
  };

  function getCategoryStyle(name: string): { bg: string; text: string } {
    return categoryColors[name] || { bg: 'var(--surface-hover)', text: 'var(--text-secondary)' };
  }
</script>

<div class="changelog">
  {#if title}
    <h1 class="changelog-title">{title}</h1>
  {/if}

  <div class="releases">
    {#each releases as release, i}
      <article class="release-card" class:block-active={activeBlockId === release.version}>
        <header class="release-header">
          <span class="release-version">{release.version}</span>
          {#if release.date}
            <span class="release-date">{release.date}</span>
          {/if}
          {#if pageId}
            <button
              class="block-comment-btn"
              class:has-comments={commentCount(release.version) > 0}
              onclick={() =>
                (activeBlockId = activeBlockId === release.version ? null : release.version)}
            >
              {commentCount(release.version) > 0 ? commentCount(release.version) : ''}
            </button>
          {/if}
        </header>

        {#if activeBlockId === release.version}
          <div class="comment-card">
            {#each blockComments(release.version) as c}
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

        <div class="release-body">
          {#each release.categories as category}
            <section class="category">
              <h3 class="category-name">
                <span
                  class="category-pill"
                  style="background: {getCategoryStyle(category.name).bg}; color: {getCategoryStyle(
                    category.name
                  ).text};">{category.name}</span
                >
              </h3>
              <ul class="entry-list">
                {#each category.entries as entry}
                  <li class="entry">{entry.text}</li>
                {/each}
              </ul>
            </section>
          {/each}
        </div>
      </article>

      {#if i < releases.length - 1}
        <div class="release-separator"></div>
      {/if}
    {/each}
  </div>

  {#if releases.length === 0}
    <div class="empty-state">
      <p>No releases yet.</p>
    </div>
  {/if}
</div>

<style>
  .changelog {
    --changelog-added-bg: rgba(34, 197, 94, 0.12);
    --changelog-added-text: #16a34a;
    --changelog-changed-bg: rgba(59, 130, 246, 0.12);
    --changelog-changed-text: #2563eb;
    --changelog-fixed-bg: rgba(245, 158, 11, 0.12);
    --changelog-fixed-text: #d97706;
    --changelog-removed-bg: rgba(239, 68, 68, 0.12);
    --changelog-removed-text: #dc2626;
    --changelog-deprecated-bg: rgba(107, 114, 128, 0.12);
    --changelog-deprecated-text: #6b7280;
    --changelog-security-bg: rgba(139, 92, 246, 0.12);
    --changelog-security-text: #7c3aed;

    max-width: 640px;
    margin: 0 auto;
  }

  :global(.dark) .changelog {
    --changelog-added-text: #4ade80;
    --changelog-changed-text: #60a5fa;
    --changelog-fixed-text: #fbbf24;
    --changelog-removed-text: #f87171;
    --changelog-deprecated-text: #9ca3af;
    --changelog-security-text: #a78bfa;
  }

  .changelog-title {
    font-family: var(--font-serif);
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    margin: 0 0 32px;
  }

  .releases {
    display: flex;
    flex-direction: column;
  }

  .release-card {
    background: var(--surface);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    padding: 28px 32px;
  }

  .release-header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border);
    position: relative;
  }

  .release-version {
    font-family: var(--font-mono);
    font-size: 20px;
    font-weight: 500;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  .release-date {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-tertiary);
  }

  .release-body {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .category {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .category-name {
    margin: 0;
    line-height: 1;
  }

  .category-pill {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 3px 10px;
    border-radius: var(--radius-pill);
  }

  .entry-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .entry {
    font-family: var(--font-prose);
    font-size: 14px;
    line-height: 1.65;
    color: var(--text-secondary);
    padding-left: 16px;
    position: relative;
  }

  .entry::before {
    content: '';
    position: absolute;
    left: 0;
    top: 10px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--text-tertiary);
  }

  .release-separator {
    height: 1px;
    margin: 24px 0;
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

  .release-header:hover .block-comment-btn {
    opacity: 0.35;
  }

  .block-comment-btn:hover {
    opacity: 0.8 !important;
  }

  /* Active block highlight */
  .release-card.block-active {
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
    .changelog {
      max-width: 100%;
    }

    .release-card {
      padding: 20px;
    }

    .release-version {
      font-size: 18px;
    }

    .release-header {
      flex-direction: column;
      gap: 4px;
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
