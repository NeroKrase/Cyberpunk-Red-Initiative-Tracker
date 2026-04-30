<script lang="ts">
  import "../app.css";
  import Notifications from "$lib/Notifications.svelte";

  let { children } = $props();
</script>

<main>
  {@render children()}
</main>

<Notifications />

<style>
  main {
    max-width: 1100px;
    margin: 0 auto;
    padding: 2.5rem 1.5rem 3rem;
  }
</style>
