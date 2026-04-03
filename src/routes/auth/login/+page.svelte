<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
  <title>Sign in</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
  <div class="w-full max-w-sm">
    <div class="mb-8 text-center">
      <h1 class="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-2">We'll send you a magic link</p>
    </div>

    {#if form?.sent}
      <div class="p-4 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg text-center">
        <p class="text-sm text-emerald-700 dark:text-emerald-300 font-medium">Check your email</p>
        <p class="text-sm text-emerald-600 dark:text-emerald-400 mt-1">We sent a magic link to <strong>{form.email}</strong></p>
      </div>
    {:else}
      <form method="POST" use:enhance>
        {#if form?.error}
          <p class="text-sm text-red-500 mb-4 text-center">{form.error}</p>
        {/if}

        <div class="flex flex-col gap-3">
          <input
            type="email"
            name="email"
            placeholder="you@example.com"
            required
            autofocus
            class="w-full px-4 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
          <button
            type="submit"
            class="w-full px-4 py-2.5 text-sm font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
          >
            Send magic link
          </button>
        </div>
      </form>
    {/if}
  </div>
</div>
