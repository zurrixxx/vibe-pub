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
        <h3 class="font-semibold text-sm text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3 px-1">
          {column.title}
          <span class="text-zinc-400 dark:text-zinc-600 ml-1">{column.cards.length}</span>
        </h3>
        <div class="flex flex-col gap-2">
          {#each column.cards as card}
            <div class="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm">
              <div class="flex items-start gap-2">
                {#if card.checked}
                  <span class="text-emerald-500 mt-0.5">&#10003;</span>
                  <span class="text-zinc-400 line-through text-sm">{card.text}</span>
                {:else}
                  <span class="text-zinc-300 dark:text-zinc-600 mt-0.5">&#9675;</span>
                  <span class="text-sm">{card.text}</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>
