<script lang="ts">
  let { markdown }: { markdown: string } = $props();

  interface Card {
    text: string;
    checked: boolean;
  }

  interface Column {
    title: string;
    cards: Card[];
  }

  function parseKanban(md: string): Column[] {
    // Strip frontmatter
    const fmMatch = md.match(/^---\n[\s\S]*?\n---\n/);
    const body = fmMatch ? md.slice(fmMatch[0].length) : md;

    const columns: Column[] = [];
    let current: Column | null = null;

    for (const line of body.split('\n')) {
      const headingMatch = line.match(/^##\s+(.+)/);
      if (headingMatch) {
        current = { title: headingMatch[1].trim(), cards: [] };
        columns.push(current);
        continue;
      }

      if (!current) continue;

      const taskMatch = line.match(/^-\s+\[([ xX])\]\s+(.+)/);
      if (taskMatch) {
        current.cards.push({
          checked: taskMatch[1] !== ' ',
          text: taskMatch[2].trim()
        });
        continue;
      }

      const bulletMatch = line.match(/^-\s+(.+)/);
      if (bulletMatch) {
        current.cards.push({
          checked: false,
          text: bulletMatch[1].trim()
        });
      }
    }

    return columns;
  }

  const columns = $derived(parseKanban(markdown));
</script>

<div class="kanban-scroll">
  <div class="kanban-board">
    {#each columns as column}
      <div class="kanban-column">
        <div class="column-header">
          <h3 class="column-title">{column.title}</h3>
          <span class="column-count">{column.cards.length}</span>
        </div>
        <div class="cards-list" role="list">
          {#each column.cards as card}
            <div class="kanban-card" role="listitem">
              <div class="card-inner">
                {#if card.checked}
                  <span class="card-icon card-done">✓</span>
                  <span class="card-text card-text-done">{card.text}</span>
                {:else}
                  <span class="card-icon card-todo">○</span>
                  <span class="card-text">{card.text}</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .kanban-scroll {
    overflow-x: auto;
    padding-bottom: 8px;
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
    background: var(--surface);
    border-radius: 10px;
    box-shadow: var(--shadow-card);
    padding: 16px;
  }

  .column-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
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

  .kanban-card {
    padding: 10px 14px;
    background: var(--bg);
    border-radius: 8px;
    border: 1px solid var(--border);
    transition: border-color 150ms, box-shadow 150ms, transform 150ms;
    cursor: default;
  }

  .kanban-card:hover {
    border-color: var(--border-hover);
    box-shadow: var(--shadow-elevated);
    transform: translateY(-1px);
  }

  .card-inner {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .card-icon {
    flex-shrink: 0;
    margin-top: 2px;
    font-size: 13px;
  }

  .card-done {
    color: #22c55e;
  }

  .card-todo {
    color: var(--text-tertiary);
  }

  .card-text {
    font-size: 14px;
    color: var(--text-primary);
    line-height: 1.5;
  }

  .card-text-done {
    color: var(--text-tertiary);
    text-decoration: line-through;
    text-decoration-color: var(--text-tertiary);
  }
</style>
