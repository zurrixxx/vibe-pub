<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
  let showEmail = $state(false);
</script>

<svelte:head>
  <title>Sign in — vibe.pub</title>
</svelte:head>

<div class="login-page">
  <div class="login-card">
    <!-- Brand -->
    <div class="login-brand">
      <a href="/" class="brand-link">vibe.pub</a>
    </div>

    <div class="login-header">
      <h1 class="login-title">Sign in</h1>
      <p class="login-subtitle">Continue with your account</p>
    </div>

    {#if form?.sent}
      <div class="success-box">
        <p class="success-title">Check your email</p>
        <p class="success-body">We sent a magic link to <strong>{form.email}</strong></p>
      </div>
    {:else}
      <div class="auth-options">
        <!-- GitHub -->
        <a href="/auth/github" class="oauth-btn github-btn">
          <svg class="oauth-icon" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
            />
          </svg>
          Continue with GitHub
        </a>

        <!-- Google -->
        <a href="/auth/google" class="oauth-btn google-btn">
          <svg class="oauth-icon" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </a>

        <!-- Divider -->
        <div class="divider">
          <span class="divider-line"></span>
          <span class="divider-text">or</span>
          <span class="divider-line"></span>
        </div>

        <!-- Magic link -->
        {#if showEmail}
          <form method="POST" use:enhance>
            {#if form?.error}
              <p class="error-msg">{form.error}</p>
            {/if}
            <div class="email-fields">
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                required
                autofocus
                class="form-input"
              />
              <button type="submit" class="submit-btn"> Send magic link </button>
            </div>
          </form>
        {:else}
          <button class="email-toggle" onclick={() => (showEmail = true)}>
            Continue with email
          </button>
        {/if}
      </div>
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
    font-family: 'DM Serif Display', Georgia, serif;
    font-size: 24px;
    font-weight: 400;
    letter-spacing: -0.01em;
    text-decoration: none;
    color: var(--text-primary);
  }

  .login-header {
    text-align: center;
    margin-bottom: 24px;
  }

  .login-title {
    font-family: 'Instrument Serif', Georgia, serif;
    font-size: 28px;
    font-weight: 400;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    margin: 0 0 6px 0;
  }

  .login-subtitle {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
  }

  /* OAuth buttons */
  .auth-options {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .oauth-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 11px 16px;
    font-size: 14px;
    font-weight: 500;
    font-family: var(--font-sans);
    border-radius: var(--radius-input);
    text-decoration: none;
    cursor: pointer;
    transition:
      background 150ms,
      border-color 150ms,
      box-shadow 150ms;
    box-sizing: border-box;
  }

  .oauth-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  .github-btn {
    background: #24292f;
    color: #fff;
    border: 1px solid #24292f;
  }

  .github-btn:hover {
    background: #32383f;
    border-color: #32383f;
  }

  .google-btn {
    background: var(--surface);
    color: var(--text-primary);
    border: 1px solid var(--border);
  }

  .google-btn:hover {
    background: var(--surface-hover);
    border-color: var(--border-hover);
  }

  /* Divider */
  .divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 6px 0;
  }

  .divider-line {
    flex: 1;
    height: 1px;
    background: var(--border);
  }

  .divider-text {
    font-size: 12px;
    color: var(--text-tertiary);
    font-family: var(--font-mono);
  }

  /* Email toggle */
  .email-toggle {
    width: 100%;
    padding: 11px 16px;
    font-size: 14px;
    font-weight: 500;
    font-family: var(--font-sans);
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-input);
    cursor: pointer;
    transition:
      color 150ms,
      border-color 150ms,
      background 150ms;
  }

  .email-toggle:hover {
    color: var(--text-primary);
    border-color: var(--border-hover);
    background: var(--surface-hover);
  }

  /* Email form */
  .email-fields {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* Success / error */
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
    margin-bottom: 12px;
    text-align: center;
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
    transition:
      border-color 150ms,
      box-shadow 150ms;
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
    transition:
      background-color 150ms,
      box-shadow 150ms;
  }

  .submit-btn:hover {
    background: var(--accent-hover);
  }
</style>
