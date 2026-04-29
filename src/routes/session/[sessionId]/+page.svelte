<script lang="ts">
  import { page } from "$app/state";
  import {
    getSession,
    createEncounter,
    deleteEncounter,
    renameEncounter,
    duplicateEncounter,
  } from "$lib/store.svelte";
  import { showConfirm } from "$lib/confirm.svelte";
  import { showPrompt } from "$lib/prompt.svelte";

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

  async function editEncounter(encounterId: string, encounterName: string) {
    if (!session) return;
    const next = await showPrompt({
      title: "Rename encounter",
      label: "Name",
      initialValue: encounterName,
    });
    if (next && next !== encounterName) renameEncounter(session.id, encounterId, next);
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
            class="icon-btn edit-btn"
            onclick={() => editEncounter(encounter.id, encounter.name)}
            aria-label="Rename {encounter.name}"
          >
            <svg
              viewBox="0 0 100 100"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              stroke-width="8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M 65 25 L 75 35 L 30 80 L 15 85 L 20 70 Z" />
              <path d="M 55 35 L 65 45" />
            </svg>
          </button>
          <button
            type="button"
            class="icon-btn"
            onclick={() => session && duplicateEncounter(session.id, encounter.id)}
            aria-label="Duplicate {encounter.name}"
          >
            <svg
              viewBox="0 0 100 100"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              stroke-width="8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="20" y="30" width="50" height="55" />
              <path d="M 30 30 L 30 15 L 80 15 L 80 70 L 70 70" />
            </svg>
          </button>
          <button
            type="button"
            class="icon-btn"
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

  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    color: var(--text-faint);
    padding: 0.2rem 0.4rem;
    font-size: 1em;
    line-height: 1;
  }
  .icon-btn:hover {
    color: var(--accent-bright);
    border-color: var(--accent);
  }
  .edit-btn {
    margin-left: auto;
  }
</style>
