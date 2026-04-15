<script lang="ts">
  interface Props {
    user?: { id: string; email: string; username: string } | null;
    pageTitle?: string | null;
  }
  let { user = null, pageTitle = null }: Props = $props();
</script>

<header class="site-header">
  <nav>
    <div class="nav-left">
      <a href="/" class="logo-link">vibe.pub</a>
      {#if pageTitle}
        <span class="nav-sep"></span>
        <span class="page-title">{pageTitle}</span>
      {/if}
    </div>
    <div class="nav-right">
      {#if user}
        <a href={`/@${user.username}`} class="nav-link">@{user.username}</a>
      {:else}
        <a href="/auth/login" class="nav-link">Sign in</a>
      {/if}
    </div>
  </nav>
</header>

<style>
  .site-header {
    height: 48px;
    position: sticky;
    top: 0;
    z-index: 40;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
  }

  nav {
    padding: 0 24px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .nav-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .logo-link {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 18px;
    font-weight: 400;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    text-decoration: none;
    flex-shrink: 0;
    transition: opacity 150ms;
  }

  .logo-link:hover { opacity: 0.6; }

  .nav-sep {
    width: 1px;
    height: 18px;
    background: var(--border);
    flex-shrink: 0;
  }

  .page-title {
    font-size: 13px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nav-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }

  .nav-link {
    font-size: 12px;
    color: var(--text-tertiary);
    text-decoration: none;
    transition: color 150ms;
  }

  .nav-link:hover { color: var(--text-primary); }
</style>
