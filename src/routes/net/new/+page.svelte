<script lang="ts">
  import { goto } from "$app/navigation";
  import PageChrome from "$lib/PageChrome.svelte";
  import NetArchitectureForm from "$lib/NetArchitectureForm.svelte";
  import NetArchitectureSheet from "$lib/NetArchitectureSheet.svelte";
  import { createNetArchitecture } from "$lib/store.svelte";
  import type { NetArchitecture } from "$lib/types";

  // Stable id used only for the preview render — the real id is assigned
  // by createNetArchitecture on save, so this throwaway never reaches DB.
  const previewId = crypto.randomUUID();

  let live = $state<Omit<NetArchitecture, "id">>({
    name: "",
    demons: [],
    floors: [],
  });

  const livePreview = $derived<NetArchitecture>({ id: previewId, ...live });

  async function onSave(data: Omit<NetArchitecture, "id">) {
    await createNetArchitecture(data);
    goto("/net");
  }

  function onCancel() {
    goto("/net");
  }
</script>

<PageChrome
  backHref="/net"
  backLabel="Architectures"
  title="New NET architecture"
  faction="net"
>
  <div class="layout">
    <div class="form-col">
      <NetArchitectureForm
        submitLabel="Save architecture"
        {onSave}
        {onCancel}
        onChange={(data) => (live = data)}
      />
    </div>
    <div class="sheet-col">
      <h3 class="preview-head">Preview</h3>
      <NetArchitectureSheet arch={livePreview} />
    </div>
  </div>
</PageChrome>

<style>
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 2rem;
  }

  @media (min-width: 1100px) {
    .layout {
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
    }
  }

  .preview-head {
    margin: 0 0 0.75rem;
    color: var(--faction);
  }
</style>
