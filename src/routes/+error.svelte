<script lang="ts">
  import { page } from '$app/stores';
</script>

<svelte:head>
  <title>{$page.status} — vibe.pub</title>
</svelte:head>

<div class="error-page">
  <div class="error-card">
    <div class="error-number"><em>{$page.status}</em></div>
    <div class="error-message">
      {#if $page.status === 404}
        This page doesn't <em>exist</em>.
      {:else}
        {$page.error?.message || 'Something went wrong.'}
      {/if}
    </div>
    <div class="error-caption">
      checked · {$page.url.hostname}{$page.url.pathname} · {$page.status === 404
        ? 'not found'
        : 'error'}
    </div>
    <div class="error-actions">
      <a href="/new" class="cta-link">new page <span class="arrow">&#8594;</span></a>
      <span class="cta-sep">or</span>
      <a href="/" class="cta-link">home</a>
    </div>
  </div>
</div>

<style>
  .error-page {
    min-height: calc(100vh - 52px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
    background: var(--bg);
  }

  .error-card {
    text-align: center;
  }

  .error-number {
    font-family: var(--font-display);
    font-size: 120px;
    line-height: 0.9;
    letter-spacing: -0.05em;
    color: var(--text-primary);
  }

  .error-number :global(em) {
    font-style: italic;
  }

  .error-message {
    font-family: var(--font-serif);
    font-size: 20px;
    letter-spacing: -0.015em;
    color: var(--text-primary);
    margin-top: 16px;
    font-weight: 400;
  }

  .error-message :global(em) {
    font-style: italic;
  }

  .error-caption {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
    margin-top: 12px;
  }

  .error-actions {
    margin-top: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }

  .cta-link {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-primary);
    text-decoration: none;
    padding: 6px 16px;
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    transition:
      background var(--ease-fast),
      border-color var(--ease-fast);
  }

  .cta-link:hover {
    background: var(--surface-hover);
    border-color: var(--border-hover);
  }

  .arrow {
    margin-left: 2px;
  }

  .cta-sep {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-tertiary);
  }
</style>
