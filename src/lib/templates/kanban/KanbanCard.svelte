<script lang="ts">
  interface Props {
    id: string;
    title: string;
    labels: string[];
    labelColors: Record<string, string>;
    /** Card body markdown — used for checklist row + optional due line (Reader_Kanban card foot). */
    body: string;
    bodyPreviewHtml: string | null;
    commentCount: number;
    /** Latest comment on this card, e.g. `2h ago` (Reader `.act-updated`). */
    commentLatestRelative: string | null;
    /** Reader `body.density-compact` — hides body hint. */
    compact?: boolean;
    /** Reader_Kanban `.card.done` — column title matches shipped (word boundary). */
    shippedColumn?: boolean;
    onexpand: () => void;
  }

  let {
    id,
    title,
    labels,
    labelColors,
    body,
    bodyPreviewHtml,
    commentCount,
    commentLatestRelative,
    compact = false,
    shippedColumn = false,
    onexpand,
  }: Props = $props();

  const defaultColors: Record<string, string> = {
    bug: '#ef4444',
    feature: '#3b82f6',
    urgent: '#f59e0b',
    design: '#8b5cf6',
    infra: '#0f766e',
    docs: '#6b7280',
  };

  const presetLabels = new Set(Object.keys(defaultColors));

  function getColor(label: string): string {
    return labelColors[label] || defaultColors[label.toLowerCase()] || '#6b7280';
  }

  function isPreset(label: string): boolean {
    return presetLabels.has(label.toLowerCase());
  }

  /** Reader_Kanban checklist preview: `- [ ]` / `- [x]` lines. */
  function checklistStats(text: string): { done: number; total: number } {
    let done = 0;
    let total = 0;
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*[-*+]\s+\[( |x|X)\]/);
      if (!m) continue;
      total++;
      if (m[1]!.toLowerCase() === 'x') done++;
    }
    return { done, total };
  }

  /** Optional due chip text from body (Reader `.card-foot` first `.ic`). */
  function dueFootText(text: string): string | null {
    const htmlDue = text.match(/<!--\s*due:\s*([\d-]+)\s*-->/i);
    if (htmlDue?.[1]) {
      const d = new Date(htmlDue[1].trim());
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }
    const lineDue = text.match(/(?:^|\n)\s*(?:\*\*)?due:?\*?\*?\s*([^\n]+)/i);
    if (lineDue?.[1]) {
      const raw = lineDue[1].replace(/\*\*/g, '').trim();
      const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
      if (iso?.[1]) {
        const d = new Date(iso[1]);
        if (!Number.isNaN(d.getTime())) {
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
      }
      if (raw.length <= 14) return raw;
      return raw.slice(0, 12) + '…';
    }
    return null;
  }

  let ck = $derived(checklistStats(body));
  let dueText = $derived(dueFootText(body));
  let checklistFillPct = $derived(
    ck.total > 0 ? Math.min(100, Math.round((100 * ck.done) / ck.total)) : 0
  );
</script>

<button
  class="kanban-card"
  class:card--compact={compact}
  class:card-done={shippedColumn}
  onclick={onexpand}
  type="button"
  data-card-id={id}
>
  {#if labels.length > 0}
    <div class="card-labels">
      {#each labels as label}
        <span
          class="lbl lbl-dot"
          class:bug={label.toLowerCase() === 'bug'}
          class:feature={label.toLowerCase() === 'feature'}
          class:urgent={label.toLowerCase() === 'urgent'}
          class:design={label.toLowerCase() === 'design'}
          class:infra={label.toLowerCase() === 'infra'}
          class:docs={label.toLowerCase() === 'docs'}
          class:lbl-dot-custom={!isPreset(label)}
          style:--lbl-dot={!isPreset(label) ? getColor(label) : undefined}>{label}</span
        >
      {/each}
    </div>
  {/if}
  <div class="card-id">
    <span>#{id}</span>
    <span class="pin" aria-hidden="true">↗</span>
  </div>
  <div class="card-title">{title}</div>
  {#if bodyPreviewHtml}
    <div class="card-body-hint" class:card-body-hint--hidden={compact} aria-hidden={compact}>
      {@html bodyPreviewHtml}
    </div>
  {/if}
  <div class="card-foot">
    <span class="ic ic-date">{dueText ?? '—'}</span>
    {#if ck.total > 0}
      <span class="checklist-mini" aria-label="Checklist {ck.done} of {ck.total} done">
        <span class="bar">
          <span class="fill" style="width: {checklistFillPct}%"></span>
        </span>
        {ck.done}/{ck.total}
      </span>
    {/if}
    {#if commentCount > 0 || commentLatestRelative}
      <span class="act">
        {#if commentCount > 0}
          <span class="act-comments" title="{commentCount} comment{commentCount === 1 ? '' : 's'}">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {commentCount}
          </span>
        {/if}
        {#if commentLatestRelative}
          <span class="act-updated">{commentLatestRelative}</span>
        {/if}
      </span>
    {/if}
  </div>
</button>

<style>
  /* Matches vibe-pub-reader `Reader_Kanban.html` `.card` + children */
  .kanban-card {
    width: 100%;
    text-align: left;
    padding: 14px 14px 12px;
    background: var(--surface);
    border-radius: 12px;
    border: 1px solid transparent;
    box-shadow: var(--shadow-card);
    transition:
      transform 0.15s ease,
      box-shadow 0.15s ease,
      border-color 0.15s ease;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 0;
    font-family: inherit;
    color: inherit;
    position: relative;
  }

  .kanban-card:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-hover);
  }

  .kanban-card:active {
    transform: translateY(0);
    box-shadow: var(--shadow-card);
  }

  .card-labels {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px 8px;
    margin-bottom: 8px;
  }

  /*
   * Dot labels — Reader_Kanban.html `.lbl` uses sans + 10px; prototype `style-dot` used mono.
   * Design handoff: small colored bullet + muted sans label (tighter than legacy dot tweak).
   */
  .lbl.lbl-dot {
    font-family: var(--font-sans);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.01em;
    line-height: 1.35;
    padding: 0;
    border-radius: 0;
    background: transparent;
    color: var(--text-tertiary);
    display: inline-flex;
    align-items: center;
    gap: 0;
  }

  .lbl.lbl-dot::before {
    content: '';
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    margin-right: 4px;
    flex-shrink: 0;
    background: currentColor;
  }

  .lbl.lbl-dot.feature::before {
    background: var(--label-feature);
  }
  .lbl.lbl-dot.bug::before {
    background: var(--label-bug);
  }
  .lbl.lbl-dot.urgent::before {
    background: var(--label-urgent);
  }
  .lbl.lbl-dot.design::before {
    background: var(--label-design);
  }
  .lbl.lbl-dot.infra::before {
    background: #0f766e;
  }
  .lbl.lbl-dot.docs::before {
    background: #6b7280;
  }

  .lbl.lbl-dot.lbl-dot-custom::before {
    background: var(--lbl-dot, var(--text-tertiary));
  }

  .card-id {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-tertiary);
    margin-bottom: 4px;
    letter-spacing: 0.02em;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .card-id .pin {
    opacity: 0.5;
  }

  .card-title {
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    line-height: 1.4;
    margin: 0;
    text-wrap: pretty;
  }

  .card-body-hint {
    position: relative;
    font-family: var(--font-sans);
    font-size: 12px;
    line-height: 1.5;
    color: var(--text-secondary);
    margin: 6px 0 0;
    max-height: 4.2em;
    overflow: hidden;
    word-break: break-word;
  }

  .card-body-hint::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1.2em;
    pointer-events: none;
    background: linear-gradient(to bottom, transparent, var(--surface));
  }

  .card-body-hint--hidden {
    display: none;
  }

  .card-body-hint :global(ul:not(:has(input[type='checkbox']))),
  .card-body-hint :global(ol) {
    margin: 0;
    padding-left: 0;
  }

  .card-body-hint :global(ul:not(:has(input[type='checkbox']))) {
    list-style-type: disc;
    list-style-position: inside;
  }

  .card-body-hint :global(ol) {
    list-style-type: decimal;
    list-style-position: inside;
  }

  .card-body-hint :global(li) {
    margin: 0;
    padding: 0;
    line-height: 1.45;
  }

  .card-body-hint :global(li)::marker {
    color: var(--text-tertiary);
  }

  .card-body-hint :global(li + li) {
    margin-top: 2px;
  }

  .card-body-hint :global(ul:has(input[type='checkbox'])) {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .card-body-hint :global(li:has(> input[type='checkbox'])) {
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }

  .card-body-hint :global(input[type='checkbox']) {
    width: 12px;
    height: 12px;
    margin: 1px 0 0;
    flex-shrink: 0;
    accent-color: var(--text-primary);
    pointer-events: none;
  }

  .card-body-hint :global(li:has(input:checked)) {
    color: var(--text-tertiary);
    text-decoration: line-through;
  }

  .card-body-hint :global(table) {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 10px;
    line-height: 1.35;
    margin: 0;
  }

  .card-body-hint :global(th),
  .card-body-hint :global(td) {
    padding: 2px 6px 2px 0;
    border: none;
    text-align: left;
    vertical-align: top;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-body-hint :global(th) {
    font-weight: 600;
    color: var(--text-primary);
  }

  .card-body-hint :global(td) {
    color: var(--text-secondary);
    font-weight: 500;
  }

  .card-body-hint :global(thead th) {
    border-bottom: 1px solid var(--border);
  }

  .card-body-hint :global(strong),
  .card-body-hint :global(b) {
    font-weight: 600;
    color: var(--text-primary);
  }

  .card-body-hint :global(code) {
    font-family: var(--font-mono);
    font-size: 0.92em;
    background: rgba(0, 0, 0, 0.05);
    padding: 0 3px;
    border-radius: 3px;
  }

  .card-body-hint :global(em) {
    font-style: italic;
  }

  .card-foot {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
  }

  .card-foot .ic {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }

  /* Reader_Kanban.html — text-only due (no calendar glyph) */
  .card-foot .ic-date {
    gap: 0;
    font-variant-numeric: tabular-nums;
  }

  /* Reader_Kanban.html `.checklist-mini` */
  .checklist-mini {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
  }

  .checklist-mini .bar {
    width: 36px;
    height: 3px;
    border-radius: 999px;
    background: var(--border);
    overflow: hidden;
    display: inline-block;
    flex-shrink: 0;
  }

  .checklist-mini .bar .fill {
    display: block;
    height: 100%;
    background: var(--text-secondary);
    border-radius: 999px;
    min-width: 0;
    transition: width 0.2s ease;
  }

  .card-foot svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    opacity: 0.9;
  }

  .card-foot .act {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
  }

  .card-foot .act-comments {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }

  .card-foot .act-comments svg {
    width: 11px;
    height: 11px;
  }

  .card-foot .act-updated {
    opacity: 0.75;
  }

  .kanban-card.card--compact {
    padding: 10px 12px 10px;
  }

  .kanban-card.card--compact .card-title {
    font-size: 13px;
  }

  .kanban-card.card--compact .card-foot {
    margin-top: 8px;
    gap: 8px;
  }

  /* Reader_Kanban.html `.card.done` — shipped column */
  .kanban-card.card-done {
    opacity: 0.75;
  }

  .kanban-card.card-done .card-title {
    text-decoration: line-through;
    color: var(--text-tertiary);
  }
</style>
