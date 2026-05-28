<script lang="ts">
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import Share from '$lib/components/topbar/Share.svelte';
  import type { ManageAccessConfig } from '$lib/components/topbar/ShareAccessPanel.svelte';
  import User from '$lib/components/topbar/User.svelte';
  import {
    closeReaderAppearancePanel,
    openReaderAppearancePanel,
    readerAppearancePanelOpen,
  } from '$lib/components/topbar';
  import { openSearchPanel, openSettingsPanel } from './stores';

  interface Props {
    user?: { username: string } | null;
    collectionSlug: string;
    ownerUsername?: string | null;
    chapterLabel: string;
    showSpineToggle?: boolean;
    showSearch?: boolean;
    isCollectionOwner?: boolean;
    manageAccess?: ManageAccessConfig | null;
    onSpineToggle?: () => void;
  }

  let {
    user = null,
    collectionSlug,
    ownerUsername = null,
    chapterLabel,
    showSpineToggle = false,
    showSearch = false,
    isCollectionOwner = false,
    manageAccess = null,
    onSpineToggle,
  }: Props = $props();

  let moreOpen = $state(false);

  const crumbSlug = $derived(
    ownerUsername ? `vibe.pub/@${ownerUsername}/${collectionSlug}` : `vibe.pub/c/${collectionSlug}`
  );

  let shareUrl = $derived(browser ? $page.url.href : '');

  const printHref = $derived(`/c/${collectionSlug}/print`);
  const sourcesZipHref = $derived(`/c/${collectionSlug}/sources.zip`);
  const folderHref = $derived(ownerUsername ? `/@${ownerUsername}` : null);

  function closeMenus() {
    moreOpen = false;
  }

  function toggleMore(e: MouseEvent) {
    e.stopPropagation();
    const next = !moreOpen;
    closeMenus();
    moreOpen = next;
    if (next) closeReaderAppearancePanel();
  }

  function openSearch(e: MouseEvent) {
    e.stopPropagation();
    closeMenus();
    closeReaderAppearancePanel();
    openSearchPanel();
  }

  function toggleAppearance(e: MouseEvent) {
    e.stopPropagation();
    moreOpen = false;
    if ($readerAppearancePanelOpen) {
      closeReaderAppearancePanel();
    } else {
      openReaderAppearancePanel();
    }
  }

  function openSettings(e: MouseEvent) {
    e.stopPropagation();
    moreOpen = false;
    openSettingsPanel();
  }

  $effect(() => {
    if (!browser || !moreOpen) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (moreOpen && !t.closest?.('.more-wrap')) moreOpen = false;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMenus();
    }
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  });
</script>

<header class="c-top">
  <div class="c-top-blur" aria-hidden="true"></div>
  <nav class="topbar" aria-label="Collection">
    <div class="top-left">
      <a href="/" class="brand">vibe.<em>pub</em></a>
      {#if showSpineToggle}
        <button
          type="button"
          class="spine-toggle"
          title="Contents"
          onclick={() => onSpineToggle?.()}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            width="14"
            height="14"
            aria-hidden="true"
            ><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line
              x1="3"
              y1="18"
              x2="21"
              y2="18"
            /></svg
          >
          Contents
        </button>
      {/if}
      <div class="crumb-meta">
        <span class="slug">{crumbSlug}</span>
        <span class="sep">/</span>
        <span class="chapter">{chapterLabel}</span>
      </div>
    </div>

    <div class="top-r">
      {#if showSearch}
        <button
          type="button"
          class="top-btn icon-only"
          title="Search the collection (⌘K)"
          onclick={openSearch}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg
          >
        </button>
      {/if}

      <div class="more-wrap">
        <button
          type="button"
          class="top-btn icon-only"
          class:active={moreOpen}
          title="More"
          onclick={toggleMore}
          aria-expanded={moreOpen}
          aria-haspopup="true"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
            ><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle
              cx="19"
              cy="12"
              r="1.4"
            /></svg
          >
        </button>
        <div class="more-menu" class:open={moreOpen}>
          <button type="button" class="mm-item" data-appearance-trigger onclick={toggleAppearance}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
              ><circle cx="12" cy="12" r="4" /><path
                d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
              /></svg
            >
            Appearance
          </button>
          {#if isCollectionOwner}
            <button type="button" class="mm-item" onclick={openSettings}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
                ><circle cx="12" cy="12" r="3" /><path
                  d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                /></svg
              >
              Collection settings
            </button>
          {/if}
          <div class="mm-divider" role="separator"></div>
          <a
            href={printHref}
            class="mm-item"
            target="_blank"
            rel="noopener noreferrer"
            onclick={closeMenus}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
              ><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline
                points="14 2 14 8 20 8"
              /></svg
            >
            Export entire collection as PDF
          </a>
          <a href={sourcesZipHref} class="mm-item" download onclick={closeMenus}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
              ><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
                points="7 10 12 15 17 10"
              /><line x1="12" y1="15" x2="12" y2="3" /></svg
            >
            Download all .md files
          </a>
          {#if folderHref}
            <a href={folderHref} class="mm-item" onclick={closeMenus}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
                ><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg
              >
              View source folder
            </a>
          {/if}
        </div>
      </div>

      <Share {shareUrl} subject="collection" {manageAccess} onOpen={closeMenus} />
      <User {user} onMenuToggle={closeMenus} />
    </div>
  </nav>
</header>

<style>
  .c-top {
    position: sticky;
    top: 0;
    z-index: 40;
    isolation: isolate;
  }

  /* Frosted bar as sibling — avoids trapping position:fixed modals inside the nav */
  .c-top-blur {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
  }

  /* Reader_Collection.html — .topbar */
  .topbar {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 56px;
    padding: 0 32px;
    background: transparent;
  }

  .top-left {
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 0;
  }

  .brand {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 400;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    text-decoration: none;
    flex-shrink: 0;
    line-height: 1;
  }

  .brand :global(em) {
    font-style: italic;
  }

  .brand:hover {
    opacity: 0.85;
  }

  .spine-toggle {
    display: none;
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 500;
    padding: 7px 12px;
    border-radius: 999px;
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid var(--border);
    cursor: pointer;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  @media (max-width: 959px) {
    .spine-toggle {
      display: inline-flex;
    }
  }

  .crumb-meta {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-tertiary);
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
  }

  .crumb-meta .slug {
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .crumb-meta .sep {
    opacity: 0.4;
    flex-shrink: 0;
  }

  .crumb-meta .chapter {
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 320px;
    flex-shrink: 1;
  }

  .top-r {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

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

  .top-btn.active {
    background: var(--text-primary);
    color: var(--bg);
  }

  .top-btn svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }

  .top-btn.icon-only {
    padding: 7px;
    width: 32px;
    height: 32px;
    justify-content: center;
  }

  .top-btn.icon-only svg {
    width: 15px;
    height: 15px;
  }

  .more-wrap {
    position: relative;
  }

  .more-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    min-width: 260px;
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

  .more-menu.open {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }

  .mm-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 12px;
    border-radius: 7px;
    background: transparent;
    border: 0;
    cursor: pointer;
    font-family: var(--font-sans);
    font-size: 13px;
    color: var(--text-primary);
    text-align: left;
    text-decoration: none;
  }

  .mm-item:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  :global(.dark) .mm-item:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .mm-item svg {
    width: 15px;
    height: 15px;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .mm-divider {
    height: 1px;
    background: var(--border);
    margin: 4px 6px;
  }

  @media (max-width: 720px) {
    .topbar {
      padding: 0 16px;
    }

    .crumb-meta .slug {
      max-width: min(28vw, 140px);
    }

    .crumb-meta .chapter {
      max-width: min(36vw, 160px);
    }
  }
</style>
