<script lang="ts">
  import '../app.css';
  import Header from '$lib/components/Header.svelte';

  interface Props {
    data: { user: { id: string; email: string; username: string } | null };
    children: import('svelte').Snippet;
  }
  let { data, children }: Props = $props();
</script>

<svelte:head>
  <script>
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  </script>
</svelte:head>

<div class="min-h-screen" style="background: var(--bg); color: var(--text-primary);">
  <Header user={data.user} />
  {@render children()}
</div>
