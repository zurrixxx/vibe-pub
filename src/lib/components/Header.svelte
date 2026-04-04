<script lang="ts">
  interface Props {
    user?: { id: string; email: string; username: string } | null;
  }
  let { user = null }: Props = $props();
</script>

<header style="height: 56px; border-bottom: 1px solid var(--border); background: var(--bg);">
  <nav class="max-w-[680px] mx-auto px-6 h-full flex items-center justify-between">
    <a
      href="/"
      style="font-family: var(--font-mono); font-size: 18px; font-weight: 600; letter-spacing: -0.36px; color: var(--text-primary); text-decoration: none; transition: opacity 150ms;"
      onmouseenter={(e) => (e.currentTarget as HTMLElement).style.opacity = '0.7'}
      onmouseleave={(e) => (e.currentTarget as HTMLElement).style.opacity = '1'}
    >
      vibe.pub
    </a>
    <div class="flex items-center gap-4">
      {#if user}
        <a
          href={`/@${user.username}`}
          style="font-family: var(--font-mono); font-size: 14px; font-weight: 500; color: var(--text-secondary); text-decoration: none; transition: color 150ms;"
          onmouseenter={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'}
          onmouseleave={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'}
        >
          @{user.username}
        </a>
      {:else}
        <a
          href="/auth/login"
          style="font-size: 14px; font-weight: 500; color: var(--text-secondary); text-decoration: none; transition: color 150ms;"
          onmouseenter={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'}
          onmouseleave={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'}
        >
          sign in
        </a>
      {/if}
    </div>
  </nav>
</header>
