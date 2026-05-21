<script lang="ts">
  export interface SpinePage {
    id: string;
    title: string;
    active: boolean;
    num: number;
  }

  export interface SpinePart {
    id: string;
    title: string;
    partNum: string;
    pages: SpinePage[];
  }

  interface Props {
    collectionTitle: string;
    ownerUsername?: string | null;
    parts: SpinePart[];
    ungroupedPages: SpinePage[];
    hasPartStructure: boolean;
    pages: SpinePage[];
    pageHref: (pageId: string) => string;
    coverHref: string;
    coverActive?: boolean;
    mobileOpen?: boolean;
  }

  let {
    collectionTitle,
    ownerUsername = null,
    parts,
    ungroupedPages,
    hasPartStructure,
    pages,
    pageHref,
    coverHref,
    coverActive = false,
    mobileOpen = false,
  }: Props = $props();

  const hasGroupedParts = $derived(parts.some((p) => p.pages.length > 0));
</script>

<aside class="vpub-spine" class:open={mobileOpen} aria-label="Collection contents">
  <div class="vpub-spine-inner">
    <a href={coverHref} class="vpub-spine-mast" class:vpub-spine-mast-active={coverActive}>
      <h2 class="vpub-coll-title">{collectionTitle}</h2>
      {#if ownerUsername}
        <p class="vpub-coll-meta"><span class="vpub-author">@{ownerUsername}</span></p>
      {/if}
    </a>

    <nav class="vpub-spine-list">
      {#if hasPartStructure}
        {#each parts as part (part.id)}
          <section class="vpub-part">
            <div class="vpub-part-head">
              <span class="vpub-part-num">Part {part.partNum}</span>
              <span class="vpub-part-name">{part.title}</span>
            </div>
            {#if part.pages.length > 0}
              <div class="vpub-chapters">
                {#each part.pages as page (page.id)}
                  <a
                    href={pageHref(page.id)}
                    class="vpub-chap"
                    class:vpub-chap-active={page.active}
                  >
                    <span class="vpub-chap-num">{page.num}</span>
                    <span class="vpub-chap-title">{page.title}</span>
                  </a>
                {/each}
              </div>
            {:else}
              <p class="vpub-spine-empty">No pages yet</p>
            {/if}
          </section>
        {/each}

        {#if ungroupedPages.length > 0}
          <section class="vpub-part">
            {#if hasGroupedParts}
              <div class="vpub-part-head">
                <span class="vpub-part-name vpub-part-name-only">other</span>
              </div>
            {/if}
            <div class="vpub-chapters">
              {#each ungroupedPages as page (page.id)}
                <a href={pageHref(page.id)} class="vpub-chap" class:vpub-chap-active={page.active}>
                  <span class="vpub-chap-num">{page.num}</span>
                  <span class="vpub-chap-title">{page.title}</span>
                </a>
              {/each}
            </div>
          </section>
        {/if}
      {:else}
        <div class="vpub-chapters vpub-chapters-standalone">
          {#each pages as page (page.id)}
            <a href={pageHref(page.id)} class="vpub-chap" class:vpub-chap-active={page.active}>
              <span class="vpub-chap-num">{page.num}</span>
              <span class="vpub-chap-title">{page.title}</span>
            </a>
          {/each}
        </div>
      {/if}
    </nav>
  </div>
</aside>

<style>
  /* Reader_Collection.html spine — isolated class names (vpub-spine-*) */

  .vpub-spine {
    display: none;
    position: sticky;
    top: 56px;
    width: 300px;
    height: calc(100vh - 56px);
    overflow: hidden;
    border-right: 1px solid var(--border);
    background: color-mix(in srgb, var(--bg) 96%, #000 2%);
    box-sizing: border-box;
  }

  .vpub-spine-inner {
    height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  @media (max-width: 959px) {
    .vpub-spine {
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 56px;
      left: 0;
      bottom: 0;
      width: 300px;
      max-width: 88vw;
      z-index: 45;
      transform: translateX(-100%);
      transition: transform 200ms ease;
      background: var(--bg);
    }

    .vpub-spine.open {
      transform: translateX(0);
    }
  }

  @media (min-width: 960px) {
    .vpub-spine {
      display: block;
    }
  }

  .vpub-spine-mast {
    display: block;
    padding: 24px 24px 18px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    text-decoration: none;
    color: inherit;
    transition: background 120ms ease;
  }

  .vpub-spine-mast:hover {
    background: color-mix(in srgb, var(--text-primary) 4%, transparent);
  }

  .vpub-spine-mast-active .vpub-coll-title {
    color: var(--text-primary);
  }

  .vpub-coll-title {
    font-family: var(--font-serif);
    font-size: 22px;
    font-weight: 400;
    line-height: 1.2;
    letter-spacing: -0.015em;
    color: var(--text-primary);
    margin: 0 0 6px;
    text-wrap: balance;
    word-break: break-word;
  }

  .vpub-coll-meta {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--text-tertiary);
  }

  .vpub-author {
    color: var(--text-secondary);
  }

  .vpub-spine-list {
    display: flex;
    flex-direction: column;
    padding: 4px 0 32px;
    flex: 1;
    min-width: 0;
  }

  .vpub-part {
    display: block;
    width: 100%;
    box-sizing: border-box;
    padding: 18px 24px 2px;
    position: relative;
  }

  .vpub-part + .vpub-part {
    padding-top: 22px;
  }

  .vpub-part + .vpub-part::before {
    content: '';
    position: absolute;
    left: 24px;
    right: 24px;
    top: 0;
    height: 1px;
    background: var(--border);
    opacity: 0.7;
  }

  .vpub-part-head {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 10px;
    min-width: 0;
  }

  .vpub-part-num {
    flex-shrink: 0;
    font-family: var(--font-mono);
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-tertiary);
    line-height: 1.3;
  }

  .vpub-part-name {
    font-family: var(--font-serif);
    font-size: 13.5px;
    font-weight: 400;
    font-style: italic;
    color: var(--text-secondary);
    letter-spacing: -0.005em;
    line-height: 1.35;
    word-break: break-word;
    max-width: 100%;
  }

  .vpub-part-name-only {
    text-transform: lowercase;
  }

  .vpub-chapters {
    display: flex;
    flex-direction: column;
    width: 100%;
    border-left: 1px solid var(--border);
    margin-left: 4px;
    padding: 2px 0;
    box-sizing: border-box;
  }

  .vpub-chapters-standalone {
    margin: 8px 24px 0;
  }

  .vpub-chap {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    align-items: start;
    gap: 10px;
    width: 100%;
    box-sizing: border-box;
    padding: 6px 8px 6px 14px;
    margin-left: -1px;
    border-left: 2px solid transparent;
    text-decoration: none;
    color: inherit;
    transition:
      color 120ms ease,
      border-color 120ms ease;
  }

  .vpub-chap:hover .vpub-chap-title {
    color: var(--accent);
  }

  .vpub-chap-num {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
    text-align: right;
    line-height: 1.4;
    padding-top: 1px;
  }

  .vpub-chap-title {
    font-family: var(--font-serif);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.4;
    color: var(--text-primary);
    letter-spacing: -0.005em;
    word-break: break-word;
    min-width: 0;
  }

  .vpub-chap-active {
    border-left-color: var(--text-primary);
  }

  .vpub-chap-active .vpub-chap-num {
    color: var(--text-primary);
    font-weight: 600;
  }

  .vpub-chap-active .vpub-chap-title {
    color: var(--text-primary);
    font-weight: 600;
  }

  .vpub-spine-empty {
    margin: 0 0 0 14px;
    padding: 4px 0 4px 14px;
    border-left: 1px solid var(--border);
    font-family: var(--font-prose);
    font-size: 12px;
    font-style: italic;
    color: var(--text-tertiary);
  }
</style>
