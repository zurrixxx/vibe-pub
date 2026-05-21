<script lang="ts">
  import { searchHighlight } from '../search/highlight';
  import { kanbanReaderBoardFullwidth } from '$lib/components/topbar';
  import KanbanView from '$lib/templates/kanban/KanbanView.svelte';
  import type { Comment } from '$lib/types';
  import type { KanbanColumn, KanbanLabels } from '$lib/templates/kanban/serialize';

  interface Props {
    markdown: string;
    pageId: string;
    comments?: Comment[];
    initialColumns?: KanbanColumn[];
    initialLabels?: KanbanLabels;
    searchQuery?: string | null;
  }

  let {
    markdown,
    pageId,
    comments = [],
    initialColumns = [],
    initialLabels = {},
    searchQuery = null,
  }: Props = $props();

  const highlightParams = $derived(
    searchQuery?.trim() ? { query: searchQuery, defer: true } : null
  );
</script>

<div
  class="c-ch-kanban kanban-layout"
  class:board-fullwidth={$kanbanReaderBoardFullwidth}
  use:searchHighlight={highlightParams}
>
  <KanbanView
    boardFullwidth={$kanbanReaderBoardFullwidth}
    {markdown}
    {pageId}
    {comments}
    {initialColumns}
    {initialLabels}
  />
</div>

<style>
  .c-ch-kanban.kanban-layout {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-width: 0;
    width: 100%;
  }

  /* Standard width: respect Appearance line length (--reader-measure). */
  .c-ch-kanban :global(.kanban-root:not(.board-fullwidth) .kb-board-tools),
  .c-ch-kanban :global(.kanban-root:not(.board-fullwidth) .board-outer) {
    max-width: min(1320px, var(--reader-measure, 780px));
    margin-left: auto;
    margin-right: auto;
    width: 100%;
    box-sizing: border-box;
  }

  .c-ch-kanban :global(.kanban-root:not(.board-fullwidth) .kb-board-tools) {
    padding-top: 8px;
  }

  .c-ch-kanban :global(.kanban-root:not(.board-fullwidth) .board-outer) {
    padding: 16px 0 24px;
  }

  @media (max-width: 900px) {
    .c-ch-kanban :global(.kanban-root:not(.board-fullwidth) .kb-board-tools),
    .c-ch-kanban :global(.kanban-root:not(.board-fullwidth) .board-outer) {
      padding-left: 0;
      padding-right: 0;
    }
  }

  /* Inset dashed ring — outline is clipped by .cards-list overflow */
  .c-ch-kanban :global(button.kanban-card.c-search-kanban-card-hit::after) {
    content: '';
    position: absolute;
    inset: 0;
    border: 3px dashed var(--search-highlight-active);
    border-radius: inherit;
    pointer-events: none;
    box-sizing: border-box;
    z-index: 1;
  }
</style>
