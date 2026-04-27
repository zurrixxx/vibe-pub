<script lang="ts">
  import type { DashboardSection } from './parser';
  import type { Comment } from '$lib/types';

  interface Props {
    sections: DashboardSection[];
    title?: string | null;
    comments?: Comment[];
    pageId?: string;
  }

  let { sections, title, comments = [], pageId = '' }: Props = $props();

  function isPositive(change: string): boolean {
    return change.trim().startsWith('+');
  }

  function isNegative(change: string): boolean {
    return change.trim().startsWith('-');
  }

  function slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

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

<div class="dashboard">
  {#if title}
    <h1 class="dashboard-title">{title}</h1>
  {/if}

  <div class="sections">
    {#each sections as section}
      {@const blockId = slugify(section.title)}
      {#if section.type === 'kpi' && section.table}
        <!-- KPI cards -->
        <section class="section" class:block-active={activeBlockId === blockId}>
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
          <div class="kpi-grid">
            {#each section.table.rows as row}
              {@const metricIdx = 0}
              {@const valueIdx = section.table.headers.findIndex(
                (h) => h.toLowerCase() === 'value'
              )}
              {@const changeIdx = section.table.headers.findIndex(
                (h) => h.toLowerCase() === 'change'
              )}
              <div class="kpi-card">
                <span class="kpi-value">{row[valueIdx] ?? ''}</span>
                <span class="kpi-label">{row[metricIdx] ?? ''}</span>
                {#if changeIdx >= 0 && row[changeIdx]}
                  <span
                    class="kpi-change"
                    class:positive={isPositive(row[changeIdx])}
                    class:negative={isNegative(row[changeIdx])}>{row[changeIdx]}</span
                  >
                {/if}
              </div>
            {/each}
          </div>
        </section>
      {:else if section.type === 'table' && section.table}
        <!-- Data table -->
        <section class="section" class:block-active={activeBlockId === blockId}>
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
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  {#each section.table.headers as header}
                    <th>{header}</th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#each section.table.rows as row, i}
                  <tr class:alt={i % 2 === 1}>
                    {#each row as cell}
                      <td>{cell}</td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </section>
      {:else if section.type === 'text' && section.text}
        <!-- Text/prose section -->
        <section class="section" class:block-active={activeBlockId === blockId}>
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
          <div class="text-card">
            <div class="text-content">{section.text}</div>
          </div>
        </section>
      {/if}
    {/each}
  </div>

  {#if sections.length === 0}
    <div class="empty-state">
      <p>No dashboard data yet.</p>
    </div>
  {/if}
</div>

<style>
  .dashboard {
    max-width: 820px;
    margin: 0 auto;
  }

  .dashboard-title {
    font-family: var(--font-serif);
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    margin: 0 0 32px;
  }

  .sections {
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  .section-heading {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-tertiary);
    margin: 0 0 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* ── KPI Cards ── */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
  }

  .kpi-card {
    background: var(--surface);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .kpi-value {
    font-family: var(--font-serif);
    font-size: 32px;
    font-weight: 400;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    line-height: 1.1;
  }

  .kpi-label {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text-secondary);
    line-height: 1.4;
  }

  .kpi-change {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 500;
    line-height: 1;
    margin-top: 4px;
    color: var(--text-tertiary);
  }

  .kpi-change.positive {
    color: var(--success);
  }

  .kpi-change.negative {
    color: var(--error);
  }

  /* ── Data Tables ── */
  .table-wrapper {
    background: var(--surface);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-sans);
    font-size: 14px;
  }

  .data-table th {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text-tertiary);
    text-align: left;
    padding: 12px 20px;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }

  .data-table td {
    padding: 10px 20px;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }

  .data-table tbody tr:last-child td {
    border-bottom: none;
  }

  .data-table tbody tr.alt {
    background: var(--surface-hover);
  }

  .data-table tbody tr:hover {
    background: var(--surface-hover);
  }

  /* ── Text Section ── */
  .text-card {
    background: var(--surface);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    padding: 20px 24px;
  }

  .text-content {
    font-family: var(--font-prose);
    font-size: 14px;
    line-height: 1.65;
    color: var(--text-secondary);
    white-space: pre-wrap;
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
  .section.block-active {
    border-left: 2px solid color-mix(in srgb, var(--accent) 10%, transparent);
    padding-left: 8px;
  }

  /* ── Comment card ── */
  .comment-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-card);
    padding: 10px;
    margin-bottom: 12px;
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
  .empty-state {
    text-align: center;
    padding: 48px 24px;
    color: var(--text-tertiary);
    font-size: 14px;
    font-style: italic;
  }

  /* ── Responsive ── */
  @media (max-width: 640px) {
    .dashboard {
      max-width: 100%;
    }

    .kpi-grid {
      grid-template-columns: 1fr 1fr;
    }

    .kpi-card {
      padding: 16px 18px;
    }

    .kpi-value {
      font-size: 22px;
    }

    .data-table th,
    .data-table td {
      padding: 8px 14px;
    }

    .block-comment-btn {
      opacity: 0.3 !important;
    }
    .block-comment-btn.has-comments {
      opacity: 0.5 !important;
    }
  }

  @media (max-width: 420px) {
    .kpi-grid {
      grid-template-columns: 1fr;
    }
  }

  @media print {
    .block-comment-btn,
    .comment-card {
      display: none !important;
    }
  }
</style>
