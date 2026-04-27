<script lang="ts">
  import type { Comment } from '$lib/types';
  import {
    serializeKanban,
    type KanbanCard,
    type KanbanColumn,
    type KanbanLabels,
  } from './serialize';
  import KanbanCardComponent from './KanbanCard.svelte';
  import { marked } from 'marked';

  interface Props {
    markdown: string;
    pageId: string;
    comments: Comment[];
    initialColumns: KanbanColumn[];
    initialLabels: KanbanLabels;
    isOwner?: boolean;
  }

  let {
    markdown,
    pageId,
    comments,
    initialColumns,
    initialLabels,
    isOwner = false,
  }: Props = $props();

  let columns = $state<KanbanColumn[]>(
    initialColumns.map((col) => ({
      title: col.title,
      cards: col.cards.map((c) => ({ ...c })),
    }))
  );
  let labels = $state<KanbanLabels>({ ...initialLabels });

  // Extract frontmatter from markdown for serialization (simple regex, no gray-matter)
  function getFrontmatter(): Record<string, unknown> {
    const match = markdown.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return { view: 'kanban' };
    const fm: Record<string, unknown> = { view: 'kanban' };
    for (const line of match[1].split('\n')) {
      const kv = line.match(/^(\w[\w-]*)\s*:\s*(.+)/);
      if (kv && kv[1] !== 'labels') {
        let val: unknown = kv[2].trim();
        if (val === 'true') val = true;
        else if (val === 'false') val = false;
        else if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"'))
          val = val.slice(1, -1);
        fm[kv[1]] = val;
      }
    }
    return fm;
  }

  function generateId(): string {
    return 'c' + Math.random().toString(36).slice(2, 8);
  }

  // Count comments per card (by block_id in anchor JSON)
  function commentCountForCard(cardId: string): number {
    return comments.filter((c) => {
      if (!c.anchor) return false;
      try {
        const a = JSON.parse(c.anchor);
        return a.block_id === cardId;
      } catch {
        return false;
      }
    }).length;
  }

  // Get body preview (first 2 non-empty lines)
  function bodyPreview(body: string): string {
    if (!body) return '';
    const lines = body.split('\n').filter((l) => l.trim());
    return lines.slice(0, 2).join(' ').slice(0, 120);
  }

  // ─── Modal state ───────────────────────────────────────────────
  let expandedCard = $state<KanbanCard | null>(null);
  let expandedColumnTitle = $state<string>('');
  let editMode = $state(false);
  let editTitle = $state('');
  let editBody = $state('');
  let saving = $state(false);

  function expandCard(card: KanbanCard, columnTitle: string) {
    expandedCard = { ...card };
    expandedColumnTitle = columnTitle;
    editMode = false;
  }

  function closeExpanded() {
    expandedCard = null;
    editMode = false;
  }

  function startEdit() {
    if (!expandedCard) return;
    editTitle = expandedCard.title;
    editBody = expandedCard.body;
    editMode = true;
  }

  async function saveEdit() {
    if (!expandedCard) return;
    saving = true;
    const fm = getFrontmatter();
    const newColumns = columns.map((col) => ({
      ...col,
      cards: col.cards.map((c) =>
        c.id === expandedCard!.id ? { ...c, title: editTitle, body: editBody } : c
      ),
    }));
    const newMarkdown = serializeKanban(fm, newColumns, labels);
    const ok = await putMarkdown(newMarkdown);
    if (ok) {
      window.location.reload();
    }
    saving = false;
  }

  async function deleteCard() {
    if (!expandedCard) return;
    if (!confirm(`Delete card "${expandedCard.title}"?`)) return;
    saving = true;
    const fm = getFrontmatter();
    const newColumns = columns.map((col) => ({
      ...col,
      cards: col.cards.filter((c) => c.id !== expandedCard!.id),
    }));
    const newMarkdown = serializeKanban(fm, newColumns, labels);
    const ok = await putMarkdown(newMarkdown);
    if (ok) {
      window.location.reload();
    }
    saving = false;
  }

  // ─── Add card ─────────────────────────────────────────────────
  let addingToColumn = $state<string | null>(null);
  let newCardTitle = $state('');

  function startAddCard(columnTitle: string) {
    addingToColumn = columnTitle;
    newCardTitle = '';
  }

  function cancelAddCard() {
    addingToColumn = null;
    newCardTitle = '';
  }

  async function confirmAddCard() {
    if (!newCardTitle.trim() || !addingToColumn) return;
    saving = true;
    const fm = getFrontmatter();
    const newId = generateId();
    const newColumns = columns.map((col) => {
      if (col.title !== addingToColumn) return col;
      return {
        ...col,
        cards: [
          ...col.cards,
          { id: newId, title: newCardTitle.trim(), labels: [], body: '', column: col.title },
        ],
      };
    });
    const newMarkdown = serializeKanban(fm, newColumns, labels);
    const ok = await putMarkdown(newMarkdown);
    if (ok) {
      window.location.reload();
    }
    saving = false;
  }

  // ─── Add column ───────────────────────────────────────────────
  let addingColumn = $state(false);
  let newColumnTitle = $state('');

  function startAddColumn() {
    addingColumn = true;
    newColumnTitle = '';
  }

  function cancelAddColumn() {
    addingColumn = false;
    newColumnTitle = '';
  }

  async function confirmAddColumn() {
    if (!newColumnTitle.trim()) return;
    saving = true;
    const fm = getFrontmatter();
    const newColumns = [...columns, { title: newColumnTitle.trim(), cards: [] }];
    const newMarkdown = serializeKanban(fm, newColumns, labels);
    const ok = await putMarkdown(newMarkdown);
    if (ok) {
      window.location.reload();
    }
    saving = false;
  }

  // ─── Drag-and-drop ────────────────────────────────────────────
  let dragCardId = $state<string | null>(null);
  let dragSourceColumn = $state<string | null>(null);
  let dragOverColumn = $state<string | null>(null);

  function onDragStart(e: DragEvent, card: KanbanCard, columnTitle: string) {
    dragCardId = card.id;
    dragSourceColumn = columnTitle;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', card.id);
    }
  }

  function onDragOver(e: DragEvent, columnTitle: string) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    dragOverColumn = columnTitle;
  }

  function onDragLeave(columnTitle: string) {
    if (dragOverColumn === columnTitle) dragOverColumn = null;
  }

  async function onDrop(e: DragEvent, targetColumnTitle: string) {
    e.preventDefault();
    dragOverColumn = null;
    if (!dragCardId || !dragSourceColumn) return;
    if (dragSourceColumn === targetColumnTitle) {
      dragCardId = null;
      dragSourceColumn = null;
      return;
    }

    // Find the card
    let movedCard: KanbanCard | null = null;
    for (const col of columns) {
      const found = col.cards.find((c) => c.id === dragCardId);
      if (found) {
        movedCard = { ...found };
        break;
      }
    }
    if (!movedCard) return;

    saving = true;
    const fm = getFrontmatter();
    const newColumns = columns.map((col) => {
      if (col.title === dragSourceColumn) {
        return { ...col, cards: col.cards.filter((c) => c.id !== dragCardId) };
      }
      if (col.title === targetColumnTitle) {
        return { ...col, cards: [...col.cards, { ...movedCard!, column: targetColumnTitle }] };
      }
      return col;
    });

    dragCardId = null;
    dragSourceColumn = null;

    const newMarkdown = serializeKanban(fm, newColumns, labels);
    const ok = await putMarkdown(newMarkdown);
    if (ok) {
      window.location.reload();
    }
    saving = false;
  }

  function onDragEnd() {
    dragCardId = null;
    dragSourceColumn = null;
    dragOverColumn = null;
  }

  // ─── API save ─────────────────────────────────────────────────
  async function putMarkdown(newMarkdown: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/pub/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: newMarkdown }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // ─── Per-card comments ────────────────────────────────────────
  // Local reactive copy of comments so we can append without reload
  let localComments = $state<typeof comments>(comments);
  $effect(() => {
    localComments = comments;
  });

  function cardComments(cardId: string) {
    return localComments.filter((c) => {
      if (!c.anchor) return false;
      try {
        const a = typeof c.anchor === 'string' ? JSON.parse(c.anchor) : c.anchor;
        return a.block_id === cardId;
      } catch {
        return false;
      }
    });
  }

  let commentName = $state('');
  let commentBody = $state('');
  let commentPosting = $state(false);
  let commentError = $state('');

  async function postComment() {
    if (!expandedCard || !commentBody.trim()) return;
    commentPosting = true;
    commentError = '';
    try {
      const res = await fetch(`/api/comment/${pageId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: commentBody.trim(),
          display_name: commentName.trim() || 'Anonymous',
          anchor: {
            type: 'block',
            block_type: 'card',
            block_id: expandedCard.id,
          },
          anchor_hint: expandedCard.title.slice(0, 80),
        }),
      });
      if (!res.ok) {
        commentError = 'Failed to post comment.';
      } else {
        const newComment = await res.json();
        localComments = [...localComments, newComment];
        commentBody = '';
      }
    } catch {
      commentError = 'Network error.';
    }
    commentPosting = false;
  }

  // ─── Checklist toggle ─────────────────────────────────────────
  let checklistSaving = $state(false);

  /**
   * Svelte action: attach click handlers to checkbox inputs in rendered markdown.
   * Re-attaches whenever the node updates (e.g. after toggle re-renders).
   */
  function checklistAction(node: HTMLElement) {
    function attachHandlers() {
      const inputs = node.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
      inputs.forEach((input, idx) => {
        if (!isOwner) {
          input.setAttribute('disabled', '');
          input.style.cursor = 'default';
          return;
        }
        input.removeAttribute('disabled');
        input.style.cursor = 'pointer';
        input.onclick = (e) => {
          e.preventDefault();
          toggleChecklist(idx);
        };
      });
    }
    attachHandlers();
    return {
      update() {
        attachHandlers();
      },
      destroy() {},
    };
  }

  async function toggleChecklist(checkboxIndex: number) {
    if (!expandedCard || checklistSaving) return;
    checklistSaving = true;

    const body = expandedCard.body;
    let count = 0;
    const newBody = body.replace(/^(\s*- \[)([x ])(\])/gm, (match, pre, state, post) => {
      if (count === checkboxIndex) {
        count++;
        return `${pre}${state === ' ' ? 'x' : ' '}${post}`;
      }
      count++;
      return match;
    });

    if (newBody === body) {
      checklistSaving = false;
      return;
    }

    const fm = getFrontmatter();
    const newColumns = columns.map((col) => ({
      ...col,
      cards: col.cards.map((c) => (c.id === expandedCard!.id ? { ...c, body: newBody } : c)),
    }));
    const newMarkdown = serializeKanban(fm, newColumns, labels);

    // Optimistic local update — no full reload needed
    expandedCard = { ...expandedCard, body: newBody };
    columns = newColumns;

    await putMarkdown(newMarkdown);
    checklistSaving = false;
  }
</script>

<div class="kanban-scroll">
  <div class="kanban-board">
    {#each columns as column}
      <div
        class="kanban-column"
        class:drop-target={dragOverColumn === column.title}
        ondragover={(e) => onDragOver(e, column.title)}
        ondragleave={() => onDragLeave(column.title)}
        ondrop={(e) => onDrop(e, column.title)}
        role="list"
      >
        <div class="column-header">
          <h3 class="column-title">{column.title}</h3>
          <span class="column-count">{column.cards.length}</span>
        </div>
        <div class="cards-list">
          {#each column.cards as card}
            <div
              class="card-drag-wrapper"
              class:dragging={dragCardId === card.id}
              draggable={isOwner ? 'true' : 'false'}
              ondragstart={isOwner ? (e) => onDragStart(e, card, column.title) : undefined}
              ondragend={isOwner ? onDragEnd : undefined}
              role="listitem"
            >
              <KanbanCardComponent
                id={card.id}
                title={card.title}
                labels={card.labels}
                labelColors={labels}
                bodyPreview={bodyPreview(card.body)}
                commentCount={commentCountForCard(card.id)}
                onexpand={() => expandCard(card, column.title)}
              />
            </div>
          {/each}
        </div>

        <!-- Add card (owner only) -->
        {#if isOwner}
          {#if addingToColumn === column.title}
            <div class="add-card-form">
              <!-- svelte-ignore a11y_autofocus -->
              <input
                autofocus
                class="add-card-input"
                type="text"
                placeholder="Card title..."
                bind:value={newCardTitle}
                onkeydown={(e) => {
                  if (e.key === 'Enter') confirmAddCard();
                  if (e.key === 'Escape') cancelAddCard();
                }}
              />
              <div class="add-card-actions">
                <button class="btn-add" onclick={confirmAddCard} type="button" disabled={saving}
                  >Add</button
                >
                <button class="btn-cancel" onclick={cancelAddCard} type="button">Cancel</button>
              </div>
            </div>
          {:else}
            <button class="add-card-btn" onclick={() => startAddCard(column.title)} type="button"
              >+ Add card</button
            >
          {/if}
        {/if}
      </div>
    {/each}

    <!-- Add column (owner only) -->
    {#if isOwner}
      {#if addingColumn}
        <div class="kanban-column add-column-form">
          <!-- svelte-ignore a11y_autofocus -->
          <input
            autofocus
            class="add-card-input"
            type="text"
            placeholder="Column name..."
            bind:value={newColumnTitle}
            onkeydown={(e) => {
              if (e.key === 'Enter') confirmAddColumn();
              if (e.key === 'Escape') cancelAddColumn();
            }}
          />
          <div class="add-card-actions">
            <button class="btn-add" onclick={confirmAddColumn} type="button" disabled={saving}
              >Add</button
            >
            <button class="btn-cancel" onclick={cancelAddColumn} type="button">Cancel</button>
          </div>
        </div>
      {:else}
        <button class="add-column-btn" onclick={startAddColumn} type="button">+ Add column</button>
      {/if}
    {/if}
  </div>
</div>

<!-- Expanded card modal -->
{#if expandedCard}
  <div
    class="modal-overlay"
    onclick={closeExpanded}
    onkeydown={(e) => e.key === 'Escape' && closeExpanded()}
    role="dialog"
    tabindex="-1"
  >
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        {#if !editMode && expandedCard.labels.length > 0}
          <div class="modal-labels">
            {#each expandedCard.labels as label}
              <span class="label-pill" style="background: {labels[label] || '#6b7280'};"
                >{label}</span
              >
            {/each}
          </div>
        {/if}

        {#if editMode}
          <input
            class="edit-title-input"
            type="text"
            bind:value={editTitle}
            placeholder="Card title"
          />
        {:else}
          <h2 class="modal-title">{expandedCard.title}</h2>
        {/if}

        <div class="modal-actions">
          {#if isOwner}
            {#if !editMode}
              <button class="btn-edit" onclick={startEdit} type="button">Edit</button>
              <button class="btn-delete" onclick={deleteCard} type="button" disabled={saving}
                >Delete</button
              >
            {:else}
              <button class="btn-add" onclick={saveEdit} type="button" disabled={saving}
                >Save</button
              >
              <button
                class="btn-cancel"
                onclick={() => {
                  editMode = false;
                }}
                type="button">Cancel</button
              >
            {/if}
          {/if}
          <button class="modal-close" onclick={closeExpanded} type="button">✕</button>
        </div>
      </div>

      <div class="modal-body prose dark:prose-invert">
        {#if editMode}
          <textarea
            class="edit-body-textarea"
            bind:value={editBody}
            placeholder="Card description (markdown)..."
            rows={10}
          ></textarea>
        {:else if expandedCard.body}
          <div use:checklistAction>
            {@html marked.parse(expandedCard.body)}
          </div>
        {:else}
          <p class="empty-body">No description.</p>
        {/if}
      </div>

      {#if !editMode}
        <div class="card-comments">
          <div class="card-comments-header">Comments</div>
          {#each cardComments(expandedCard.id) as c (c.id)}
            <div class="card-comment-item">
              <span class="card-comment-author">{c.display_name ?? 'Anonymous'}</span>
              <span class="card-comment-body">{c.body}</span>
            </div>
          {/each}
          {#if cardComments(expandedCard.id).length === 0}
            <p class="card-comments-empty">No comments yet.</p>
          {/if}
          <div class="card-comment-form">
            <input
              class="card-comment-input"
              type="text"
              placeholder="Your name (optional)"
              bind:value={commentName}
            />
            <textarea
              class="card-comment-textarea"
              placeholder="Add a comment..."
              bind:value={commentBody}
              rows={2}
              onkeydown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postComment();
              }}
            ></textarea>
            {#if commentError}
              <p class="card-comment-error">{commentError}</p>
            {/if}
            <button
              class="btn-add"
              type="button"
              onclick={postComment}
              disabled={commentPosting || !commentBody.trim()}
            >
              {commentPosting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .kanban-scroll {
    overflow-x: auto;
    padding-bottom: 8px;
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
  }

  .kanban-board {
    display: flex;
    gap: 16px;
    min-width: max-content;
    align-items: flex-start;
    padding-bottom: 8px;
  }

  .kanban-column {
    width: 280px;
    flex-shrink: 0;
    background: var(--surface-subtle, var(--surface));
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    padding: 18px;
    transition:
      box-shadow 150ms,
      outline 150ms;
  }

  .kanban-column.drop-target {
    outline: 2px solid var(--accent, #3b82f6);
    box-shadow: var(--shadow-elevated);
  }

  .column-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
  }

  .column-title {
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin: 0;
  }

  .column-count {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    color: var(--text-tertiary);
    background: var(--surface-hover);
    padding: 2px 7px;
    border-radius: 9999px;
  }

  .cards-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  /* Drag wrapper — cursor set via draggable attribute */
  .card-drag-wrapper[draggable='true'] {
    cursor: grab;
  }

  .card-drag-wrapper[draggable='true']:active {
    cursor: grabbing;
  }

  .card-drag-wrapper[draggable='false'] {
    cursor: default;
  }

  .card-drag-wrapper.dragging {
    opacity: 0.4;
  }

  /* Add card */
  .add-card-btn {
    width: 100%;
    margin-top: 10px;
    padding: 6px 0;
    font-size: 13px;
    color: var(--text-tertiary);
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    border-radius: 6px;
    transition:
      color 120ms,
      background 120ms;
  }

  .add-card-btn:hover {
    color: var(--text-secondary);
    background: var(--surface-hover);
    padding-left: 8px;
  }

  .add-card-form {
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .add-card-input {
    width: 100%;
    padding: 7px 10px;
    font-size: 13px;
    font-family: var(--font-sans);
    background: var(--surface-hover);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-primary);
    outline: none;
    box-sizing: border-box;
  }

  .add-card-input:focus {
    border-color: var(--accent, #3b82f6);
  }

  .add-card-actions {
    display: flex;
    gap: 6px;
  }

  /* Add column */
  .add-column-btn {
    width: 220px;
    flex-shrink: 0;
    padding: 12px 16px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-tertiary);
    background: var(--surface);
    border: 1px dashed var(--border);
    border-radius: var(--radius-card);
    cursor: pointer;
    text-align: left;
    transition:
      color 120ms,
      border-color 120ms,
      background 120ms;
    align-self: flex-start;
  }

  .add-column-btn:hover {
    color: var(--text-secondary);
    border-color: var(--border-hover);
    background: var(--surface-hover);
  }

  .add-column-form {
    width: 260px;
  }

  /* Shared buttons */
  .btn-add {
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 500;
    background: var(--accent, #3b82f6);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }

  .btn-add:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .btn-cancel {
    padding: 5px 10px;
    font-size: 12px;
    background: none;
    color: var(--text-tertiary);
    border: 1px solid var(--border);
    border-radius: 6px;
    cursor: pointer;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: var(--surface);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-elevated);
    width: 90%;
    max-width: 640px;
    max-height: 80vh;
    overflow-y: auto;
    padding: 32px;
  }

  .modal-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 20px;
  }

  .modal-labels {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .label-pill {
    font-size: 11px;
    font-weight: 500;
    color: white;
    padding: 2px 8px;
    border-radius: 9999px;
  }

  .modal-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .modal-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }

  .modal-close {
    margin-left: auto;
    background: none;
    border: none;
    font-size: 16px;
    color: var(--text-tertiary);
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .modal-close:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .btn-edit {
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 500;
    background: var(--surface-hover);
    color: var(--text-secondary);
    border: 1px solid var(--border);
    border-radius: 6px;
    cursor: pointer;
  }

  .btn-edit:hover {
    border-color: var(--border-hover);
    color: var(--text-primary);
  }

  .btn-delete {
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 500;
    background: none;
    color: #ef4444;
    border: 1px solid #ef4444;
    border-radius: 6px;
    cursor: pointer;
  }

  .btn-delete:hover {
    background: #fef2f2;
  }

  .btn-delete:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .modal-body {
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.7;
  }

  /* Markdown rendered body — prose styles */
  .modal-body :global(h1),
  .modal-body :global(h2),
  .modal-body :global(h3) {
    color: var(--text-primary);
    font-weight: 600;
    margin: 1em 0 0.4em;
  }

  .modal-body :global(p) {
    margin: 0.6em 0;
  }

  .modal-body :global(ul),
  .modal-body :global(ol) {
    padding-left: 1.4em;
    margin: 0.6em 0;
  }

  .modal-body :global(code) {
    background: var(--surface-hover);
    padding: 1px 5px;
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: 0.9em;
  }

  .modal-body :global(pre) {
    background: var(--surface-hover);
    padding: 12px 16px;
    border-radius: 8px;
    overflow-x: auto;
  }

  .modal-body :global(pre code) {
    background: none;
    padding: 0;
  }

  .modal-body :global(blockquote) {
    border-left: 3px solid var(--border);
    padding-left: 12px;
    color: var(--text-tertiary);
    margin: 0.6em 0;
  }

  .modal-body :global(a) {
    color: var(--accent, #3b82f6);
    text-decoration: underline;
  }

  /* Edit form */
  .edit-title-input {
    width: 100%;
    font-size: 18px;
    font-weight: 600;
    font-family: var(--font-sans);
    color: var(--text-primary);
    background: var(--surface-hover);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 12px;
    outline: none;
    box-sizing: border-box;
  }

  .edit-title-input:focus {
    border-color: var(--accent, #3b82f6);
  }

  .edit-body-textarea {
    width: 100%;
    font-size: 13px;
    font-family: var(--font-mono);
    color: var(--text-primary);
    background: var(--surface-hover);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 12px;
    outline: none;
    resize: vertical;
    line-height: 1.6;
    box-sizing: border-box;
  }

  .edit-body-textarea:focus {
    border-color: var(--accent, #3b82f6);
  }

  .empty-body {
    color: var(--text-tertiary);
    font-style: italic;
  }

  /* Per-card comments */
  .card-comments {
    margin-top: 24px;
    border-top: 1px solid var(--border);
    padding-top: 16px;
  }

  .card-comments-header {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-tertiary);
    margin-bottom: 10px;
  }

  .card-comment-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
    font-size: 13px;
  }

  .card-comment-author {
    font-weight: 600;
    color: var(--text-secondary);
    font-size: 12px;
  }

  .card-comment-body {
    color: var(--text-primary);
    white-space: pre-wrap;
  }

  .card-comments-empty {
    font-size: 13px;
    color: var(--text-tertiary);
    font-style: italic;
    margin: 0 0 12px;
  }

  .card-comment-form {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 12px;
  }

  .card-comment-input {
    width: 100%;
    padding: 6px 10px;
    font-size: 13px;
    font-family: var(--font-sans);
    background: var(--surface-hover);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text-primary);
    outline: none;
    box-sizing: border-box;
  }

  .card-comment-input:focus {
    border-color: var(--accent, #3b82f6);
  }

  .card-comment-textarea {
    width: 100%;
    padding: 8px 10px;
    font-size: 13px;
    font-family: var(--font-sans);
    background: var(--surface-hover);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text-primary);
    outline: none;
    resize: vertical;
    box-sizing: border-box;
    line-height: 1.5;
  }

  .card-comment-textarea:focus {
    border-color: var(--accent, #3b82f6);
  }

  .card-comment-error {
    font-size: 12px;
    color: #ef4444;
    margin: 0;
  }

  @media (max-width: 640px) {
    .modal-content {
      padding: 20px;
      max-height: 85vh;
    }
    .modal-title {
      font-size: 17px;
    }
    .kanban-column {
      width: 240px;
    }
  }
</style>
