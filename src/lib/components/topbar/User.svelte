<script lang="ts">
  import { browser } from '$app/environment';

  interface Props {
    user?: { username: string } | null;
    /** When logged out, show Publish as primary (doc/kanban header). Collection uses sign-in only. */
    showPublishWhenLoggedOut?: boolean;
    onMenuToggle?: () => void;
  }

  let { user = null, showPublishWhenLoggedOut = false, onMenuToggle }: Props = $props();

  let userOpen = $state(false);

  function toggleUser(e: MouseEvent) {
    e.stopPropagation();
    userOpen = !userOpen;
    onMenuToggle?.();
  }

  function closeUser() {
    userOpen = false;
  }

  $effect(() => {
    if (!browser || !userOpen) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (userOpen && !t.closest?.('.user-wrap')) userOpen = false;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') userOpen = false;
    }
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  });
</script>

{#if user}
  <div class="user-wrap">
    <button
      type="button"
      class="user-btn"
      onclick={toggleUser}
      aria-expanded={userOpen}
      aria-haspopup="true"
      title="@{user.username}"
    >
      <span class="avatar-dot">{user.username[0]?.toUpperCase() ?? '?'}</span>
    </button>
    <div class="user-menu" class:open={userOpen}>
      <div class="um-head">
        <div class="um-name">{user.username}</div>
        <div class="um-handle">@{user.username}</div>
      </div>
      <a href={`/@${user.username}`} class="um-item" onclick={closeUser}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
          ><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle
            cx="12"
            cy="7"
            r="4"
          /></svg
        >
        Your profile
      </a>
      <a href="/new" class="um-item" onclick={closeUser}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg
        >
        Publish
      </a>
      <div class="um-sep"></div>
      <form method="POST" action="/auth/logout" class="um-form">
        <button type="submit" class="um-item um-signout">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
            ><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline
              points="16 17 21 12 16 7"
            /><line x1="21" y1="12" x2="9" y2="12" /></svg
          >
          Sign out
        </button>
      </form>
    </div>
  </div>
{:else}
  <a href="/auth/login" class="top-btn">Sign in</a>
  {#if showPublishWhenLoggedOut}
    <a href="/new" class="top-btn primary">Publish</a>
  {/if}
{/if}

<style>
  .top-btn {
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 500;
    padding: 7px 12px;
    border-radius: 999px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    line-height: 1;
  }

  .top-btn:hover {
    color: var(--text-primary);
    background: rgba(0, 0, 0, 0.04);
  }

  :global(.dark) .top-btn:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .top-btn.primary {
    background: var(--text-primary);
    color: var(--bg);
    padding: 7px 14px;
  }

  .top-btn.primary:hover {
    filter: brightness(0.92);
  }

  .user-btn {
    width: 30px;
    height: 30px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface);
    cursor: pointer;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-left: 8px;
    transition: all 0.15s;
    overflow: hidden;
  }

  .user-btn:hover {
    border-color: var(--text-tertiary);
  }

  .avatar-dot {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #c96442 0%, #92400e 100%);
    color: #fff;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
  }

  .user-wrap {
    position: relative;
  }

  .user-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    min-width: 220px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow:
      0 10px 30px rgba(0, 0, 0, 0.08),
      0 2px 6px rgba(0, 0, 0, 0.04);
    padding: 4px;
    opacity: 0;
    pointer-events: none;
    transform: translateY(-4px);
    transition:
      opacity 140ms ease,
      transform 140ms ease;
    z-index: 50;
  }

  .user-menu.open {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }

  .um-head {
    padding: 10px 12px 8px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 4px;
  }

  .um-name {
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .um-handle {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
    margin-top: 2px;
  }

  .um-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 12px;
    border-radius: 7px;
    background: transparent;
    border: 0;
    cursor: pointer;
    font-family: var(--font-sans);
    font-size: 13px;
    color: var(--text-primary);
    text-align: left;
    text-decoration: none;
    box-sizing: border-box;
  }

  .um-item:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  .um-item svg {
    width: 14px;
    height: 14px;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .um-sep {
    height: 1px;
    background: var(--border);
    margin: 4px 6px;
  }

  .um-form {
    margin: 0;
    padding: 0;
  }

  .um-signout {
    width: 100%;
  }
</style>
