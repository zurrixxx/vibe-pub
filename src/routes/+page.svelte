<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageTheme } from '$lib/types';

  interface Props {
    form: { url?: string; slug?: string; error?: string } | null;
  }
  let { form }: Props = $props();

  let view = $state<'doc' | 'kanban'>('doc');
  let theme = $state<PageTheme>('default');

  const themes: { name: PageTheme; dot: string }[] = [
    { name: 'default',   dot: '#a1a1aa' },
    { name: 'paper',     dot: '#92400e' },
    { name: 'terminal',  dot: '#4ade80' },
    { name: 'midnight',  dot: '#818cf8' },
    { name: 'rose',      dot: '#be185d' },
    { name: 'ocean',     dot: '#0284c7' },
    { name: 'stripe',    dot: '#635bff' },
    { name: 'claude',    dot: '#c96442' },
    { name: 'raycast',   dot: '#ff6363' },
    { name: 'nord',      dot: '#5e81ac' },
    { name: 'monokai',   dot: '#a6e22e' },
    { name: 'dracula',   dot: '#ff79c6' },
    { name: 'solarized', dot: '#268bd2' },
    { name: 'github',    dot: '#0969da' },
  ];
</script>

<svelte:head>
  <title>vibe.pub — publish markdown, get a link</title>
</svelte:head>

<main class="max-w-[680px] mx-auto px-6 py-16 animate-fade-in-up">

  <!-- Hero -->
  <div style="margin-bottom: 40px; text-align: left;">
    <h1 style="font-family: var(--font-sans); font-size: 36px; font-weight: 600; letter-spacing: -0.04em; color: var(--text-primary); margin: 0 0 12px 0; line-height: 1.1;">
      vibe.pub
    </h1>
    <p style="font-size: 16px; color: var(--text-secondary); margin: 0; line-height: 1.5;">
      Publish markdown. Get a beautiful link.
    </p>
  </div>

  <!-- Success banner -->
  {#if form?.url}
    <div style="margin-bottom: 28px; padding: 14px 18px; background: rgba(34,197,94,0.08); box-shadow: 0 0 0 1px rgba(34,197,94,0.18); border-radius: 8px; font-family: var(--font-mono); font-size: 13px; animation: fadeInUp 0.25s ease both;">
      <span style="color: var(--text-tertiary);">published → </span>
      <a
        href={`/${form.slug}`}
        style="color: var(--text-primary); text-decoration: underline; text-underline-offset: 4px; text-decoration-color: rgba(34,197,94,0.4); transition: text-decoration-color 150ms; word-break: break-all;"
        onmouseenter={(e) => (e.currentTarget as HTMLElement).style.textDecorationColor = '#22c55e'}
        onmouseleave={(e) => (e.currentTarget as HTMLElement).style.textDecorationColor = 'rgba(34,197,94,0.4)'}
      >
        {form.url}
      </a>
    </div>
  {/if}

  {#if form?.error}
    <div style="margin-bottom: 16px; font-family: var(--font-mono); font-size: 13px; color: #ef4444;">{form.error}</div>
  {/if}

  <!-- Editor card -->
  <form method="POST" action="?/publish" use:enhance>
    <div style="background: var(--surface); box-shadow: var(--shadow-elevated); border-radius: 10px; overflow: hidden;">

      <!-- Editor title bar -->
      <div style="padding: 10px 16px; border-bottom: 1px solid var(--border);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-family: var(--font-mono); font-size: 12px; color: var(--text-tertiary);">New page</span>

          <!-- Segmented view control -->
          <div style="display: flex; background: var(--bg); border-radius: 6px; padding: 2px; gap: 1px; border: 1px solid var(--border);">
            {#each (['doc', 'kanban'] as const) as v}
              <button
                type="button"
                onclick={() => { view = v; }}
                style="font-family: var(--font-mono); font-size: 12px; padding: 4px 10px; border-radius: 4px; border: none; cursor: pointer; transition: background 150ms, color 150ms; {view === v ? 'background: var(--surface-hover); color: var(--text-primary);' : 'background: transparent; color: var(--text-tertiary);'}"
              >
                {v}
              </button>
            {/each}
          </div>
        </div>

        <!-- Theme pill row -->
        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
          {#each themes as t}
            <button
              type="button"
              onclick={() => { theme = t.name; }}
              style="display: flex; align-items: center; gap: 5px; font-family: var(--font-mono); font-size: 11px; padding: 3px 9px; border-radius: 9999px; border: 1px solid {theme === t.name ? t.dot : 'var(--border)'}; cursor: pointer; transition: border-color 150ms, background 150ms, color 150ms; background: {theme === t.name ? t.dot + '18' : 'transparent'}; color: {theme === t.name ? 'var(--text-primary)' : 'var(--text-tertiary)'};"
            >
              <span style="width: 7px; height: 7px; border-radius: 50%; background: {t.dot}; display: inline-block; flex-shrink: 0;"></span>
              {t.name}
            </button>
          {/each}
        </div>
      </div>

      <!-- Textarea -->
      <textarea
        name="markdown"
        placeholder="# Your title&#10;&#10;Start writing in markdown..."
        rows={16}
        style="width: 100%; font-family: var(--font-mono); font-size: 14px; line-height: 1.7; background: transparent; border: none; outline: none; padding: 20px 24px; resize: vertical; color: var(--text-primary);"
      ></textarea>
    </div>

    <input type="hidden" name="view" value={view} />
    <input type="hidden" name="theme" value={theme} />

    <!-- Action bar -->
    <div class="mt-4 flex items-center gap-3">
      <button
        type="submit"
        style="font-family: var(--font-sans); font-size: 14px; font-weight: 500; padding: 9px 20px; background: var(--accent); color: var(--bg); border: none; border-radius: 7px; cursor: pointer; transition: background-color 150ms, box-shadow 150ms; display: flex; align-items: center; gap: 8px;"
        onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(255,255,255,0.08)'; }}
        onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--accent)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
      >
        Publish
        <span style="font-family: var(--font-mono); font-size: 11px; opacity: 0.5; letter-spacing: 0;">⌘↵</span>
      </button>
    </div>
  </form>

  <!-- CLI section -->
  <div style="margin-top: 56px; padding-top: 40px; border-top: 1px solid var(--border);">
    <p style="font-family: var(--font-mono); font-size: 12px; color: var(--text-tertiary); margin: 0 0 16px 0; letter-spacing: 0.04em; text-transform: uppercase;">or use the CLI</p>

    <div style="background: var(--surface); box-shadow: var(--shadow-card); border-radius: 8px; overflow: hidden;">
      <div style="padding: 10px 16px; border-bottom: 1px solid var(--border); font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.06em;">Terminal</div>
      <div style="padding: 16px 20px; display: flex; flex-direction: column; gap: 8px;">
        <pre style="font-family: var(--font-mono); font-size: 13px; color: var(--text-secondary); margin: 0; white-space: pre-wrap;">curl -X POST vibe.pub/api/pub \
  -d @file.md</pre>
        <pre style="font-family: var(--font-mono); font-size: 13px; color: var(--text-secondary); margin: 0; white-space: pre-wrap;">cat README.md | curl -X POST vibe.pub/api/pub -d @-</pre>
        <pre style="font-family: var(--font-mono); font-size: 13px; color: var(--text-secondary); margin: 0; white-space: pre-wrap;">curl -X POST vibe.pub/api/pub \
  -d @notes.md \
  -H "X-View: kanban"</pre>
      </div>
    </div>
  </div>

  <!-- Features strip -->
  <div style="margin-top: 40px; display: flex; flex-wrap: wrap; gap: 8px;">
    {#each ['doc view', 'kanban view', 'comments', 'API', 'no login required'] as feat}
      <span style="font-family: var(--font-mono); font-size: 12px; color: var(--text-tertiary); padding: 4px 10px; background: var(--surface); border-radius: 9999px; box-shadow: var(--shadow-border);">
        {feat}
      </span>
    {/each}
  </div>

  <!-- Footer -->
  <p style="margin-top: 48px; font-size: 12px; color: var(--text-tertiary);">Built for developers.</p>

</main>
