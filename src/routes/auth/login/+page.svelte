<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
  <title>Sign in — vibe.pub</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center px-6" style="background: var(--bg);">
  <div style="width: 100%; max-width: 360px;">
    <div style="margin-bottom: 32px; text-align: center;">
      <h1 style="font-size: 24px; font-weight: 600; letter-spacing: -0.48px; color: var(--text-primary); margin: 0 0 8px 0;">Sign in</h1>
      <p style="font-size: 14px; color: var(--text-secondary); margin: 0;">We'll send you a magic link</p>
    </div>

    {#if form?.sent}
      <div style="padding: 16px 20px; background: rgba(34,197,94,0.08); box-shadow: 0 0 0 1px rgba(34,197,94,0.2); border-radius: 8px; text-align: center;">
        <p style="font-size: 14px; color: #22c55e; font-weight: 500; margin: 0 0 4px 0;">Check your email</p>
        <p style="font-size: 14px; color: var(--text-secondary); margin: 0;">We sent a magic link to <strong>{form.email}</strong></p>
      </div>
    {:else}
      <form method="POST" use:enhance>
        {#if form?.error}
          <p style="font-size: 13px; color: #ef4444; margin-bottom: 16px; text-align: center;">{form.error}</p>
        {/if}

        <div class="flex flex-col gap-3">
          <input
            type="email"
            name="email"
            placeholder="you@example.com"
            required
            autofocus
            style="width: 100%; padding: 10px 14px; font-size: 15px; background: var(--surface); box-shadow: var(--shadow-card); border: none; outline: none; border-radius: 6px; color: var(--text-primary); transition: box-shadow 150ms; box-sizing: border-box;"
            onfocus={(e) => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 2px var(--accent), 0 0 0 4px rgba(59,130,246,0.15)'}
            onblur={(e) => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)'}
          />
          <button
            type="submit"
            style="width: 100%; padding: 10px 16px; font-size: 14px; font-weight: 500; background: var(--accent); color: var(--bg); border: none; border-radius: 6px; cursor: pointer; transition: background-color 150ms;"
            onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'}
            onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--accent)'}
          >
            Send magic link
          </button>
        </div>
      </form>
    {/if}
  </div>
</div>
