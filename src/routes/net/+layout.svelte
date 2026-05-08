<script lang="ts">
  let { children } = $props();
</script>

<!-- Nested layout: applies to every /net/* route. The form + live sheet
     preview need more horizontal room than the standard 1100px main —
     widening here keeps the demon stat line on one line and gives the
     sheet column enough width that long descriptions don't wrap as
     aggressively. svelte:head content is removed when this layout
     unmounts (i.e. when navigating away from /net), so the variable
     reverts to its 1100px default for the rest of the app. -->
<svelte:head>
  <style>:root { --page-max-width: 1400px; }</style>
</svelte:head>

{@render children()}
