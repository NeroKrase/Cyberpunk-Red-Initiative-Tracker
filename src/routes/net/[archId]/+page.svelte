<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import PageChrome from "$lib/PageChrome.svelte";
  import NetArchitectureForm from "$lib/NetArchitectureForm.svelte";
  import NetArchitectureSheet from "$lib/NetArchitectureSheet.svelte";
  import {
    getNetArchitecture,
    updateNetArchitecture,
  } from "$lib/store.svelte";
  import type { NetArchitecture } from "$lib/types";

  const arch = $derived(getNetArchitecture(page.params.archId!));

  // Mirrors the form's working state so the sheet preview reflects edits
  // before save. Initialised from `arch` and replaced wholesale on each
  // form onChange — never mutated in place from this side, so the form
  // stays the source of truth while typing.
  let live = $state<Omit<NetArchitecture, "id"> | null>(null);

  const livePreview = $derived<NetArchitecture | null>(
    arch && live ? { id: arch.id, ...live } : arch ?? null,
  );

  async function onSave(data: Omit<NetArchitecture, "id">) {
    if (!arch) return;
    await updateNetArchitecture(arch.id, data);
    goto("/net");
  }

  function onCancel() {
    goto("/net");
  }
</script>

<PageChrome
  backHref="/net"
  backLabel="Architectures"
  title={arch ? `Edit ${arch.name || "architecture"}` : "Architecture not found"}
  faction="net"
>
  {#if arch}
    <div class="layout">
      <div class="form-col">
        <NetArchitectureForm
          initial={arch}
          submitLabel="Save changes"
          {onSave}
          {onCancel}
          onChange={(data) => (live = data)}
        />
      </div>
      <div class="sheet-col">
        <h3 class="preview-head">Preview</h3>
        {#if livePreview}
          <NetArchitectureSheet arch={livePreview} />
        {/if}
      </div>
    </div>
  {/if}
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
