<script lang="ts">
  import '../app.css';
  import Header from '$lib/components/Header.svelte';

  interface Props {
    data: { user: { id: string; email: string; username: string } | null };
    children: import('svelte').Snippet;
  }
  let { data, children }: Props = $props();
</script>

<div class="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
  <Header user={data.user} />
  {@render children()}
</div>
