<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
  <title>Sign in — vibe.pub</title>
</svelte:head>

<div class="login-page">
  <div class="login-card">

    <!-- Brand -->
    <div class="login-brand">
      <a href="/" class="brand-link">
        <span class="brand-vibe">vibe</span><span class="brand-pub">.pub</span>
      </a>
    </div>

    <div class="login-header">
      <h1 class="login-title">Sign in</h1>
      <p class="login-subtitle">We'll send you a magic link</p>
    </div>

    {#if form?.sent}
      <div class="success-box">
        <p class="success-title">Check your email</p>
        <p class="success-body">We sent a magic link to <strong>{form.email}</strong></p>
      </div>
    {:else}
      <form method="POST" use:enhance>
        {#if form?.error}
          <p class="error-msg">{form.error}</p>
        {/if}

        <div class="form-fields">
          <input
            type="email"
            name="email"
            placeholder="you@example.com"
            required
            autofocus
            class="form-input"
          />
          <button type="submit" class="submit-btn">
            Send magic link
          </button>
        </div>
      </form>
    {/if}

  </div>
</div>

<style>
  .login-page {
    min-height: calc(100vh - 52px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: var(--bg);
  }

  .login-card {
    width: 100%;
    max-width: 360px;
    background: var(--surface);
    box-shadow: var(--shadow-elevated);
    border-radius: var(--radius-card);
    padding: 36px;
  }

  .login-brand {
    text-align: center;
    margin-bottom: 28px;
  }

  .brand-link {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 22px;
    font-weight: 400;
    letter-spacing: -0.3px;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
  }

  .brand-vibe {
    color: var(--text-tertiary);
  }

  .brand-pub {
    color: var(--text-primary);
  }

  .login-header {
    text-align: center;
    margin-bottom: 24px;
  }

  .login-title {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--text-primary);
    margin: 0 0 6px 0;
  }

  .login-subtitle {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
  }

  .success-box {
    padding: 16px 20px;
    background: rgba(34, 197, 94, 0.08);
    box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.2);
    border-radius: 8px;
    text-align: center;
  }

  .success-title {
    font-size: 14px;
    color: #22c55e;
    font-weight: 500;
    margin: 0 0 4px 0;
  }

  .success-body {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
  }

  .error-msg {
    font-size: 13px;
    color: #ef4444;
    margin-bottom: 16px;
    text-align: center;
  }

  .form-fields {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .form-input {
    width: 100%;
    padding: 11px 16px;
    font-size: 15px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-input);
    outline: none;
    color: var(--text-primary);
    transition: border-color 150ms, box-shadow 150ms;
    box-sizing: border-box;
  }

  .form-input:focus {
    border-color: var(--border-hover);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }

  .form-input::placeholder {
    color: var(--text-tertiary);
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
    transition: background-color 150ms, box-shadow 150ms;
  }

  .submit-btn:hover {
    background: var(--accent-hover);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.08);
  }
</style>
