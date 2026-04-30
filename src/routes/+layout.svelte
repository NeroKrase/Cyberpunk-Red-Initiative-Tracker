<script lang="ts">
  import "../app.css";
  import Notifications from "$lib/Notifications.svelte";
  import ConfirmDialog from "$lib/ConfirmDialog.svelte";
  import PromptDialog from "$lib/PromptDialog.svelte";

  let { children } = $props();
</script>

<main>
  {@render children()}
</main>

<Notifications />
<ConfirmDialog />
<PromptDialog />

<style>
  main {
    max-width: 1100px;
    margin: 0 auto;
    padding: 2.5rem 1.5rem 3rem;
  }
</style>
