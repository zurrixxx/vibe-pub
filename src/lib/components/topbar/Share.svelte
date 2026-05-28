<script lang="ts">
  import { browser } from '$app/environment';

  import ShareAccessPanel, {
    type ManageAccessConfig,
  } from '$lib/components/topbar/ShareAccessPanel.svelte';

  export interface ShareExports {
    markdownExportHref?: string;
    markdownDownloadName?: string;
    printExportHref?: string;
    intentX?: string;
    qrImgSrc?: string;
  }

  interface Props {
    shareUrl: string;
    /** Italic word in “Share this …” heading */
    subject?: 'page' | 'collection';
    exports?: ShareExports | null;
    onOpen?: () => void;
    manageAccess?: ManageAccessConfig | null;
  }

  let { shareUrl, subject = 'page', exports = null, onOpen, manageAccess = null }: Props = $props();

  let shareOpen = $state(false);
  let copyState = $state<'idle' | 'copied'>('idle');
  let shareQrOpen = $state(false);
  let saveToast = $state<{ message: string; kind: 'success' | 'error' } | null>(null);
  let toastLeaving = $state(false);
  let saveToastTimer: ReturnType<typeof setTimeout> | undefined;

  const hasExports = $derived(
    Boolean(
      exports?.markdownExportHref ||
      exports?.printExportHref ||
      exports?.intentX ||
      exports?.qrImgSrc
    )
  );

  function openShare(e: MouseEvent) {
    e.stopPropagation();
    shareOpen = true;
    copyState = 'idle';
    shareQrOpen = false;
    onOpen?.();
  }

  function closeShare() {
    shareOpen = false;
    shareQrOpen = false;
  }

  function dismissToast() {
    if (!saveToast || toastLeaving) return;
    toastLeaving = true;
  }

  function onToastAnimationEnd(e: AnimationEvent) {
    if (toastLeaving && e.animationName === 'share-toast-out') {
      saveToast = null;
      toastLeaving = false;
    }
  }

  function showToast(message: string, kind: 'success' | 'error') {
    if (saveToastTimer) clearTimeout(saveToastTimer);
    toastLeaving = false;
    saveToast = { message, kind };
    saveToastTimer = setTimeout(dismissToast, 1200);
  }

  function onAccessSaved() {
    closeShare();
    showToast('Access settings saved', 'success');
  }

  function onAccessSaveError(message: string) {
    showToast(message, 'error');
  }

  function toggleShareQr(e: MouseEvent) {
    e.stopPropagation();
    shareQrOpen = !shareQrOpen;
  }

  async function copyShareUrl() {
    if (!shareUrl || !browser) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      copyState = 'copied';
      setTimeout(() => {
        copyState = 'idle';
      }, 1800);
    } catch {
      copyState = 'idle';
    }
  }

  $effect(() => {
    if (!browser || !shareOpen) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (shareOpen && t.closest?.('.share-backdrop')) closeShare();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeShare();
    }
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  });
</script>

<button type="button" class="top-btn primary" onclick={openShare}>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
  </svg>
  Share
</button>

{#if shareOpen}
  <div class="share-backdrop open" onclick={closeShare} role="presentation"></div>
  <div
    class="share-modal open"
    role="dialog"
    aria-modal="true"
    aria-labelledby="reader-share-title"
  >
    <div class="share-head">
      <div>
        <h3 id="reader-share-title">Share this <em>{subject}</em></h3>
        <p>Readers don't need an account — the link just works.</p>
      </div>
      <button type="button" class="icon-btn" onclick={closeShare} aria-label="Close">✕</button>
    </div>
    <div class="copy-row">
      <div class="copy-url">{shareUrl}</div>
      <button
        type="button"
        class="copy-btn"
        class:copied={copyState === 'copied'}
        onclick={copyShareUrl}
      >
        {copyState === 'copied' ? 'Copied' : 'Copy'}
      </button>
    </div>
    {#if hasExports && exports}
      <div class="share-grid">
        {#if exports.qrImgSrc}
          <button type="button" class="share-action" onclick={toggleShareQr}>
            <span class="share-action-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" /><rect
                  x="14"
                  y="14"
                  width="7"
                  height="7"
                />
              </svg>
            </span>
            QR code
          </button>
        {/if}
        {#if exports.markdownExportHref}
          <a
            class="share-action"
            href={exports.markdownExportHref}
            download={exports.markdownDownloadName}
          >
            <span class="share-action-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path
                  d="M14 2v6h6"
                />
              </svg>
            </span>
            .md
          </a>
        {/if}
        {#if exports.printExportHref}
          <a
            class="share-action"
            href={exports.printExportHref}
            target="_blank"
            rel="noopener noreferrer"
            onclick={() => closeShare()}
          >
            <span class="share-action-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path
                  d="M14 2v6h6"
                /><path d="M9 15h6M9 11h6" />
              </svg>
            </span>
            PDF
          </a>
        {/if}
        {#if exports.intentX}
          <a
            class="share-action"
            href={exports.intentX}
            target="_blank"
            rel="noopener noreferrer"
            onclick={() => closeShare()}
          >
            <span class="share-action-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path
                  d="M15 3h6v6M10 14L21 3"
                />
              </svg>
            </span>
            X
          </a>
        {/if}
      </div>
      {#if shareQrOpen && exports.qrImgSrc}
        <div class="share-qr-preview">
          <img src={exports.qrImgSrc} width="200" height="200" alt="QR code" loading="lazy" />
        </div>
      {/if}
    {/if}
    {#if manageAccess}
      <ShareAccessPanel
        config={manageAccess}
        open={shareOpen}
        onSaveSuccess={onAccessSaved}
        onSaveError={onAccessSaveError}
      />
    {/if}
    <p class="share-foot">
      {manageAccess?.access === 'private'
        ? 'Private · sign in with a shared domain email or as a shared member to read'
        : 'Published · no login required to read'}
    </p>
  </div>
{/if}

{#if saveToast}
  <div
    class="share-toast"
    class:share-toast--success={saveToast.kind === 'success'}
    class:share-toast--error={saveToast.kind === 'error'}
    class:share-toast--leaving={toastLeaving}
    role="status"
    aria-live="polite"
    onanimationend={onToastAnimationEnd}
  >
    {saveToast.message}
  </div>
{/if}

<style>
  .top-btn {
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 500;
    padding: 7px 12px;
    border-radius: 999px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    line-height: 1;
  }

  .top-btn svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }

  .top-btn.primary {
    background: var(--text-primary);
    color: var(--bg);
    padding: 7px 14px;
    text-decoration: none;
  }

  .top-btn.primary:hover {
    filter: brightness(0.92);
  }

  :global(.dark) .top-btn.primary:hover {
    filter: brightness(1.1);
  }

  .share-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.2);
    z-index: 60;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  .share-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 480px;
    max-width: calc(100vw - 40px);
    max-height: calc(100vh - 40px);
    overflow-y: auto;
    background: color-mix(in srgb, #ebeae4 88%, var(--bg));
    border-radius: 24px;
    box-shadow:
      0 20px 60px rgba(0, 0, 0, 0.15),
      0 0 0 1px rgba(0, 0, 0, 0.06);
    padding: 28px;
    z-index: 61;
  }

  .share-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 18px;
    gap: 12px;
  }

  .share-head h3 {
    font-family: var(--font-serif);
    font-size: 24px;
    font-weight: 400;
    letter-spacing: -0.02em;
    margin: 0 0 4px;
    color: var(--text-primary);
  }

  .share-head h3 :global(em) {
    font-style: italic;
  }

  .share-head p {
    font-family: var(--font-sans);
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0;
  }

  .icon-btn {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .icon-btn:hover {
    background: rgba(0, 0, 0, 0.05);
    color: var(--text-primary);
  }

  .copy-row {
    display: flex;
    align-items: center;
    padding: 4px 4px 4px 14px;
    border-radius: 999px;
    background: var(--surface, #fff);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-card);
    margin-bottom: 18px;
    gap: 8px;
  }

  .copy-url {
    flex: 1;
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .copy-btn {
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 500;
    padding: 8px 16px;
    border-radius: 999px;
    border: none;
    background: var(--text-primary);
    color: var(--bg);
    cursor: pointer;
    flex-shrink: 0;
  }

  .copy-btn.copied {
    background: #15803d;
    color: #fff;
  }

  .share-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 14px;
  }

  .share-action {
    padding: 14px 8px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: transparent;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 500;
    color: var(--text-primary);
    text-decoration: none;
    box-sizing: border-box;
  }

  .share-action-icon svg {
    width: 18px;
    height: 18px;
  }

  .share-qr-preview {
    display: flex;
    justify-content: center;
    padding: 10px 0 6px;
    margin-bottom: 8px;
  }

  .share-foot {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
    text-align: center;
    margin: 0;
    padding-top: 8px;
  }

  .share-toast {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 70;
    padding: 12px 20px;
    border-radius: 999px;
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 500;
    color: #fff;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    pointer-events: none;
    animation: share-toast-in 0.28s ease-out forwards;
  }

  .share-toast--leaving {
    animation: share-toast-out 0.24s ease-in forwards;
  }

  .share-toast--success {
    background: var(--success, #22c55e);
  }

  .share-toast--error {
    background: #dc2626;
  }

  @keyframes share-toast-in {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-16px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  @keyframes share-toast-out {
    from {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    to {
      opacity: 0;
      transform: translateX(-50%) translateY(-16px);
    }
  }
</style>
