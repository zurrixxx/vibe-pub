<script lang="ts">
  import { titleEmphasisParts } from './chapter/index';

  interface CoverPart {
    partNum: string;
    title: string;
    pageCount: number;
  }

  interface Props {
    title: string;
    description?: string | null;
    readersGuide?: string | null;
    whatItsAbout?: string | null;
    whoItsFor?: string | null;
    howToReadIt?: string | null;
    ownerUsername?: string | null;
    updated?: string | null;
    parts: CoverPart[];
    pageCount: number;
    ownerProfileHref?: string | null;
  }

  let {
    title,
    description = null,
    readersGuide = null,
    whatItsAbout = null,
    whoItsFor = null,
    howToReadIt = null,
    ownerUsername = null,
    updated = null,
    parts,
    pageCount,
    ownerProfileHref = null,
  }: Props = $props();

  const showGuideGrid = $derived(
    Boolean(whatItsAbout || whoItsFor || howToReadIt || parts.length > 0)
  );

  const showGuideSection = $derived(Boolean(readersGuide || showGuideGrid));

  const titleParts = $derived(titleEmphasisParts(title));

  const editionLabel = $derived.by(() => {
    if (!updated) return null;
    const d = new Date(updated);
    if (Number.isNaN(d.getTime())) return null;
    const month = d.toLocaleString('en-US', { month: 'short' });
    return `${month} ${d.getFullYear()} edition`;
  });

  const ownerInitial = $derived(ownerUsername ? ownerUsername.charAt(0).toUpperCase() : 'V');
</script>

<section class="coll-cover" aria-label="Collection cover">
  <div class="coll-cover-wrap">
    <h1 class="coll-cover-title">
      {#if titleParts.emphasis}
        {titleParts.lead} <em>{titleParts.emphasis}</em>.
      {:else}
        {titleParts.lead}
      {/if}
    </h1>

    {#if description?.trim()}
      <p class="coll-cover-lede">{description}</p>
    {:else if pageCount > 0}
      <p class="coll-cover-lede">
        A collection on vibe.pub — <em>markdown in, URL out</em>.
      </p>
    {/if}

    {#if ownerUsername}
      <div class="coll-cover-byline">
        <div class="coll-cover-av" aria-hidden="true">{ownerInitial}</div>
        <div class="coll-cover-ax">
          {#if ownerProfileHref}
            <a class="coll-cover-name" href={ownerProfileHref}>@{ownerUsername}</a>
          {:else}
            <span class="coll-cover-name">@{ownerUsername}</span>
          {/if}
          {#if editionLabel}
            <span class="coll-cover-hand">{editionLabel}</span>
          {/if}
        </div>
      </div>
    {/if}

    {#if showGuideSection}
      <div class="coll-guide">
        <div class="coll-guide-label">
          <span>A reader's guide</span>
          <span class="coll-guide-line"></span>
        </div>

        {#if readersGuide}
          <p class="coll-guide-lede">{readersGuide}</p>
        {/if}

        {#if showGuideGrid}
          <div class="coll-guide-grid">
            {#if whatItsAbout}
              <section class="coll-guide-card">
                <h3 class="coll-guide-h">What it's about</h3>
                <p>{whatItsAbout}</p>
              </section>
            {/if}

            {#if whoItsFor}
              <section class="coll-guide-card">
                <h3 class="coll-guide-h">Who it's for</h3>
                <p>{whoItsFor}</p>
              </section>
            {/if}

            {#if parts.length > 0}
              <section class="coll-guide-card">
                <h3 class="coll-guide-h">How it's organized</h3>
                <ul>
                  {#each parts as part (part.partNum)}
                    <li>
                      <span class="coll-g-num">{part.partNum}</span>
                      <span><em>{part.title}</em></span>
                    </li>
                  {/each}
                </ul>
              </section>
            {/if}

            {#if howToReadIt}
              <section class="coll-guide-card">
                <h3 class="coll-guide-h">How to read it</h3>
                <p>{howToReadIt}</p>
              </section>
            {/if}
          </div>
        {/if}

        <p class="coll-guide-foot">
          <em>Published on vibe.pub.</em> Pages update when the author pushes new markdown.
        </p>
      </div>
    {/if}
  </div>
</section>

<style>
  .coll-cover {
    flex: 1;
    min-height: calc(100vh - 56px);
    background: var(--bg);
    color: var(--text-primary);
  }

  .coll-cover-wrap {
    max-width: 880px;
    margin: 0 auto;
    padding: 40px 32px 80px;
    box-sizing: border-box;
  }

  .coll-cover-title {
    font-family: var(--font-serif);
    font-size: clamp(42px, 8vw, 84px);
    font-weight: 400;
    line-height: 0.98;
    letter-spacing: -0.035em;
    color: var(--text-primary);
    margin: 0 0 24px;
    text-wrap: balance;
  }

  .coll-cover-title em {
    font-style: italic;
  }

  .coll-cover-lede {
    font-family: var(--font-prose);
    font-size: clamp(18px, 2.5vw, 24px);
    line-height: 1.45;
    color: var(--text-secondary);
    margin: 0 0 36px;
    max-width: 640px;
    text-wrap: pretty;
  }

  .coll-cover-lede em {
    font-style: italic;
  }

  .coll-cover-byline {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    margin-bottom: 48px;
    padding-bottom: 36px;
    border-bottom: 1px solid var(--border);
  }

  .coll-cover-av {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #c96442 0%, #92400e 100%);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .coll-cover-ax {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .coll-cover-name {
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    text-decoration: none;
  }

  .coll-cover-name:hover {
    color: var(--accent);
  }

  .coll-cover-hand {
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: var(--text-tertiary);
  }

  .coll-guide {
    margin-bottom: 56px;
  }

  .coll-guide-label {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-tertiary);
    margin-bottom: 22px;
    display: flex;
    align-items: center;
  }

  .coll-guide-line {
    flex: 1;
    height: 1px;
    background: var(--border);
    margin-left: 16px;
  }

  .coll-guide-lede {
    font-family: var(--font-serif);
    font-size: 22px;
    line-height: 1.45;
    color: var(--text-primary);
    font-weight: 400;
    letter-spacing: -0.005em;
    margin: 0 0 36px;
    max-width: 640px;
    text-wrap: pretty;
  }

  .coll-guide-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 36px 56px;
    padding: 28px 0;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    margin-bottom: 28px;
  }

  @media (max-width: 720px) {
    .coll-guide-grid {
      grid-template-columns: 1fr;
      gap: 28px;
      padding: 22px 0;
    }

    .coll-guide-lede {
      font-size: 19px;
    }

    .coll-cover-wrap {
      padding: 32px 20px 64px;
    }
  }

  .coll-guide-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .coll-guide-h {
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-tertiary);
    margin: 0;
  }

  .coll-guide-card p,
  .coll-guide-card ul {
    font-family: var(--font-prose);
    font-size: 15.5px;
    line-height: 1.6;
    color: var(--text-primary);
    margin: 0;
    text-wrap: pretty;
  }

  .coll-guide-card em {
    font-style: italic;
  }

  .coll-guide-card ul {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .coll-guide-card li {
    display: grid;
    grid-template-columns: 28px 1fr;
    gap: 10px;
    align-items: baseline;
    color: var(--text-secondary);
  }

  .coll-g-num {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: var(--text-tertiary);
  }

  .coll-guide-foot {
    font-family: var(--font-prose);
    font-size: 14px;
    line-height: 1.55;
    color: var(--text-secondary);
    max-width: 640px;
    text-wrap: pretty;
    margin: 0;
  }

  .coll-guide-foot em {
    font-style: italic;
    color: var(--text-primary);
  }
</style>
