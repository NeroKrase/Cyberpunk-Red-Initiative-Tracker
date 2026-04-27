<script lang="ts">
  import "../app.css";

  let { children } = $props();
</script>

<main>
  {@render children()}
</main>

<style>
  main {
    max-width: 1100px;
    margin: 0 auto;
    padding: 2.5rem 1.5rem 3rem;
  }
</style>
