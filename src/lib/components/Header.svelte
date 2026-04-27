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
      <a href={user ? `/@${user.username}` : '/'} class="wordmark">vibe.<em>pub</em></a>
      {#if pageTitle}
        <span class="nav-sep"></span>
        <span class="page-title">{pageTitle}</span>
      {/if}
    </div>
    <div class="nav-right">
      {#if user}
        <a href="/new" class="tb-btn primary">publish</a>
        <a href={`/@${user.username}`} class="avatar">{user.username[0].toUpperCase()}</a>
      {:else}
        <a href="/new" class="tb-btn">publish</a>
        <a href="/auth/login" class="tb-btn primary">sign in</a>
      {/if}
    </div>
  </nav>
</header>

<style>
  .site-header {
    position: sticky;
    top: 0;
    z-index: 40;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
  }

  nav {
    padding: 0 40px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .nav-left {
    display: flex;
    align-items: baseline;
    gap: 14px;
    min-width: 0;
  }

  .wordmark {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 400;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    text-decoration: none;
    flex-shrink: 0;
    transition: opacity var(--ease-fast);
    line-height: 1;
  }

  .wordmark :global(em) {
    font-style: italic;
  }

  .wordmark:hover {
    opacity: 0.6;
  }

  .nav-sep {
    width: 1px;
    height: 18px;
    background: var(--border);
    flex-shrink: 0;
    align-self: center;
  }

  .page-title {
    font-size: 13px;
    font-family: var(--font-sans);
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nav-right {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .tb-btn {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 500;
    padding: 7px 14px;
    border-radius: 9999px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 150ms;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .tb-btn:hover {
    color: var(--text-primary);
    border-color: var(--border-hover);
    background: var(--surface-hover);
  }

  .tb-btn.primary {
    background: var(--text-primary);
    color: var(--bg);
    border-color: var(--text-primary);
  }

  .tb-btn.primary:hover {
    background: var(--accent-hover);
    color: var(--bg);
  }

  .avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: linear-gradient(135deg, #c77a5b, #8b4a35);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 600;
    color: white;
    cursor: pointer;
    text-decoration: none;
    border: 2px solid var(--bg);
  }

  @media (max-width: 640px) {
    nav {
      padding: 0 20px;
      height: 48px;
    }

    .wordmark {
      font-size: 18px;
    }

    .page-title {
      max-width: 140px;
    }
  }
</style>
