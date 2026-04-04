<script lang="ts">
  import { enhance } from '$app/forms';

  interface Props {
    form: { url?: string; slug?: string; error?: string } | null;
  }
  let { form }: Props = $props();

  let view = $state<'doc' | 'kanban'>('doc');
  let showViewMenu = $state(false);
</script>

<svelte:head>
  <title>vibe.pub — paste markdown, get a link</title>
</svelte:head>

<main class="max-w-[680px] mx-auto px-6 py-20">
  <div class="mb-10">
    <p style="font-family: var(--font-mono); font-size: 13px; color: var(--text-tertiary); letter-spacing: 0;">
      Paste markdown. Get a link.
    </p>
  </div>

  {#if form?.url}
    <div style="margin-bottom: 32px; padding: 16px 20px; background: var(--surface); box-shadow: var(--shadow-card); border-radius: 8px; font-family: var(--font-mono); font-size: 13px;">
      <span style="color: var(--text-tertiary);">published → </span>
      <a
        href={`/${form.slug}`}
        style="color: var(--text-primary); text-decoration: underline; text-underline-offset: 4px; text-decoration-color: var(--border); transition: text-decoration-color 150ms; word-break: break-all;"
        onmouseenter={(e) => (e.currentTarget as HTMLElement).style.textDecorationColor = 'var(--text-primary)'}
        onmouseleave={(e) => (e.currentTarget as HTMLElement).style.textDecorationColor = 'var(--border)'}
      >
        {form.url}
      </a>
    </div>
  {/if}

  {#if form?.error}
    <div style="margin-bottom: 16px; font-family: var(--font-mono); font-size: 13px; color: #ef4444;">{form.error}</div>
  {/if}

  <form method="POST" action="?/publish" use:enhance>
    <textarea
      name="markdown"
      placeholder="# Your title&#10;&#10;Start writing..."
      rows={16}
      style="width: 100%; font-family: var(--font-mono); font-size: 14px; line-height: 1.6; background: var(--surface); box-shadow: var(--shadow-card); border: none; outline: none; border-radius: 8px; padding: 20px 24px; resize: vertical; color: var(--text-primary); transition: box-shadow 150ms;"
      onfocus={(e) => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 2px var(--accent), 0 0 0 4px rgba(59,130,246,0.15)'}
      onblur={(e) => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)'}
    ></textarea>

    <input type="hidden" name="view" value={view} />

    <div class="mt-4 flex items-center gap-3">
      <button
        type="submit"
        style="font-family: var(--font-sans); font-size: 14px; font-weight: 500; padding: 8px 16px; background: var(--accent); color: var(--bg); border: none; border-radius: 6px; cursor: pointer; transition: background-color 150ms;"
        onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'}
        onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--accent)'}
      >
        Publish
      </button>

      <div class="relative">
        <button
          type="button"
          onclick={() => (showViewMenu = !showViewMenu)}
          style="font-family: var(--font-mono); font-size: 13px; padding: 8px 12px; background: transparent; color: var(--text-secondary); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; transition: color 150ms, border-color 150ms;"
          onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)'; }}
          onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
        >
          view: {view} ▾
        </button>
        {#if showViewMenu}
          <div style="position: absolute; top: calc(100% + 4px); left: 0; background: var(--surface); box-shadow: var(--shadow-elevated); border-radius: 6px; overflow: hidden; z-index: 10; min-width: 120px;">
            {#each ['doc', 'kanban'] as v}
              <button
                type="button"
                onclick={() => { view = v as 'doc' | 'kanban'; showViewMenu = false; }}
                style="display: block; width: 100%; text-align: left; font-family: var(--font-mono); font-size: 13px; padding: 10px 16px; background: transparent; color: var(--text-secondary); border: none; cursor: pointer; transition: background-color 150ms, color 150ms;"
                onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
                onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
              >
                {v}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </form>

  <div style="margin-top: 48px; padding-top: 32px; border-top: 1px solid var(--border);">
    <p style="font-family: var(--font-mono); font-size: 12px; color: var(--text-tertiary); margin-bottom: 10px;">— or via curl —</p>
    <pre style="font-family: var(--font-mono); font-size: 13px; color: var(--text-secondary); background: var(--surface); box-shadow: var(--shadow-card); border-radius: 8px; padding: 16px 20px; overflow-x: auto; margin: 0;">curl -X POST vibe.pub/api/pub \
  -d @file.md</pre>
  </div>
</main>
