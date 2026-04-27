<script lang="ts">
  interface Props {
    id: string;
    title: string;
    labels: string[];
    labelColors: Record<string, string>;
    bodyPreview: string;
    commentCount: number;
    onexpand: () => void;
  }

  let { id, title, labels, labelColors, bodyPreview, commentCount, onexpand }: Props = $props();

  const defaultColors: Record<string, string> = {
    bug: '#ef4444',
    feature: '#3b82f6',
    urgent: '#f59e0b',
    design: '#8b5cf6',
  };

  function getColor(label: string): string {
    return labelColors[label] || defaultColors[label] || '#6b7280';
  }
</script>

<button class="kanban-card" onclick={onexpand} type="button" data-card-id={id}>
  {#if labels.length > 0}
    <div class="card-labels">
      {#each labels as label}
        <span class="label-pill" style="background: {getColor(label)};">{label}</span>
      {/each}
    </div>
  {/if}
  <div class="card-title">{title}</div>
  {#if bodyPreview}
    <div class="card-preview">{bodyPreview}</div>
  {/if}
  {#if commentCount > 0}
    <div class="card-footer">
      <span class="comment-badge">{commentCount}</span>
    </div>
  {/if}
</button>

<style>
  .kanban-card {
    width: 100%;
    text-align: left;
    padding: 12px 14px;
    background: var(--surface-hover);
    border-radius: 12px;
    border: 1px solid var(--border);
    transition:
      border-color 150ms,
      box-shadow 150ms;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-family: inherit;
    color: inherit;
  }

  .kanban-card:hover {
    border-color: var(--border-hover);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .kanban-card:active {
    box-shadow: var(--shadow-card);
  }

  .card-labels {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .label-pill {
    font-size: 11px;
    font-weight: 500;
    color: white;
    padding: 2px 8px;
    border-radius: 9999px;
    line-height: 1.4;
  }

  .card-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    line-height: 1.5;
  }

  .card-preview {
    font-size: 12px;
    color: var(--text-tertiary);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-footer {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 2px;
  }

  .comment-badge {
    font-size: 11px;
    color: var(--text-tertiary);
    font-family: var(--font-mono);
  }

  .comment-badge::before {
    content: '\1F4AC ';
  }
</style>
