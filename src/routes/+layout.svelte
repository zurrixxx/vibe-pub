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

<div class="min-h-screen" style="background: var(--bg); color: var(--text-primary); position: relative;">
  <!-- Top gradient glow — creates depth like Linear/Raycast -->
  <div style="position: fixed; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.08) 70%, transparent 100%); z-index: 50; pointer-events: none;"></div>
  <div style="position: fixed; top: 0; left: 50%; transform: translateX(-50%); width: 600px; height: 320px; background: radial-gradient(ellipse at top, rgba(99,102,241,0.04) 0%, transparent 70%); pointer-events: none; z-index: 0;"></div>

  <div style="position: relative; z-index: 1;">
    <Header user={data.user} />
    {@render children()}
  </div>
</div>
