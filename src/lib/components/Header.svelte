<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import {
    closeDocCommentsPanel,
    closeReaderHistoryPanel,
    docCommentsPanelOpen,
    openReaderHistoryPanel,
    toggleDocCommentsPanelAllThreads,
  } from '$lib/stores';
  import {
    closeReaderAppearancePanel,
    kanbanReaderBoardFullwidth,
    openReaderAppearancePanel,
    readerAppearancePanelOpen,
  } from '$lib/components/topbar';
  import Share from '$lib/components/topbar/Share.svelte';
  import User from '$lib/components/topbar/User.svelte';
  import { openMyPageSearchPanel } from '$lib/components/mypage/stores';
  import { isResourceAccess, type ResourceAccess } from '$lib/constants/page';

  interface Props {
    user?: { id: string; email: string; username: string } | null;
  }
  let { user = null }: Props = $props();

  type PageData = {
    page?: {
      id: string;
      slug: string;
      user_id: string | null;
      view?: string | null;
      title?: string | null;
      access?: string;
    };
    canonicalPath?: string;
    comments?: unknown[];
    isOwner?: boolean;
  };

  let pathname = $derived($page.url.pathname);
  let pdata = $derived($page.data as PageData | undefined);
  let pg = $derived(pdata?.page);
  let canonicalPath = $derived(pdata?.canonicalPath ?? '');
  let commentCount = $derived(Array.isArray(pdata?.comments) ? pdata!.comments!.length : 0);

  /** Published doc at `/<slug>-<id>` (single segment path). */
  let isArticlePage = $derived(
    !/^\/(new|auth)(\/|$)/i.test(pathname) &&
      !pathname.endsWith('.md') &&
      /^\/[^/@][^/]*$/.test(pathname)
  );

  let crumb = $derived(
    canonicalPath
      ? `${$page.url.hostname}${canonicalPath}`
      : `${$page.url.hostname}${$page.url.pathname === '/' ? '' : $page.url.pathname}`
  );

  let shareUrl = $derived(
    browser
      ? canonicalPath
        ? `${$page.url.origin}${canonicalPath}`
        : `${$page.url.origin}${$page.url.pathname === '/' ? '' : $page.url.pathname}`
      : ''
  );

  let markdownExportHref = $derived(canonicalPath ? `${canonicalPath}.md` : '');
  let printExportHref = $derived(canonicalPath ? `${canonicalPath}/print` : '');
  let markdownDownloadName = $derived(
    pg ? `${(pg.slug && pg.slug.length ? pg.slug : pg.id) || 'page'}.md` : 'page.md'
  );

  let shareSnippet = $derived.by(() => {
    const t = pdata?.page?.title?.trim();
    const u = shareUrl;
    if (!u) return '';
    return t ? `${t}\n\n${u}` : u;
  });

  let intentX = $derived(
    browser && shareSnippet
      ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareSnippet)}`
      : ''
  );

  let qrImgSrc = $derived(
    browser && shareUrl
      ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}&bgcolor=ebeae4&color=000000`
      : ''
  );

  let isDocArticle = $derived(isArticlePage && (pg?.view ?? 'doc') === 'doc');

  let isKanbanArticle = $derived(isArticlePage && pg?.view === 'kanban');

  let isMyPage = $derived(/^\/@[^/]+$/.test(pathname));

  let isPageOwner = $derived(pdata?.isOwner === true);

  let pageManageAccess = $derived.by(() => {
    if (!isPageOwner || !pg?.id || !pg.access) return null;
    if (!isResourceAccess(pg.access)) return null;
    return {
      resourceType: 'page' as const,
      resourceKey: pg.id,
      access: pg.access as ResourceAccess,
    };
  });

  let moreOpen = $state(false);
  let docCommentsOpen = $state(false);
  let deletingPage = $state(false);

  $effect(() => docCommentsPanelOpen.subscribe((v) => (docCommentsOpen = v)));

  function onHeaderCommentsClick(e: MouseEvent) {
    e.preventDefault();
    toggleDocCommentsPanelAllThreads();
  }

  function closeMenus() {
    moreOpen = false;
  }

  function toggleMore(e: MouseEvent) {
    e.stopPropagation();
    const next = !moreOpen;
    closeMenus();
    moreOpen = next;
    if (next) {
      closeDocCommentsPanel();
      closeReaderHistoryPanel();
      closeReaderAppearancePanel();
    }
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

  function openMyPageSearch(e: MouseEvent) {
    e.stopPropagation();
    closeMenus();
    closeReaderAppearancePanel();
    openMyPageSearchPanel();
  }

  async function deletePublishedPage(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!pg?.id || !browser || deletingPage) return;
    const ok = window.confirm(
      'Delete this page permanently? You cannot undo this. Comments and version history will be removed.'
    );
    if (!ok) return;
    moreOpen = false;
    deletingPage = true;
    try {
      const res = await fetch(`/api/pub/${pg.id}`, { method: 'DELETE' });
      if (res.ok) {
        await goto(user ? `/@${user.username}` : '/', { replaceState: true });
        return;
      }
      window.alert(`Could not delete page (${res.status}).`);
    } catch {
      window.alert('Network error — try again.');
    } finally {
      deletingPage = false;
    }
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

<header class="site-header">
  <div class="site-header-blur" aria-hidden="true"></div>
  <nav class="topbar" aria-label="Site">
    <div class="top-left">
      <a href={user ? `/@${user.username}` : '/'} class="brand">vibe.<em>pub</em></a>
      {#if pathname !== '/'}
        <div class="crumb-meta">
          <span class="slug">{crumb}</span>
        </div>
      {/if}
    </div>

    <div class="top-r">
      {#if isArticlePage && pg}
        {#if isDocArticle}
          <button
            type="button"
            class="top-btn"
            class:active={docCommentsOpen}
            onclick={onHeaderCommentsClick}
            aria-expanded={docCommentsOpen}
            aria-controls="comments-panel"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
              ><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg
            >
            comments
            {#if commentCount > 0}<span class="count">{commentCount}</span>{/if}
          </button>
        {/if}

        <div class="more-wrap">
          <button
            type="button"
            class="top-btn icon-only"
            class:active={moreOpen}
            onclick={toggleMore}
            aria-expanded={moreOpen}
            aria-haspopup="true"
            title="More"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle
                cx="19"
                cy="12"
                r="1.4"
              />
            </svg>
          </button>
          <div class="more-menu" class:open={moreOpen}>
            {#if isDocArticle}
              <button
                type="button"
                class="mm-item"
                onclick={() => {
                  moreOpen = false;
                  openReaderHistoryPanel();
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                  ><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 3v6h6" /><path
                    d="M12 7v5l3 2"
                  /></svg
                >
                History
              </button>
              <button
                type="button"
                class="mm-item"
                data-appearance-trigger
                onclick={toggleAppearance}
              >
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
              <div class="divider"></div>
              <a
                href={markdownExportHref}
                target="_blank"
                rel="noopener noreferrer"
                class="mm-item"
                onclick={() => (moreOpen = false)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                  ><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg
                >
                View source
              </a>
              <a
                href={markdownExportHref}
                download={markdownDownloadName}
                class="mm-item"
                onclick={() => (moreOpen = false)}
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
                Export as markdown
              </a>
              {#if canonicalPath}
                <a
                  href={`${canonicalPath}?kanban=1`}
                  class="mm-item"
                  onclick={() => (moreOpen = false)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                    ><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect
                      x="14"
                      y="3"
                      width="7"
                      height="7"
                      rx="1.5"
                    /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect
                      x="14"
                      y="14"
                      width="7"
                      height="7"
                      rx="1.5"
                    /></svg
                  >
                  Open as kanban
                </a>
              {/if}
              {#if isPageOwner}
                <div class="divider"></div>
                <button
                  type="button"
                  class="mm-item mm-danger"
                  onclick={deletePublishedPage}
                  disabled={deletingPage}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                    ><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path
                      d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                    /><line x1="10" y1="11" x2="10" y2="17" /><line
                      x1="14"
                      y1="11"
                      x2="14"
                      y2="17"
                    /></svg
                  >
                  {deletingPage ? 'Deleting…' : 'Delete page'}
                </button>
              {/if}
            {:else}
              <a
                href={markdownExportHref}
                target="_blank"
                rel="noopener noreferrer"
                class="mm-item"
                onclick={() => (moreOpen = false)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                  ><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg
                >
                View source
              </a>
              <button
                type="button"
                class="mm-item"
                onclick={() => {
                  moreOpen = false;
                  openReaderHistoryPanel();
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                  ><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 3v6h6" /><path
                    d="M12 7v5l3 2"
                  /></svg
                >
                History
              </button>
              <button
                type="button"
                class="mm-item"
                data-appearance-trigger
                onclick={toggleAppearance}
              >
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
              {#if isKanbanArticle}
                <button
                  type="button"
                  class="mm-item"
                  onclick={() => {
                    moreOpen = false;
                    kanbanReaderBoardFullwidth.update((v) => !v);
                  }}
                >
                  {#if $kanbanReaderBoardFullwidth}
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      aria-hidden="true"
                      ><polyline points="4 14 10 14 10 20" /><polyline
                        points="20 10 14 10 14 4"
                      /><line x1="14" y1="10" x2="21" y2="3" /><line
                        x1="3"
                        y1="21"
                        x2="10"
                        y2="14"
                      /></svg
                    >
                    Shrink to standard width
                  {:else}
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      aria-hidden="true"
                      ><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line
                        x1="21"
                        y1="3"
                        x2="14"
                        y2="10"
                      /><line x1="3" y1="21" x2="10" y2="14" /></svg
                    >
                    Expand to full width
                  {/if}
                </button>
              {/if}
              <div class="divider"></div>
              <a
                href={markdownExportHref}
                download={markdownDownloadName}
                class="mm-item"
                onclick={() => (moreOpen = false)}
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
                Export as markdown
              </a>
              {#if isKanbanArticle && canonicalPath}
                <a
                  href={`${canonicalPath}?doc=1`}
                  class="mm-item"
                  onclick={() => (moreOpen = false)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                    ><line x1="4" y1="6" x2="20" y2="6" /><line
                      x1="4"
                      y1="12"
                      x2="20"
                      y2="12"
                    /><line x1="4" y1="18" x2="14" y2="18" /></svg
                  >
                  Open as doc
                </a>
              {/if}
              {#if isPageOwner}
                <div class="divider"></div>
                <button
                  type="button"
                  class="mm-item mm-danger"
                  onclick={deletePublishedPage}
                  disabled={deletingPage}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                    ><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path
                      d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                    /><line x1="10" y1="11" x2="10" y2="17" /><line
                      x1="14"
                      y1="11"
                      x2="14"
                      y2="17"
                    /></svg
                  >
                  {deletingPage ? 'Deleting…' : 'Delete page'}
                </button>
              {/if}
            {/if}
          </div>
        </div>

        <Share
          {shareUrl}
          subject="page"
          manageAccess={pageManageAccess}
          exports={{
            markdownExportHref,
            markdownDownloadName,
            printExportHref,
            intentX,
            qrImgSrc,
          }}
          onOpen={() => {
            closeMenus();
            closeReaderHistoryPanel();
            closeReaderAppearancePanel();
          }}
        />
      {/if}

      {#if isMyPage}
        <button
          type="button"
          class="top-btn icon-only"
          title="Search pages and collections (⌘K)"
          onclick={openMyPageSearch}
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

      <User {user} showPublishWhenLoggedOut={!isArticlePage || !pg} onMenuToggle={closeMenus} />
    </div>
  </nav>
</header>

<style>
  .site-header {
    position: sticky;
    top: 0;
    z-index: 40;
    isolation: isolate;
  }

  .site-header-blur {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
  }

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
    gap: 18px;
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

  .crumb-meta {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-tertiary);
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .crumb-meta .slug {
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: min(52vw, 420px);
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

  .top-btn .count {
    opacity: 0.55;
    font-variant-numeric: tabular-nums;
    font-family: var(--font-mono);
    font-size: 12px;
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

  .top-btn.primary {
    background: var(--text-primary);
    color: var(--bg);
    padding: 7px 14px;
    border-color: transparent;
  }

  .top-btn.primary:hover {
    filter: brightness(0.92);
  }

  :global(.dark) .top-btn.primary:hover {
    filter: brightness(1.1);
  }

  .more-wrap,
  .user-wrap {
    position: relative;
  }

  .more-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    min-width: 200px;
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

  .more-menu .divider {
    height: 1px;
    background: var(--border);
    margin: 4px 6px;
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
    box-sizing: border-box;
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

  .mm-item.mm-danger {
    color: var(--error, #ef4444);
  }

  .mm-item.mm-danger svg {
    color: var(--error, #ef4444);
  }

  .mm-item.mm-danger:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.1);
  }

  :global(.dark) .mm-item.mm-danger:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.18);
  }

  .mm-item.mm-danger:disabled {
    opacity: 0.65;
    cursor: not-allowed;
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

  :global(.dark) .um-item:hover {
    background: rgba(255, 255, 255, 0.06);
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

  /* Share modal */
  .share-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.2);
    opacity: 0;
    pointer-events: none;
    transition: opacity 180ms ease;
    z-index: 60;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  .share-backdrop.open {
    opacity: 1;
    pointer-events: auto;
  }

  .share-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -48%);
    width: 440px;
    max-width: calc(100vw - 40px);
    /* Reader_Doc — cream card on light; surface on dark themes */
    background: color-mix(in srgb, #ebeae4 88%, var(--bg));
    border-radius: 24px;
    box-shadow:
      0 20px 60px rgba(0, 0, 0, 0.15),
      0 0 0 1px rgba(0, 0, 0, 0.06);
    padding: 28px;
    opacity: 0;
    pointer-events: none;
    transition:
      opacity 180ms ease,
      transform 180ms ease;
    z-index: 61;
  }

  .share-modal.open {
    opacity: 1;
    pointer-events: auto;
    transform: translate(-50%, -50%);
  }

  .share-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 18px;
    gap: 12px;
  }

  .share-head h3 {
    font-family: var(--font-serif);
    font-size: 24px;
    font-weight: 400;
    letter-spacing: -0.02em;
    margin: 0 0 4px;
    color: var(--text-primary);
  }

  .share-head h3 :global(em) {
    font-style: italic;
  }

  .share-head p {
    font-family: var(--font-sans);
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0;
  }

  .icon-btn {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.15s;
  }

  .icon-btn:hover {
    background: rgba(0, 0, 0, 0.05);
    color: var(--text-primary);
  }

  :global(.dark) .icon-btn:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .copy-row {
    display: flex;
    align-items: center;
    padding: 4px 4px 4px 14px;
    border-radius: 999px;
    background: var(--surface, #fff);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-card);
    margin-bottom: 18px;
    gap: 8px;
  }

  .copy-url {
    flex: 1;
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .copy-btn {
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 500;
    padding: 8px 16px;
    border-radius: 999px;
    border: none;
    background: var(--text-primary);
    color: var(--bg);
    cursor: pointer;
    transition: all 0.15s;
    flex-shrink: 0;
  }

  .copy-btn.copied {
    background: #15803d;
    color: #fff;
  }

  .share-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 14px;
  }

  @media (max-width: 520px) {
    .share-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .share-action {
    padding: 14px 8px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: transparent;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 500;
    color: var(--text-primary);
    transition:
      background 0.15s,
      border-color 0.15s;
    text-decoration: none;
    box-sizing: border-box;
    margin: 0;
    -webkit-tap-highlight-color: transparent;
  }

  a.share-action {
    color: inherit;
  }

  .share-action:hover {
    background: var(--surface, #fff);
    border-color: var(--border-hover, var(--border));
  }

  .share-action-icon {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
  }

  .share-action-icon svg {
    width: 18px;
    height: 18px;
  }

  .share-qr-preview {
    display: flex;
    justify-content: center;
    padding: 10px 0 6px;
    margin-bottom: 8px;
  }

  .share-qr-preview img {
    width: 200px;
    height: 200px;
    display: block;
    border-radius: 0;
    border: none;
    object-fit: contain;
    image-rendering: crisp-edges;
  }

  .share-foot {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
    text-align: center;
    margin: 0;
    padding-top: 8px;
  }

  @media (max-width: 640px) {
    .topbar {
      padding: 0 16px;
      height: 52px;
    }

    .brand {
      font-size: 18px;
    }

    .crumb-meta .slug {
      max-width: 36vw;
    }

    .top-btn {
      font-size: 12px;
      padding: 6px 10px;
    }
  }

  @media (max-width: 480px) {
    .top-btn:not(.icon-only):not(.primary) {
      padding: 7px;
      font-size: 0;
      gap: 0;
    }
    .top-btn:not(.icon-only):not(.primary) .count {
      font-size: 11px;
    }
  }
</style>
