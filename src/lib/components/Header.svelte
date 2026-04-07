<script lang="ts">
  interface Props {
    user?: { id: string; email: string; username: string } | null;
  }
  let { user = null }: Props = $props();
</script>

<header class="site-header">
  <nav class="max-w-[720px] mx-auto px-6 h-full flex items-center justify-between">
    <a href="/" class="logo-link">
      <span class="logo-vibe">vibe</span><span class="logo-pub">.pub</span>
    </a>
    <div class="flex items-center gap-3">
      {#if user}
        <a href={`/@${user.username}`} class="nav-link">
          @{user.username}
        </a>
      {:else}
        <a href="/auth/login" class="nav-link">
          sign in
        </a>
      {/if}
    </div>
  </nav>
</header>

<style>
  .site-header {
    height: 52px;
    position: sticky;
    top: 0;
    z-index: 40;
    background: rgba(250, 250, 250, 0.75);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
    transition: border-color 200ms;
  }

  :global(.dark) .site-header {
    background: rgba(10, 10, 11, 0.75);
  }

  .logo-link {
    font-family: var(--font-mono);
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.5px;
    color: var(--text-primary);
    text-decoration: none;
    display: flex;
    align-items: center;
    transition: opacity 150ms;
  }

  .logo-link:hover {
    opacity: 0.75;
  }

  .logo-vibe {
    opacity: 0.45;
    transition: opacity 150ms;
  }

  .logo-pub {
    opacity: 1;
    transition: opacity 150ms;
  }

  .logo-link:hover .logo-vibe {
    opacity: 0.65;
  }

  .nav-link {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;
    padding: 5px 12px;
    border-radius: 6px;
    border: 1px solid var(--border);
    transition: color 150ms, border-color 150ms, background 150ms;
  }

  .nav-link:hover {
    color: var(--text-primary);
    border-color: var(--border-hover);
    background: var(--surface-hover);
  }
</style>
