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
        display_name: displayName || undefined
      })
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
</script>

<div>
  <h3 style="font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 20px; display: flex; align-items: center; gap: 6px;">
    Comments
    {#if comments.length > 0}
      <span style="color: var(--text-tertiary); font-weight: 400;">({comments.length})</span>
    {/if}
  </h3>

  {#if comments.length > 0}
    <div class="flex flex-col gap-5" style="margin-bottom: 32px;">
      {#each comments as comment}
        <div class="flex gap-3">
          <div style="width: 32px; height: 32px; border-radius: 9999px; background: var(--surface); box-shadow: var(--shadow-border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 12px; font-weight: 500; color: var(--text-secondary);">
            {(comment.display_name || 'A')[0].toUpperCase()}
          </div>
          <div class="flex-1">
            <div class="flex items-baseline gap-2" style="margin-bottom: 4px;">
              <span style="font-size: 14px; font-weight: 500; color: var(--text-primary);">{comment.display_name || 'Anonymous'}</span>
              <span style="font-size: 12px; color: var(--text-tertiary);">{timeAgo(comment.created)}</span>
            </div>
            <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin: 0;">{comment.body}</p>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <div class="flex flex-col gap-3">
    <input
      type="text"
      bind:value={displayName}
      placeholder="Name (optional)"
      style="width: 192px; padding: 10px 14px; font-size: 14px; background: var(--surface); box-shadow: var(--shadow-card); border: none; outline: none; border-radius: 6px; color: var(--text-primary); transition: box-shadow 150ms;"
      onfocus={(e) => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 2px var(--accent), 0 0 0 4px rgba(59,130,246,0.15)'}
      onblur={(e) => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)'}
    />
    <div class="flex gap-2">
      <input
        type="text"
        bind:value={newComment}
        placeholder="Add a comment..."
        style="flex: 1; padding: 10px 14px; font-size: 14px; background: var(--surface); box-shadow: var(--shadow-card); border: none; outline: none; border-radius: 6px; color: var(--text-primary); transition: box-shadow 150ms;"
        onfocus={(e) => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 2px var(--accent), 0 0 0 4px rgba(59,130,246,0.15)'}
        onblur={(e) => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)'}
        onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); }}}
      />
      <button
        onclick={submitComment}
        disabled={!newComment.trim() || submitting}
        style="padding: 10px 16px; font-size: 14px; font-weight: 500; background: var(--accent); color: var(--bg); border: none; border-radius: 6px; cursor: pointer; transition: background-color 150ms; opacity: 1;"
        onmouseenter={(e) => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'; }}
        onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--accent)'}
        class="disabled:opacity-40"
      >
        Post
      </button>
    </div>
  </div>
</div>
