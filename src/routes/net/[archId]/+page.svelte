<script lang="ts">
  import { page } from "$app/state";
  import PageChrome from "$lib/PageChrome.svelte";
  import NetArchitectureSheet from "$lib/NetArchitectureSheet.svelte";
  import {
    getNetArchitecture,
    persistNetArchitecture,
  } from "$lib/store.svelte";

  const arch = $derived(getNetArchitecture(page.params.archId!));

  // The sheet mutates `arch` in place via Svelte $state proxies, which
  // updates the in-memory store synchronously; this callback only has
  // to push the new state down to SQLite.
  function onChange() {
    if (arch) void persistNetArchitecture(arch.id);
  }
</script>

<PageChrome
  backHref="/net"
  backLabel="Architectures"
  title="NET Architecture"
  faction="net"
>
  {#if arch}
    <NetArchitectureSheet {arch} {onChange} />
  {:else}
    <p class="missing">// architecture not found</p>
  {/if}
</PageChrome>

<style>
  .missing {
    color: var(--text-faint);
    font-family: var(--font-mono);
    margin: 2rem 0;
  }
</style>
