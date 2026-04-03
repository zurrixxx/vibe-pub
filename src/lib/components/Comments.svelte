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
  <h3 class="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-4">
    Comments {#if comments.length > 0}<span class="text-zinc-400">({comments.length})</span>{/if}
  </h3>

  {#if comments.length > 0}
    <div class="flex flex-col gap-4 mb-8">
      {#each comments as comment}
        <div class="flex gap-3">
          <div class="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-500">
            {(comment.display_name || 'A')[0].toUpperCase()}
          </div>
          <div class="flex-1">
            <div class="flex items-baseline gap-2">
              <span class="text-sm font-medium">{comment.display_name || 'Anonymous'}</span>
              <span class="text-xs text-zinc-400">{timeAgo(comment.created)}</span>
            </div>
            <p class="text-sm text-zinc-700 dark:text-zinc-300 mt-1">{comment.body}</p>
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
      class="w-48 px-3 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400"
    />
    <div class="flex gap-2">
      <input
        type="text"
        bind:value={newComment}
        placeholder="Add a comment..."
        class="flex-1 px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400"
        onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); }}}
      />
      <button
        onclick={submitComment}
        disabled={!newComment.trim() || submitting}
        class="px-4 py-2 text-sm bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg disabled:opacity-40 transition-colors"
      >
        Post
      </button>
    </div>
  </div>
</div>
