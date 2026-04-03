<script lang="ts">
  interface Props {
    user?: { id: string; email: string; username: string } | null;
  }
  let { user = null }: Props = $props();
</script>

<header class="border-b border-zinc-200 dark:border-zinc-800 py-3 px-6">
  <nav class="max-w-3xl mx-auto flex items-center justify-between">
    <a href="/" class="font-mono font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100 hover:opacity-70 transition-opacity">
      vibe.pub
    </a>
    <div class="flex items-center gap-4 text-sm">
      {#if user}
        <a href={`/@${user.username}`} class="font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
          @{user.username}
        </a>
      {:else}
        <a href="/auth/sign-in" class="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
          sign in →
        </a>
      {/if}
    </div>
  </nav>
</header>
