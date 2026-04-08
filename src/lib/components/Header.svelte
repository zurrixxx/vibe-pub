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
    height: 56px;
    position: sticky;
    top: 0;
    z-index: 40;
    background: transparent;
    transition: border-color 200ms;
  }

  .logo-link {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 18px;
    font-weight: 400;
    letter-spacing: -0.3px;
    color: var(--text-primary);
    text-decoration: none;
    display: flex;
    align-items: center;
    transition: opacity 150ms;
  }

  .logo-link:hover {
    opacity: 0.7;
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
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;
    padding: 6px 16px;
    border-radius: var(--radius-button);
    border: 1px solid var(--border);
    transition: color 150ms, border-color 150ms, background 150ms;
  }

  .nav-link:hover {
    color: var(--text-primary);
    border-color: var(--border-hover);
    background: var(--surface);
  }
</style>
