<script lang="ts">
  import Board from './Board.svelte';
  import Head from './Head.svelte';
  import Layout from './Layout.svelte';
  import Pager from './Pager.svelte';
  import type { ChapterLink } from './index';
  import { kanbanReaderBoardFullwidth } from '$lib/components/topbar';
  import type { Comment } from '$lib/types';
  import type { KanbanColumn, KanbanLabels } from '$lib/templates/kanban/serialize';

  interface Props {
    title: string;
    lede?: string | null;
    partEyebrow?: string | null;
    chapterNum: number;
    totalChapters: number;
    authorUsername?: string | null;
    updated: string;
    pageHref: string;
    pageId: string;
    markdown: string;
    comments?: Comment[];
    initialColumns?: KanbanColumn[];
    initialLabels?: KanbanLabels;
    prev?: ChapterLink | null;
    next?: ChapterLink | null;
    searchQuery?: string | null;
  }

  let {
    title,
    lede = null,
    partEyebrow = null,
    chapterNum,
    totalChapters,
    authorUsername = null,
    updated,
    pageHref,
    pageId,
    markdown,
    comments = [],
    initialColumns = [],
    initialLabels = {},
    prev = null,
    next = null,
    searchQuery = null,
  }: Props = $props();
</script>

<Layout bleed headFullwidth={$kanbanReaderBoardFullwidth}>
  {#snippet head()}
    <Head
      {title}
      {lede}
      {partEyebrow}
      {chapterNum}
      {totalChapters}
      {authorUsername}
      {updated}
      {pageHref}
      compactFoot
      boardFullwidth={$kanbanReaderBoardFullwidth}
      {searchQuery}
    />
  {/snippet}
  {#snippet body()}
    <Board {markdown} {pageId} {comments} {initialColumns} {initialLabels} {searchQuery} />
  {/snippet}
  {#snippet foot()}
    <Pager {chapterNum} {totalChapters} {prev} {next} {searchQuery} />
  {/snippet}
</Layout>
