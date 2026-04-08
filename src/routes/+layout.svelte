<script lang="ts">
  import '../app.css';
  import Header from '$lib/components/Header.svelte';

  interface Props {
    data: { user: { id: string; email: string; username: string } | null };
    children: import('svelte').Snippet;
  }
  let { data, children }: Props = $props();
</script>

<div class="min-h-screen" style="background: var(--bg); color: var(--text-primary); position: relative;">
  <div style="position: relative; z-index: 1;">
    <Header user={data.user} />
    {@render children()}
  </div>
</div>
