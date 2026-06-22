<script lang="ts">
  import { enhance } from '$app/forms';
  import AuthSignInPanel from '$lib/components/auth/AuthSignInPanel.svelte';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

{#snippet subtitleSnippet()}
  {#if data.user}
    <strong>{data.clientHost}</strong> is requesting access to your vibe.pub account as
    <strong>@{data.user.username}</strong>
  {:else}
    Sign in to connect <strong>{data.clientHost}</strong> to vibe.pub
  {/if}
{/snippet}

{#snippet emailSuccess()}
  <p>
    We sent a magic link to <strong>{form?.email}</strong>. After you sign in, you'll return here to
    approve the connection.
  </p>
{/snippet}

{#snippet loggedIn()}
  <div class="oauth-consent">
    {#if form?.error}
      <p class="error-msg">{form.error}</p>
    {/if}

    <p class="scope-label">This app will be able to:</p>
    <ul class="scope-list">
      {#each data.scope as item}
        <li>{item}</li>
      {/each}
    </ul>

    <form method="POST" action="?/authorize" use:enhance>
      <button type="submit" class="submit-btn authorize-btn">Allow access</button>
    </form>
    <form method="POST" action="?/deny" use:enhance>
      <button type="submit" class="email-toggle">Deny</button>
    </form>
    <p class="privacy-link">
      <a href="/privacy">Privacy Policy</a>
    </p>
  </div>
{/snippet}

<AuthSignInPanel
  pageTitle="Connect to vibe.pub"
  titleBefore="Connect "
  titleEm="vibe.pub"
  subtitle={data.user ? '' : `Authorize ${data.clientHost}`}
  {subtitleSnippet}
  footer={data.user
    ? 'You can revoke access anytime from your account settings'
    : 'OAuth connection for Claude and other MCP clients'}
  emailFormAction="?/magicLink"
  {form}
  {emailSuccess}
  loggedIn={data.user ? loggedIn : undefined}
/>

<style>
  .oauth-consent {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .scope-label {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0;
  }

  .scope-list {
    margin: 0 0 8px;
    padding-left: 1.2rem;
    font-size: 13px;
    color: var(--text-primary);
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

  .privacy-link {
    margin: 8px 0 0;
    text-align: center;
    font-size: 12px;
  }

  .privacy-link a {
    color: var(--text-tertiary);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
</style>
