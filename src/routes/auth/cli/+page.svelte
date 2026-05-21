<script lang="ts">
  import { enhance } from '$app/forms';
  import AuthSignInPanel from '$lib/components/auth/AuthSignInPanel.svelte';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

{#snippet subtitleSnippet()}
  {#if data.user}
    Allow vibe-pub on your machine to access your account as <strong>@{data.user.username}</strong>
  {/if}
{/snippet}

{#snippet emailSuccess()}
  <p>
    We sent a magic link to <strong>{form?.email}</strong>. After you sign in, return here to
    authorize the CLI.
  </p>
{/snippet}

{#snippet loggedIn()}
  <div class="cli-logged-in">
    {#if form?.error}
      <p class="error-msg">{form.error}</p>
    {/if}
    <form method="POST" action="?/authorize" use:enhance>
      <button type="submit" class="submit-btn authorize-btn">Authorize vibe-pub CLI</button>
    </form>
    <form method="POST" action="?/signOut" use:enhance>
      <button type="submit" class="email-toggle">Use a different account</button>
    </form>
  </div>
{/snippet}

<AuthSignInPanel
  pageTitle="Authorize CLI — vibe.pub"
  titleBefore="Authorize "
  titleEm="CLI"
  subtitle={data.user ? '' : 'Sign in, then approve access for your terminal'}
  {subtitleSnippet}
  footer={data.user
    ? 'you stay signed in on the web · CLI only after you approve'
    : 'waiting for your terminal · link expires in 15 min'}
  emailFormAction="?/magicLink"
  {form}
  {emailSuccess}
  loggedIn={data.user ? loggedIn : undefined}
/>

<style>
  .cli-logged-in {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .error-msg {
    font-size: 13px;
    color: #ef4444;
    margin-bottom: 4px;
    text-align: center;
  }

  .submit-btn {
    width: 100%;
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 500;
    background: var(--accent);
    color: var(--bg);
    border: none;
    border-radius: var(--radius-button);
    cursor: pointer;
  }

  .email-toggle {
    width: 100%;
    padding: 11px 16px;
    font-size: 14px;
    font-weight: 500;
    font-family: var(--font-sans);
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-button);
    cursor: pointer;
  }
</style>
