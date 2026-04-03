<script lang="ts">
  interface Props {
    html: string;
    title?: string | null;
  }
  let { html, title = null }: Props = $props();
</script>

<article class="prose prose-zinc dark:prose-invert max-w-none">
  {#if title}
    <h1>{title}</h1>
  {/if}
  {@html html}
</article>
