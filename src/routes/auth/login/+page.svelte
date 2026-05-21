<script lang="ts">
  import AuthSignInPanel from '$lib/components/auth/AuthSignInPanel.svelte';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
</script>

<AuthSignInPanel
  pageTitle="Sign in — vibe.pub"
  titleBefore="Sign "
  titleEm="in"
  subtitle="Continue with your account"
  footer="no password needed · link expires in 15 min"
  {form}
/>
