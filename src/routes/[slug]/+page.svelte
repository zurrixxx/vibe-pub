<script lang="ts">
  import PublishedPage from '$lib/components/PublishedPage.svelte';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }
  let { data }: Props = $props();
</script>

<PublishedPage {data} />
