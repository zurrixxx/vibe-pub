<script lang="ts">
  import { marked } from 'marked';
  import { onDestroy } from 'svelte';
  import { hideGlobalHeader } from '$lib/stores';
  import { deltaStat } from '$lib/version-delta';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  type VersionRow = (typeof data.versionDetails)[number];
  type TimelineEntry = VersionRow & {
    idx: number;
    tag: 'current' | 'published' | 'manual';
    day: string;
    time: string;
  };
  hideGlobalHeader.set(true);
  onDestroy(() => hideGlobalHeader.set(false));

  let selectedVersion = $state(data.versionDetails[0]?.version ?? null);
  let mode = $state<'rendered' | 'diff'>('rendered');
  let filter = $state<'all' | 'published' | 'manual'>('all');
  let selected = $derived(
    data.versionDetails.find(
      (v: (typeof data.versionDetails)[number]) => v.version === selectedVersion
    ) ??
      data.versionDetails[0] ??
      null
  );
  let previous = $derived(
    selected
      ? (data.versionDetails.find(
          (v: (typeof data.versionDetails)[number]) => v.version === selected.version - 1
        ) ?? null)
      : null
  );
  /** Index 0 is the live tip; nothing to restore when that row is selected. */
  let isLatestSelected = $derived(
    !!selected && !!data.versionDetails[0] && selected.version === data.versionDetails[0].version
  );
  let renderedHtml = $derived(selected ? marked.parse(selected.markdown) : '');

  function fmt(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  function timeOnly(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
  function dayLabel(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const diffDays = Math.round((today - start) / 86400000);
    if (diffDays === 0)
      return `Today · ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}`;
    if (diffDays === 1)
      return `Yesterday · ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  }
  function tagFor(v: VersionRow, idx: number): 'current' | 'published' | 'manual' {
    if (idx === 0) return 'current';
    return v.version % 2 === 0 ? 'published' : 'manual';
  }
  let entries = $derived(
    data.versionDetails.map(
      (v: VersionRow, idx: number): TimelineEntry => ({
        ...v,
        idx,
        tag: tagFor(v, idx),
        day: dayLabel(v.created),
        time: timeOnly(v.created),
      })
    )
  );
  let authorLabel = $derived('owner');
  let filteredEntries = $derived(
    entries.filter((e: TimelineEntry) => {
      if (filter === 'all') return true;
      if (filter === 'published') return e.tag === 'published' || e.tag === 'current';
      return e.tag === 'manual';
    })
  );
  let sectionedEntries = $derived.by(() => {
    const sections: { day: string; rows: (typeof filteredEntries)[number][] }[] = [];
    for (const entry of filteredEntries) {
      const last = sections[sections.length - 1];
      if (!last || last.day !== entry.day) sections.push({ day: entry.day, rows: [entry] });
      else last.rows.push(entry);
    }
    return sections;
  });
  function diffLines(
    oldText: string,
    newText: string
  ): { type: 'add' | 'rem' | 'ctx'; text: string }[] {
    const a = oldText.split('\n');
    const b = newText.split('\n');
    const max = Math.max(a.length, b.length);
    const out: { type: 'add' | 'rem' | 'ctx'; text: string }[] = [];
    for (let i = 0; i < max; i++) {
      const left = a[i];
      const right = b[i];
      if (left === right) {
        if (left !== undefined) out.push({ type: 'ctx', text: left });
      } else {
        if (left !== undefined) out.push({ type: 'rem', text: left });
        if (right !== undefined) out.push({ type: 'add', text: right });
      }
    }
    return out;
  }

  // Diff is always: new version -> old version.
  let diff = $derived(selected ? diffLines(previous?.markdown ?? '', selected.markdown) : []);
  let restoring = $state(false);

  function minutesBeforeCurrent(dateStr: string): string {
    const current = data.versionDetails[0];
    if (!current) return '';
    const delta = Math.max(
      0,
      Math.round((new Date(current.created).getTime() - new Date(dateStr).getTime()) / 60000)
    );
    if (delta < 60) return `${delta} minutes before current version`;
    const h = Math.round(delta / 60);
    return `${h} hours before current version`;
  }

  function downloadSelected() {
    if (!selected) return;
    const blob = new Blob([selected.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.page.slug}.v${selected.version}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function restoreSelected() {
    if (!selected || restoring) return;
    const current = data.versionDetails[0];
    if (current && selected.version === current.version) {
      return;
    }
    restoring = true;
    try {
      const res = await fetch(`/api/pub/${data.page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: selected.markdown }),
      });
      if (res.ok) window.location.href = `/${data.page.slug}`;
    } finally {
      restoring = false;
    }
  }
</script>

<svelte:head>
  <title>History — {data.page.title ?? data.page.slug}</title>
</svelte:head>

<div class="top">
  <div class="top-l">
    <a href="/" class="wordmark">vibe.<em>pub</em></a>
    <div class="crumbs">
      <span>/</span><a href={`/${data.page.slug}`}>{data.page.slug}</a><span>/</span><span
        >history</span
      >
    </div>
  </div>
  <div class="top-r"><a class="top-btn" href={`/${data.page.slug}`}>← back to page</a></div>
</div>

<div class="shell">
  <aside class="vrail">
    <div class="vrail-h">
      <div class="kicker">Version history</div>
      <div class="page-title">{data.page.title ?? data.page.slug}</div>
      <div class="slug">vibe.pub/{data.page.slug}</div>
    </div>
    <div class="vfilter">
      <button class:on={filter === 'all'} onclick={() => (filter = 'all')}>All</button>
      <button class:on={filter === 'published'} onclick={() => (filter = 'published')}
        >Published</button
      >
      <button class:on={filter === 'manual'} onclick={() => (filter = 'manual')}
        >Manual saves</button
      >
    </div>
    <div class="vlist">
      {#if filteredEntries.length === 0}
        <div class="empty">No snapshots yet.</div>
      {:else}
        {#each sectionedEntries as section}
          <div class="vday">{section.day}</div>
          {#each section.rows as v}
            {@const prev = data.versionDetails.find((x: VersionRow) => x.version === v.version - 1)}
            {@const delta = deltaStat(prev?.markdown ?? null, v.markdown)}
            <button
              class="vitem"
              class:selected={selectedVersion === v.version}
              class:current={v.tag === 'current'}
              onclick={() => (selectedVersion = v.version)}
            >
              <span class="dot"></span>
              <div class="vitem-when">
                {v.time}
                <span class="tag {v.tag}">{v.tag}</span>
              </div>
              <div class="vitem-who">
                @{authorLabel} · {v.tag === 'manual' ? 'manual save' : v.tag}
              </div>
              <div class="vitem-note">{v.title ?? data.page.title ?? data.page.slug}</div>
              <div class="vitem-delta">
                <span class="add">+ {delta.add}</span><span class="rem">- {delta.rem}</span>
              </div>
            </button>
          {/each}
        {/each}
      {/if}
    </div>
  </aside>
  <main class="preview">
    {#if selected}
      <div class="preview-top">
        <div class="preview-meta">
          <div class="when">{fmt(selected.created)}</div>
          <div class="sub">
            <b>@{authorLabel}</b> · {selected.version === data.versionDetails[0]?.version
              ? 'current'
              : 'autosaved'} · {minutesBeforeCurrent(selected.created)}
          </div>
        </div>
        <div class="preview-actions">
          <div class="viewmode">
            <button class:on={mode === 'rendered'} onclick={() => (mode = 'rendered')}
              >Rendered</button
            >
            <button class:on={mode === 'diff'} onclick={() => (mode = 'diff')}>Diff</button>
          </div>
          <button class="ghost-btn" onclick={downloadSelected}>Download .md</button>
          {#if isLatestSelected}
            <button type="button" class="latest-version-hint" disabled aria-disabled="true">
              The latest version
            </button>
          {:else}
            <button
              type="button"
              class="primary-btn"
              onclick={restoreSelected}
              disabled={restoring}
            >
              {restoring ? 'Restoring...' : 'Restore this version'}
            </button>
          {/if}
        </div>
      </div>
      {#if mode === 'rendered'}
        <article class="rendered">
          <div class="kicker">REPORT · APRIL 2026</div>
          <div class="snapshot">snapshot of {fmt(selected.created)}</div>
          <div class="prose">{@html renderedHtml}</div>
        </article>
      {:else}
        <article class="diff">
          {#each diff as line}
            <div class="diff-line {line.type}">{line.text}</div>
          {/each}
        </article>
      {/if}
    {:else}
      <div class="empty">No version selected.</div>
    {/if}
  </main>
</div>

<style>
  .top {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 32px;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
  }
  .top-l {
    display: flex;
    align-items: center;
  }
  .wordmark {
    font-family: var(--font-display);
    font-size: 20px;
    color: var(--text-primary);
    text-decoration: none;
  }
  .crumbs {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 18px;
  }
  .crumbs a {
    color: var(--text-secondary);
    text-decoration: none;
  }
  .top-btn {
    font-family: var(--font-mono);
    font-size: 12px;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid var(--border);
    color: var(--text-secondary);
    text-decoration: none;
  }
  .shell {
    display: grid;
    grid-template-columns: 320px 1fr;
    min-height: calc(100vh - 56px);
    align-items: start;
  }
  .vrail {
    position: sticky;
    top: 56px;
    align-self: start;
    max-height: calc(100vh - 56px);
    overflow-y: auto;
    overscroll-behavior: contain;
    border-right: 1px solid var(--border);
    background: var(--bg);
  }
  .vrail-h {
    padding: 22px 24px 14px;
    border-bottom: 1px solid var(--border);
  }
  .kicker {
    font-family: var(--font-mono);
    font-size: 10px;
    text-transform: uppercase;
    color: var(--text-tertiary);
  }
  .page-title {
    font-family: var(--font-serif);
    font-size: 17px;
    margin-top: 4px;
  }
  .slug {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
    margin-top: 2px;
  }
  .vfilter {
    display: flex;
    gap: 6px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
  }
  .vfilter button {
    font-family: var(--font-mono);
    font-size: 11px;
    border: 1px solid var(--border);
    background: transparent;
    border-radius: 999px;
    padding: 6px 12px;
    color: var(--text-secondary);
  }
  .vfilter button.on {
    background: var(--text-primary);
    color: var(--bg);
    border-color: var(--text-primary);
  }
  .vlist {
    padding: 8px 0 40px;
    position: relative;
  }
  .vlist::before {
    content: '';
    position: absolute;
    left: 31px;
    top: 10px;
    bottom: 10px;
    width: 1px;
    background: var(--border);
  }
  .vday {
    position: sticky;
    top: 0;
    z-index: 1;
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-tertiary);
    background: var(--bg);
    padding: 16px 16px 8px 48px;
  }
  .vitem {
    width: 100%;
    text-align: left;
    border: 0;
    border-left: 3px solid transparent;
    background: transparent;
    padding: 10px 16px 12px 48px;
    position: relative;
    cursor: pointer;
  }
  .vitem.selected {
    background: var(--surface-hover);
    border-left-color: var(--text-primary);
  }
  .vitem.current .dot {
    background: var(--bg);
    box-shadow: 0 0 0 2px #7dac6b;
  }
  .dot {
    position: absolute;
    left: 27px;
    top: 18px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--bg);
    box-shadow: 0 0 0 1.5px var(--border-hover);
  }
  .vitem.selected .dot {
    background: var(--text-primary);
    box-shadow: 0 0 0 1.5px var(--text-primary);
  }
  .vitem-when {
    font-family: var(--font-sans);
    font-size: 13px;
  }
  .vitem-who {
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--text-tertiary);
    margin-top: 3px;
  }
  .tag {
    font-family: var(--font-mono);
    font-size: 9px;
    margin-left: 8px;
    color: var(--text-tertiary);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 1px 5px;
    text-transform: lowercase;
  }
  .tag.current,
  .tag.published {
    background: rgba(125, 172, 107, 0.16);
    border-color: transparent;
    color: #4d6f3f;
  }
  .vitem-note {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 4px;
  }
  .vitem-delta {
    font-family: var(--font-mono);
    font-size: 10px;
    margin-top: 4px;
    display: flex;
    gap: 10px;
  }
  .vitem-delta .add {
    color: #4d6f3f;
  }
  .vitem-delta .rem {
    color: #b43a2e;
  }
  .preview {
    padding: 32px 56px 120px;
  }
  .preview-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 20px;
    margin-bottom: 28px;
    border-bottom: 1px solid var(--border);
    gap: 16px;
  }
  .preview-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .when {
    font-family: var(--font-serif);
    font-size: 22px;
  }
  .sub {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
  }
  .sub b {
    color: var(--text-primary);
    font-weight: 500;
  }
  .preview-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ghost-btn {
    font-family: var(--font-mono);
    font-size: 12px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-secondary);
    border-radius: 999px;
    padding: 7px 14px;
  }
  .primary-btn {
    font-family: var(--font-mono);
    font-size: 12px;
    border: 1px solid var(--text-primary);
    background: var(--text-primary);
    color: var(--bg);
    border-radius: 999px;
    padding: 7px 14px;
    min-width: 120px;
  }
  .primary-btn:disabled {
    opacity: 0.6;
  }
  .latest-version-hint {
    font-family: var(--font-mono);
    font-size: 12px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-tertiary);
    border-radius: 999px;
    padding: 7px 14px;
    min-width: 120px;
    cursor: default;
    opacity: 1;
  }
  .viewmode {
    display: flex;
    background: var(--surface-hover);
    border-radius: 999px;
    padding: 2px;
  }
  .viewmode button {
    font-family: var(--font-mono);
    font-size: 11px;
    padding: 5px 12px;
    border-radius: 999px;
    border: none;
    background: transparent;
    cursor: pointer;
  }
  .viewmode button.on {
    background: var(--bg);
    color: var(--text-primary);
    box-shadow: var(--shadow-border);
  }
  .rendered {
    max-width: 780px;
    margin: 0 auto;
  }
  .rendered .kicker {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.12em;
    color: var(--text-tertiary);
    text-transform: uppercase;
    margin-bottom: 14px;
  }
  .rendered .snapshot {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
    margin-bottom: 12px;
  }
  .rendered :global(h1) {
    font-family: var(--font-display);
    font-size: 86px;
    letter-spacing: -0.04em;
    line-height: 0.95;
    margin: 0 0 14px;
  }
  .rendered :global(h1 em) {
    font-style: italic;
  }
  .diff {
    max-width: 840px;
    margin: 0 auto;
    font-family: var(--font-mono);
    font-size: 13px;
    line-height: 1.7;
  }
  .diff-line {
    padding: 2px 16px;
    border-radius: 3px;
    white-space: pre-wrap;
  }
  .diff-line.add {
    background: rgba(125, 172, 107, 0.14);
    color: #2f5021;
  }
  .diff-line.rem {
    background: rgba(180, 58, 46, 0.1);
    color: #7a2a20;
    text-decoration: line-through;
  }
  .diff-line.ctx {
    color: var(--text-tertiary);
  }
  .empty {
    padding: 20px 24px;
    color: var(--text-tertiary);
    font-size: 13px;
  }
</style>
