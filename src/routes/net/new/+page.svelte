<script lang="ts">
  import { goto } from "$app/navigation";
  import PageChrome from "$lib/PageChrome.svelte";
  import NetArchitectureSheet from "$lib/NetArchitectureSheet.svelte";
  import { createNetArchitecture } from "$lib/store.svelte";
  import type { NetArchitecture } from "$lib/types";

  // Draft lives only in memory — nothing is persisted until the user
  // clicks Register. The page's Back link, Cancel button, and tab close
  // all discard the draft cleanly. An id is allocated up front because
  // NetArchitectureSheet expects a full NetArchitecture; createNet…
  // rolls its own id when the draft is saved.
  let draft = $state<NetArchitecture>({
    id: crypto.randomUUID(),
    name: "",
    demons: [],
    floors: [],
  });

  let registerBtn: HTMLButtonElement | undefined = $state();

  // Clear any lingering "missing floors" message as soon as the user
  // adds a floor — same way the native required tooltip vanishes once
  // the field is filled.
  $effect(() => {
    if (draft.floors.length > 0) registerBtn?.setCustomValidity("");
  });

  async function register(event: Event) {
    event.preventDefault();
    if (draft.floors.length === 0) {
      // Mirror the weapon-template "name required" UX: the browser's
      // native constraint-validation tooltip anchors to the submit
      // button when its form fails validation.
      registerBtn?.setCustomValidity(
        "Add at least one floor before registering this architecture",
      );
      registerBtn?.reportValidity();
      return;
    }
    registerBtn?.setCustomValidity("");
    const arch = await createNetArchitecture({
      name: draft.name,
      demons: draft.demons,
      floors: draft.floors,
    });
    goto(`/net/${arch.id}`, { replaceState: true });
  }

  function cancel() {
    goto("/net");
  }
</script>

<PageChrome
  backHref="/net"
  backLabel="Architectures"
  title="Build NET architecture"
  faction="net"
>
  <NetArchitectureSheet arch={draft} onChange={() => {}} />
  <form class="actions" onsubmit={register}>
    <button type="submit" bind:this={registerBtn}>
      Register architecture
    </button>
    <button type="button" onclick={cancel}>Cancel</button>
  </form>
</PageChrome>

<style>
  .actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1.5rem;
  }
</style>
