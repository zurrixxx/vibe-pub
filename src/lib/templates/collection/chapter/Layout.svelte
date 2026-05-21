<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** When true, main content renders outside the 720px inner column (e.g. full-width kanban). */
    bleed?: boolean;
    /** When true with bleed, chapter head spans full width (kanban board-fullwidth). */
    headFullwidth?: boolean;
    head?: Snippet;
    body?: Snippet;
    foot?: Snippet;
  }

  let { bleed = false, headFullwidth = false, head, body, foot }: Props = $props();
</script>

<section class="c-reader" aria-label="Chapter">
  {#if bleed}
    <div class="c-reader-inner" class:head-fullwidth={headFullwidth}>
      {@render head?.()}
    </div>
    {@render body?.()}
    <div class="c-reader-inner c-reader-inner--tail">
      {@render foot?.()}
    </div>
  {:else}
    <div class="c-reader-inner">
      {@render head?.()}
      {@render body?.()}
      {@render foot?.()}
    </div>
  {/if}
</section>

<style>
  .c-reader {
    padding: 0 32px 120px;
    max-width: 100%;
    min-width: 0;
  }

  .c-reader-inner {
    max-width: var(--reader-measure, 780px);
    margin: 0 auto;
    padding: 48px 8px 40px;
    box-sizing: border-box;
  }

  .c-reader-inner--tail {
    padding-top: 0;
  }

  .c-reader-inner.head-fullwidth {
    max-width: none;
    padding-left: 40px;
    padding-right: 40px;
  }

  @media (max-width: 720px) {
    .c-reader-inner.head-fullwidth {
      padding-left: 20px;
      padding-right: 20px;
    }
  }

  @media (max-width: 720px) {
    .c-reader {
      padding: 0 20px 80px;
    }

    .c-reader-inner {
      padding: 32px 0 20px;
    }
  }
</style>
