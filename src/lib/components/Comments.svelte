<script lang="ts">
  import type { Comment } from '$lib/types';

  let { pageId, comments: initialComments }: { pageId: string; comments: Comment[] } = $props();

  let comments = $state(initialComments);
  let newComment = $state('');
  let displayName = $state('');
  let submitting = $state(false);

  async function submitComment() {
    if (!newComment.trim()) return;
    submitting = true;

    const res = await fetch(`/api/comment/${pageId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        body: newComment,
        display_name: displayName || undefined,
      }),
    });

    if (res.ok) {
      const comment = await res.json();
      comments = [...comments, comment];
      newComment = '';
    }

    submitting = false;
  }

  function timeAgo(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  // Generate a consistent gradient for each user initial
  function avatarGradient(name: string): string {
    const gradients = [
      'linear-gradient(135deg, #6366f1, #8b5cf6)',
      'linear-gradient(135deg, #3b82f6, #06b6d4)',
      'linear-gradient(135deg, #10b981, #3b82f6)',
      'linear-gradient(135deg, #f59e0b, #ef4444)',
      'linear-gradient(135deg, #ec4899, #8b5cf6)',
    ];
    const idx = (name.charCodeAt(0) || 0) % gradients.length;
    return gradients[idx];
  }
</script>

<div>
  <h3 class="comments-heading">
    Comments
    {#if comments.length > 0}
      <span class="comments-count">{comments.length}</span>
    {/if}
  </h3>

  {#if comments.length > 0}
    <div class="comments-list">
      {#each comments as comment}
        <div class="comment-row">
          <div class="avatar" style="background: {avatarGradient(comment.display_name || 'A')};">
            {(comment.display_name || 'A')[0].toUpperCase()}
          </div>
          <div class="comment-body">
            <div class="comment-meta">
              <span class="comment-author">{comment.display_name || 'Anonymous'}</span>
              <span class="comment-time">{timeAgo(comment.created)}</span>
            </div>
            <p class="comment-text">{comment.body}</p>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <div class="compose-area">
    <input
      type="text"
      bind:value={displayName}
      placeholder="Name (optional)"
      class="compose-input name-input"
    />
    <textarea
      bind:value={newComment}
      placeholder="Add a comment..."
      rows={3}
      class="compose-input comment-textarea"
      onkeydown={(e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          submitComment();
        }
      }}
    ></textarea>
    <div class="compose-footer">
      <span class="compose-hint">⌘↵ to post</span>
      <button onclick={submitComment} disabled={!newComment.trim() || submitting} class="post-btn">
        {submitting ? 'Posting…' : 'Post'}
      </button>
    </div>
  </div>
</div>

<style>
  .comments-heading {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 6px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .comments-count {
    font-size: 12px;
    font-weight: 500;
    padding: 2px 7px;
    border-radius: 9999px;
    background: var(--surface-hover);
    color: var(--text-tertiary);
  }

  .comments-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-bottom: 32px;
  }

  .comment-row {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 9999px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 13px;
    font-weight: 600;
    color: white;
  }

  .comment-body {
    flex: 1;
    min-width: 0;
  }

  .comment-meta {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 4px;
  }

  .comment-author {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .comment-time {
    font-size: 12px;
    color: var(--text-tertiary);
    font-family: var(--font-mono);
  }

  .comment-text {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0;
  }

  .compose-area {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: var(--surface);
    box-shadow: var(--shadow-card);
    border-radius: var(--radius-card);
    padding: 16px;
  }

  .compose-input {
    width: 100%;
    padding: 8px 14px;
    font-size: 14px;
    font-family: var(--font-sans);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-input);
    outline: none;
    color: var(--text-primary);
    transition:
      border-color 150ms,
      box-shadow 150ms;
    box-sizing: border-box;
  }

  .compose-input:focus {
    border-color: var(--border-hover);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }

  .compose-input::placeholder {
    color: var(--text-tertiary);
  }

  .name-input {
    max-width: 200px;
  }

  .comment-textarea {
    resize: none;
    line-height: 1.6;
  }

  .compose-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 4px;
  }

  .compose-hint {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
  }

  .post-btn {
    padding: 7px 20px;
    font-size: 14px;
    font-weight: 500;
    background: var(--accent);
    color: var(--bg);
    border: none;
    border-radius: var(--radius-button);
    cursor: pointer;
    transition:
      background-color 150ms,
      opacity 150ms;
  }

  .post-btn:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .post-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
</style>
