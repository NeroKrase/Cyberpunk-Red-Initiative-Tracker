<script lang="ts">
  import { page } from "$app/state";
  import { getSession, createEncounter, deleteEncounter } from "$lib/store.svelte";
  import { showConfirm } from "$lib/confirm.svelte";

  const session = $derived(getSession(page.params.sessionId!));

  let name = $state("");

  function submit(event: Event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !session) return;
    createEncounter(session.id, trimmed);
    name = "";
  }

  async function removeEncounter(encounterId: string, encounterName: string) {
    if (!session) return;
    const ok = await showConfirm({
      title: "Delete encounter",
      message: `Delete encounter "${encounterName}"?`,
    });
    if (ok) deleteEncounter(session.id, encounterId);
  }
</script>

<p><a href="/sessions">&larr; Sessions</a></p>

{#if !session}
  <h1>Session not found</h1>
{:else}
  <h1>{session.name}</h1>
  <h2>Encounters</h2>

  <form onsubmit={submit}>
    <input placeholder="Encounter name" bind:value={name} />
    <button type="submit">Create</button>
  </form>

  {#if session.encounters.length === 0}
    <p>No encounters yet.</p>
  {:else}
    <ul>
      {#each session.encounters as encounter (encounter.id)}
        <li>
          <a href="/session/{session.id}/encounter/{encounter.id}">
            {encounter.name}
          </a>
          <small>({encounter.combatants.length} combatants)</small>
          <button
            type="button"
            class="del"
            onclick={() => removeEncounter(encounter.id, encounter.name)}
            aria-label="Delete {encounter.name}">×</button
          >
        </li>
      {/each}
    </ul>
  {/if}
{/if}

<style>
  li {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .del {
    margin-left: auto;
    border: 1px solid transparent;
    color: var(--text-faint);
    padding: 0.05rem 0.45rem;
    font-size: 1em;
    line-height: 1;
  }
  .del:hover {
    color: var(--accent-bright);
    border-color: var(--accent);
  }
</style>
