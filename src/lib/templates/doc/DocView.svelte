<script lang="ts">
  interface Props {
    html: string;
    title?: string | null;
  }
  let { html, title = null }: Props = $props();
</script>

<article class="prose dark:prose-invert max-w-[680px]" style="font-family: var(--font-prose, var(--font-sans)); --tw-prose-body: var(--text-primary); --tw-prose-headings: var(--text-primary); --tw-prose-links: var(--text-primary); --tw-prose-code: var(--text-primary); --tw-prose-quotes: var(--text-secondary); --tw-prose-quote-borders: var(--border); line-height: 1.8;">
  {#if title}
    <h1 style="font-family: var(--font-serif, Georgia, serif);">{title}</h1>
  {/if}
  {@html html}
</article>
