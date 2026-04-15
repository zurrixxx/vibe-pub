<script lang="ts">
  interface Props {
    current: string;
  }
  let { current }: Props = $props();

  const examples = [
    { slug: 'welcome', label: 'Doc', desc: 'Article with typography + TOC' },
    { slug: 'sample-kanban-v2', label: 'Kanban', desc: 'Board with drag & drop' },
  ];
</script>

<div class="example-nav">
  <div class="nav-inner">
    <span class="nav-label">Examples</span>
    <div class="nav-tabs">
      {#each examples as ex}
        <a
          href="/{ex.slug}"
          class="nav-tab"
          class:active={current === ex.slug}
          aria-current={current === ex.slug ? 'page' : undefined}
        >
          <span class="tab-name">{ex.label}</span>
          <span class="tab-desc">{ex.desc}</span>
        </a>
      {/each}
    </div>
  </div>
</div>

<style>
  .example-nav {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 56px;
    z-index: 30;
  }

  .nav-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 32px;
    display: flex;
    align-items: center;
    gap: 24px;
    height: 48px;
  }

  .nav-label {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-tertiary);
    flex-shrink: 0;
  }

  .nav-tabs {
    display: flex;
    gap: 4px;
  }

  .nav-tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 16px;
    border-radius: 8px;
    text-decoration: none;
    transition: background 150ms, color 150ms;
  }

  .nav-tab:not(.active) {
    color: var(--text-secondary);
  }

  .nav-tab:not(.active):hover {
    background: var(--surface-hover);
  }

  .nav-tab.active {
    background: var(--bg);
    color: var(--text-primary);
  }

  .tab-name {
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 600;
  }

  .tab-desc {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
  }

  @media (max-width: 600px) {
    .nav-inner { padding: 0 16px; gap: 12px; }
    .tab-desc { display: none; }
  }
</style>
