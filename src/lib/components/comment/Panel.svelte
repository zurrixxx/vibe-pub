<script lang="ts">
  import { browser } from '$app/environment';
  import { tick } from 'svelte';
  import { parseBlockReviseCommentBody, serializeBlockReviseCommentBody } from './block-revise';
  import {
    blockReviseShouldCollapse,
    commentAnchoredToBlock,
    commentAvatarLetter,
    commentHandle,
    commentTimeAgo,
    isAgentComment,
    normalizeCommentRow,
    parseBlockAnchorId,
    shouldCollapseCommentBody,
  } from './utils';
  import { listDocViewBlockIdsInOrder } from '$lib/doc-view-block-ids';
  import { closeReaderAppearancePanel } from '$lib/components/topbar';
  import {
    cancelDeferredCommentsPanelBlockClear,
    closeDocCommentsPanel,
    closeReaderHistoryPanel,
    docCommentsPanelBlockId,
    docCommentsPanelOpen,
    docCommentsPanelPageId,
  } from '$lib/stores';
  import type { BlockReviseSuggestResponse, Comment } from '$lib/types';
  import './panel.css';

  interface Props {
    /** Page whose comments this panel shows */
    pageId: string;
    /** Doc HTML for block-order sorting (optional) */
    docHtml?: string;
    comments?: Comment[];
    topPx?: number;
    scrollHeaderOffsetPx?: number;
    /** Match PublishedPage outline slug pass-through */
    slugifyHeading?: (text: string) => string;
    /** Owner-only “Suggestion for revise” */
    enableBlockRevise?: boolean;
    /** History snapshot: read-only rail */
    snapshotReadonly?: boolean;
    /** e.g. edit mode on PublishedPage */
    hidden?: boolean;
  }

  let {
    pageId,
    docHtml = '',
    comments = $bindable([]),
    topPx = 56,
    scrollHeaderOffsetPx = 130,
    slugifyHeading,
    enableBlockRevise = false,
    snapshotReadonly = false,
    hidden = false,
  }: Props = $props();

  let panelOpen = $state(false);
  let panelBlockId = $state<string | null>(null);
  let panelPageId = $state<string | null>(null);
  let panelNewBody = $state('');
  let panelPosting = $state(false);
  let blockReviseLoading = $state(false);
  let blockReviseError = $state('');
  let blockRevisePanelKey = $state('');
  let commentBodyExpandedById = $state<Record<string, boolean>>({});
  let loadingComments = $state(false);

  $effect(() => {
    const u1 = docCommentsPanelOpen.subscribe((v) => (panelOpen = v));
    const u2 = docCommentsPanelBlockId.subscribe((v) => (panelBlockId = v));
    const u3 = docCommentsPanelPageId.subscribe((v) => (panelPageId = v));
    return () => {
      u1();
      u2();
      u3();
    };
  });

  const effectivePageId = $derived(panelPageId ?? pageId);

  let docBlockIdsInOrder = $derived.by(() =>
    listDocViewBlockIdsInOrder(docHtml ?? '', slugifyHeading)
  );

  async function loadCommentsForPage(targetPageId: string) {
    if (!browser || !targetPageId) return;
    loadingComments = true;
    try {
      const res = await fetch(`/api/comment/${encodeURIComponent(targetPageId)}?all=1`);
      if (!res.ok) return;
      const rows = (await res.json()) as Comment[];
      comments = rows.map((c) => ({
        ...c,
        anchor:
          c.anchor == null
            ? null
            : typeof c.anchor === 'string'
              ? c.anchor
              : JSON.stringify(c.anchor),
      }));
    } catch {
      /* ignore */
    } finally {
      loadingComments = false;
    }
  }

  $effect(() => {
    if (!panelOpen || !effectivePageId) return;
    if (effectivePageId === pageId && comments.length > 0) return;
    void loadCommentsForPage(effectivePageId);
  });

  $effect(() => {
    if (!panelOpen) panelNewBody = '';
  });

  let panelCommentsFiltered = $derived.by((): Comment[] => {
    const bid = panelBlockId;
    if (!bid) {
      const open = comments.filter((c) => c.resolved === 0);
      const byTime = [...open].sort(
        (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime()
      );
      const seenBlock = new Set<string>();
      const picked: Comment[] = [];
      for (const c of byTime) {
        const b = parseBlockAnchorId(c);
        if (b) {
          if (seenBlock.has(b)) continue;
          seenBlock.add(b);
        }
        picked.push(c);
      }
      const order = docBlockIdsInOrder;
      const missingRank = Number.MAX_SAFE_INTEGER;
      const blockRank = (id: string | null) => {
        if (!id || order.length === 0) return missingRank;
        const i = order.indexOf(id);
        return i >= 0 ? i : missingRank;
      };
      picked.sort((a, b) => {
        const ra = blockRank(parseBlockAnchorId(a));
        const rb = blockRank(parseBlockAnchorId(b));
        if (ra !== rb) return ra - rb;
        return new Date(b.created).getTime() - new Date(a.created).getTime();
      });
      return picked;
    }
    return comments.filter((c) => commentAnchoredToBlock(c, bid));
  });

  let panelGlobalAllResolved = $derived(
    !panelBlockId && comments.length > 0 && panelCommentsFiltered.length === 0
  );

  let panelBlockThreadAllResolved = $derived.by(() => {
    const bid = panelBlockId;
    if (!bid) return false;
    const thread = comments.filter((c) => commentAnchoredToBlock(c, bid));
    return thread.length > 0 && thread.every((c) => c.resolved !== 0);
  });

  let panelBlockHasOpenComment = $derived.by(() => {
    const bid = panelBlockId;
    if (!bid) return false;
    return comments.some((c) => commentAnchoredToBlock(c, bid) && c.resolved === 0);
  });

  async function openThreadFromGlobalComment(comment: Comment) {
    if (panelBlockId !== null) return;
    const bid = parseBlockAnchorId(comment);
    if (!bid || !browser) return;
    cancelDeferredCommentsPanelBlockClear();
    docCommentsPanelBlockId.set(bid);
    await tick();
    const el = document.getElementById(bid);
    if (!(el instanceof HTMLElement)) return;
    requestAnimationFrame(() => {
      const y = el.getBoundingClientRect().top + window.scrollY - scrollHeaderOffsetPx;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    });
  }

  async function postPanelBlockComment() {
    if (snapshotReadonly || !panelBlockId || !panelNewBody.trim() || !effectivePageId) return;
    panelPosting = true;
    try {
      const anchor = { type: 'block', block_id: panelBlockId };
      const res = await fetch(`/api/comment/${effectivePageId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: panelNewBody.trim(),
          anchor,
          anchor_hint: panelBlockId,
        }),
      });
      if (res.ok) {
        const saved = (await res.json().catch(() => null)) as
          | (Partial<Comment> & { anchor?: unknown })
          | null;
        if (saved && typeof saved.id === 'string') {
          comments = [
            ...comments,
            normalizeCommentRow(saved, effectivePageId, panelNewBody.trim(), panelBlockId),
          ];
        }
        panelNewBody = '';
      }
    } catch {
      /* ignore */
    }
    panelPosting = false;
  }

  async function persistBlockReviseSuggestionComment(
    r: BlockReviseSuggestResponse,
    blockIdForPersist: string
  ): Promise<boolean> {
    if (!browser || !enableBlockRevise || !effectivePageId) return false;
    const bodyText = serializeBlockReviseCommentBody(r);
    if (!bodyText.trim()) return false;
    try {
      const anchor = { type: 'block', block_id: blockIdForPersist };
      const res = await fetch(`/api/comment/${effectivePageId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: bodyText,
          anchor,
          anchor_hint: blockIdForPersist,
          display_name: 'agent',
          agent_published: true,
        }),
      });
      if (!res.ok) return false;
      const saved = (await res.json().catch(() => null)) as
        | (Partial<Comment> & { anchor?: unknown })
        | null;
      if (!saved || typeof saved.id !== 'string') return false;
      comments = [
        ...comments,
        normalizeCommentRow(saved, effectivePageId, bodyText, blockIdForPersist),
      ];
      return true;
    } catch {
      return false;
    }
  }

  async function requestBlockReviseSuggestion() {
    if (
      !browser ||
      snapshotReadonly ||
      !panelBlockId ||
      !panelBlockHasOpenComment ||
      !enableBlockRevise
    )
      return;
    const el = document.getElementById(panelBlockId);
    const block_plain_text = (el?.innerText ?? '').replace(/\s+/g, ' ').trim();
    if (!block_plain_text) {
      blockReviseError = "Could not read this block's text from the page.";
      return;
    }
    const docRoot = document.querySelector('article.doc-view');
    let doc_plain_text = (docRoot instanceof HTMLElement ? docRoot.innerText : '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!doc_plain_text) doc_plain_text = block_plain_text;
    const anchorBlockId = panelBlockId;
    blockReviseLoading = true;
    blockReviseError = '';
    try {
      const res = await fetch(`/api/pub/${effectivePageId}/block-revise-suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          block_id: anchorBlockId,
          block_plain_text: block_plain_text.slice(0, 12_000),
          doc_plain_text: doc_plain_text.slice(0, 120_000),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
      } & Partial<BlockReviseSuggestResponse>;
      if (!res.ok) {
        blockReviseError =
          typeof data.message === 'string' && data.message
            ? data.message
            : `Request failed (${res.status})`;
        return;
      }
      const newResult: BlockReviseSuggestResponse = {
        summary: typeof data.summary === 'string' ? data.summary : '',
        pairs: Array.isArray(data.pairs) ? data.pairs : [],
      };
      const persisted = await persistBlockReviseSuggestionComment(newResult, anchorBlockId);
      if (!persisted) {
        blockReviseError =
          'The suggestion was generated but could not be saved as a comment. Please try again.';
      }
    } catch {
      blockReviseError = 'Network error.';
    } finally {
      blockReviseLoading = false;
    }
  }

  $effect(() => {
    const key = panelOpen && panelBlockId ? `${panelBlockId}` : '';
    if (!panelOpen) commentBodyExpandedById = {};
    if (key !== blockRevisePanelKey) {
      blockReviseError = '';
      blockReviseLoading = false;
      blockRevisePanelKey = key;
    }
  });

  function toggleCommentBodyExpanded(e: MouseEvent, id: string) {
    e.stopPropagation();
    commentBodyExpandedById = {
      ...commentBodyExpandedById,
      [id]: !commentBodyExpandedById[id],
    };
  }

  $effect(() => {
    if (!browser || hidden) return;
    document.body.classList.toggle('comments-panel-open', panelOpen);
    return () => document.body.classList.remove('comments-panel-open');
  });

  $effect(() => {
    if (!browser || hidden || !panelOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeDocCommentsPanel();
        closeReaderHistoryPanel();
        closeReaderAppearancePanel();
      }
    }
    function onDocClick(e: MouseEvent) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest('#comments-panel')) return;
      if (t.closest('#reader-history-panel')) return;
      if (t.closest('.appearance-panel')) return;
      if (t.closest('[aria-controls="comments-panel"]')) return;
      if (t.closest('.bcb')) return;
      closeDocCommentsPanel();
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onDocClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onDocClick);
    };
  });
</script>

{#if !hidden}
  <aside
    class="comments-panel"
    class:open={panelOpen}
    class:comments-panel--thread-resolved={!!panelBlockId && panelBlockThreadAllResolved}
    id="comments-panel"
    aria-hidden={!panelOpen}
    style:top="{topPx}px"
  >
    <div class="rail-head comments-panel-head">
      <div class="comments-panel-head-text">
        {#if panelBlockId && panelBlockThreadAllResolved}
          <span class="rail-h thread-kicker-resolved">THREAD · RESOLVED</span>
        {:else if panelBlockId}
          <div class="comments-panel-head-block-row">
            <span class="rail-h comments-panel-thread-kicker"
              >thread · {panelCommentsFiltered.length}{panelCommentsFiltered.length === 1
                ? ' reply'
                : ' replies'}</span
            >
            {#if panelBlockHasOpenComment && enableBlockRevise}
              <button
                type="button"
                class="comments-panel-suggest-btn"
                class:comments-panel-suggest-btn--busy={blockReviseLoading}
                disabled={blockReviseLoading}
                onclick={() => void requestBlockReviseSuggestion()}
              >
                {blockReviseLoading ? '…' : 'Suggestion for revise'}
              </button>
            {/if}
          </div>
        {:else}
          <span class="rail-h">open · {panelCommentsFiltered.length}</span>
        {/if}
      </div>
      <button
        type="button"
        class="comments-panel-close"
        aria-label="Close comments"
        onclick={() => closeDocCommentsPanel()}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg
        >
      </button>
    </div>
    <div class="comments-panel-scroll">
      {#if loadingComments && comments.length === 0}
        <div class="empty-rail">
          <div class="empty-rail-c">Loading comments…</div>
        </div>
      {:else if panelBlockId && panelCommentsFiltered.length === 0}
        <div class="empty-rail empty-rail--block">
          <div class="empty-rail-h">No comments on this block yet.</div>
          <div class="empty-rail-c">
            {#if snapshotReadonly}
              Switch back to the <em>current</em> version to add a comment.
            {:else}
              Write one below — the agent will read it.
            {/if}
          </div>
        </div>
      {:else if !panelBlockId && comments.length === 0}
        <div class="empty-rail">
          <div class="empty-rail-h">No <em>comments</em> yet.</div>
          <div class="empty-rail-c">
            {#if snapshotReadonly}
              Replies are turned off while you view an older version. Use the <em>current</em> version
              to comment.
            {:else}
              Click any block to leave a comment. The agent will read it.
            {/if}
          </div>
        </div>
      {:else if panelGlobalAllResolved}
        <div class="empty-rail">
          <div class="empty-rail-h">Everything’s <em>resolved</em>.</div>
          <div class="empty-rail-c">This view only lists open threads.</div>
        </div>
      {:else}
        <div class="cp-list">
          {#each panelCommentsFiltered as comment (comment.id)}
            {@const navBid = !panelBlockId ? parseBlockAnchorId(comment) : null}
            {@const brPayload = isAgentComment(comment)
              ? parseBlockReviseCommentBody(comment.body)
              : null}
            {@const bodyLong = brPayload
              ? blockReviseShouldCollapse(brPayload)
              : shouldCollapseCommentBody(comment.body)}
            <article class="cp-comment">
              <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
              <div
                class="cp-comment-card"
                class:cp-comment-card--agent={isAgentComment(comment)}
                class:cp-comment-card--navigable={!!navBid}
                role={navBid ? 'button' : undefined}
                tabindex={navBid ? 0 : undefined}
                aria-label={navBid
                  ? 'Go to this paragraph in the article and open discussion'
                  : undefined}
                onclick={navBid
                  ? (e: MouseEvent) => {
                      const t = e.target;
                      if (
                        t instanceof Element &&
                        (t.closest('.cp-body-outer') || t.closest('.cp-block-revise-embed'))
                      )
                        return;
                      e.stopPropagation();
                      void openThreadFromGlobalComment(comment);
                    }
                  : undefined}
                onkeydown={navBid
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        void openThreadFromGlobalComment(comment);
                      }
                    }
                  : undefined}
              >
                <div class="cp-top">
                  <div
                    class="cp-avatar"
                    class:cp-avatar--agent={isAgentComment(comment)}
                    aria-hidden="true"
                  >
                    {#if isAgentComment(comment)}
                      <span class="cp-avatar-agent-mark">✦</span>
                    {:else}
                      {commentAvatarLetter(comment.display_name)}
                    {/if}
                  </div>
                  <header class="cp-comment-head">
                    <div class="cp-head-names">
                      <span class="cp-author">{commentHandle(comment.display_name)}</span>
                      {#if comment.resolved !== 0}
                        <span class="cp-status">Resolved</span>
                      {/if}
                    </div>
                    <span class="cp-time">{commentTimeAgo(comment.created)}</span>
                  </header>
                </div>
                {#if brPayload}
                  <div class="block-revise-card-body cp-block-revise-embed">
                    <div
                      class="block-revise-scroll"
                      class:block-revise-scroll--auto={!bodyLong}
                      class:block-revise-scroll--collapsed={bodyLong &&
                        !commentBodyExpandedById[comment.id]}
                      class:block-revise-scroll--expanded={bodyLong &&
                        !!commentBodyExpandedById[comment.id]}
                    >
                      {#if brPayload.summary}
                        <p class="block-revise-summary">{brPayload.summary}</p>
                      {/if}
                      {#each brPayload.pairs as pair, i (i)}
                        {#if pair.remove || pair.add}
                          <div class="block-revise-diff-wrap">
                            <div class="block-revise-diff-inner">
                              {#if pair.remove}
                                <div class="block-revise-line block-revise-remove">
                                  {pair.remove}
                                </div>
                              {/if}
                              {#if pair.add}
                                <div class="block-revise-line block-revise-add">{pair.add}</div>
                              {/if}
                            </div>
                          </div>
                        {/if}
                      {/each}
                    </div>
                    {#if bodyLong}
                      <button
                        type="button"
                        class="cp-body-toggle block-revise-toggle"
                        onclick={(e) => toggleCommentBodyExpanded(e, comment.id)}
                      >
                        {commentBodyExpandedById[comment.id] ? 'Show less' : 'Show more'}
                      </button>
                    {/if}
                  </div>
                {:else if bodyLong}
                  <div class="cp-body-outer">
                    <div
                      class="cp-body-scroll"
                      class:cp-body-scroll--collapsed={!commentBodyExpandedById[comment.id]}
                      class:cp-body-scroll--expanded={!!commentBodyExpandedById[comment.id]}
                    >
                      <p class="cp-body">{comment.body}</p>
                    </div>
                    <button
                      type="button"
                      class="cp-body-toggle"
                      onclick={(e) => toggleCommentBodyExpanded(e, comment.id)}
                    >
                      {commentBodyExpandedById[comment.id] ? 'Show less' : 'Show more'}
                    </button>
                  </div>
                {:else}
                  <p class="cp-body">{comment.body}</p>
                {/if}
              </div>
            </article>
          {/each}
          {#if panelBlockId && panelBlockThreadAllResolved}
            <div class="thread-resolved-footer" role="status">✓ resolved · now</div>
          {/if}
        </div>
      {/if}
      {#if panelBlockId && enableBlockRevise && (blockReviseLoading || blockReviseError)}
        <div class="block-revise-slot" aria-live="polite">
          {#if blockReviseLoading}
            <p class="block-revise-loading">Generating revise suggestion...</p>
          {:else if blockReviseError}
            <p class="block-revise-error" role="alert">{blockReviseError}</p>
          {/if}
        </div>
      {/if}
    </div>
    {#if panelBlockId && !snapshotReadonly}
      <div class="cp-compose">
        <div class="cp-compose-row">
          <input
            type="text"
            class="cp-compose-input"
            placeholder="Reply, or leave a new note…"
            bind:value={panelNewBody}
            onkeydown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void postPanelBlockComment();
              }
            }}
          />
          <button
            type="button"
            class="cp-compose-send"
            onclick={() => void postPanelBlockComment()}
            disabled={panelPosting || !panelNewBody.trim()}
          >
            {panelPosting ? '...' : 'Send'}
          </button>
        </div>
      </div>
    {/if}
  </aside>
{/if}
