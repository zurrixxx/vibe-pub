<script lang="ts">
  interface Props {
    kicker: string;
    title: string;
    /** If present as a substring of `title`, that span is rendered in <em> */
    titleEmphasis?: string | null;
    lede: string;
    /** When true, relax horizontal cap (Reader_Kanban full-width board) */
    boardFullwidth?: boolean;
  }

  let { kicker, title, titleEmphasis = null, lede, boardFullwidth = false }: Props = $props();

  let titleSplit = $derived.by(() => {
    if (!titleEmphasis) return null;
    const i = title.indexOf(titleEmphasis);
    if (i < 0) return null;
    return {
      before: title.slice(0, i),
      mid: titleEmphasis,
      after: title.slice(i + titleEmphasis.length),
    };
  });
</script>

<header class="kb-page-head" class:board-fullwidth={boardFullwidth}>
  <div class="kb-kicker">{kicker}</div>
  <h1 class="kb-title">
    {#if titleSplit}
      {titleSplit.before}<em>{titleSplit.mid}</em>{titleSplit.after}
    {:else}
      {title}
    {/if}
  </h1>
  <p class="kb-lede">{lede}</p>
</header>

<style>
  /* Reader_Kanban.html `.page-head` — kicker, title, lede above board-tools */
  .kb-page-head {
    width: 100%;
    max-width: 1320px;
    margin: 0 auto;
    padding: 44px 48px 14px;
    box-sizing: border-box;
    flex-shrink: 0;
    transition:
      padding 200ms ease,
      max-width 200ms ease;
  }

  .kb-kicker {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-tertiary);
    margin-bottom: 14px;
  }

  .kb-title {
    font-family: var(--font-serif);
    font-size: 44px;
    font-weight: 400;
    line-height: 1.05;
    letter-spacing: -0.025em;
    color: var(--text-primary);
    margin: 0 0 10px;
    text-wrap: balance;
  }

  .kb-title :global(em) {
    font-style: italic;
  }

  .kb-lede {
    font-family: var(--font-prose);
    font-size: 17px;
    line-height: 1.5;
    color: var(--text-secondary);
    margin: 0;
    text-wrap: pretty;
    max-width: 720px;
  }

  .kb-lede :global(em) {
    font-style: italic;
  }

  @media (max-width: 900px) {
    .kb-page-head {
      padding-left: 22px;
      padding-right: 22px;
    }

    .kb-title {
      font-size: 38px;
    }
  }

  .kb-page-head.board-fullwidth {
    max-width: none;
    padding-left: 32px;
    padding-right: 32px;
  }
</style>
