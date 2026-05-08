<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { createNetArchitecture } from "$lib/store.svelte";

  // No form: a brand-new architecture is just an empty record. Create
  // it immediately and bounce to the inline structure editor — the user
  // names it, adds demons, and adds floors right there in the sheet.
  // replaceState avoids leaving /net/new in history (Back from the
  // editor goes to the list, not back through this stub).
  onMount(async () => {
    const arch = await createNetArchitecture({
      name: "",
      demons: [],
      floors: [],
    });
    goto(`/net/${arch.id}`, { replaceState: true });
  });
</script>

<p class="loading">// initialising new architecture…</p>

<style>
  .loading {
    color: var(--text-faint);
    font-family: var(--font-mono);
    margin: 2rem 0;
  }
</style>
