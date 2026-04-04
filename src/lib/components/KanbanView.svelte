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

<div class="overflow-x-auto">
  <div class="flex gap-4 min-w-max pb-4">
    {#each columns as column}
      <div class="w-72 flex-shrink-0">
        <h3 style="font-family: var(--font-sans); font-size: 13px; font-weight: 500; color: var(--text-secondary); letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 12px; padding: 0 4px; display: flex; align-items: center; gap: 6px;">
          {column.title}
          <span style="color: var(--text-tertiary); font-weight: 400;">{column.cards.length}</span>
        </h3>
        <div class="flex flex-col gap-2">
          {#each column.cards as card}
            <div
              style="padding: 12px 16px; background: var(--surface); box-shadow: var(--shadow-card); border-radius: 8px; transition: box-shadow 150ms;"
              onmouseenter={(e) => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-elevated)'}
              onmouseleave={(e) => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)'}
              role="listitem"
            >
              <div class="flex items-start gap-2">
                {#if card.checked}
                  <span style="color: #22c55e; margin-top: 1px; flex-shrink: 0;">&#10003;</span>
                  <span style="font-size: 14px; color: var(--text-tertiary); text-decoration: line-through; line-height: 1.5;">{card.text}</span>
                {:else}
                  <span style="color: var(--text-tertiary); margin-top: 2px; flex-shrink: 0;">&#9675;</span>
                  <span style="font-size: 14px; color: var(--text-primary); line-height: 1.5;">{card.text}</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>
