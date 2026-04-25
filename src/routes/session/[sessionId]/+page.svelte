<script lang="ts">
  import { page } from "$app/state";
  import { getSession, createEncounter } from "$lib/store.svelte";

  const session = $derived(getSession(page.params.sessionId!));

  let name = $state("");

  function submit(event: Event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !session) return;
    createEncounter(session.id, trimmed);
    name = "";
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
        </li>
      {/each}
    </ul>
  {/if}
{/if}
