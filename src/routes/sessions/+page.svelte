<script lang="ts">
  import { store, createSession, deleteSession } from "$lib/store.svelte";
  import { showConfirm } from "$lib/confirm.svelte";

  let sessionName = $state("");

  function submitSession(event: Event) {
    event.preventDefault();
    const trimmed = sessionName.trim();
    if (!trimmed) return;
    createSession(trimmed);
    sessionName = "";
  }

  async function removeSession(id: string, name: string) {
    const ok = await showConfirm({
      title: "Delete session",
      message: `Delete session "${name}"? All its encounters will be lost.`,
    });
    if (ok) deleteSession(id);
  }
</script>

<div class="page">
  <p class="back"><a href="/">← Home</a></p>

  <header class="head">
    <span class="head-prefix">»</span>
    <h1>Sessions</h1>
  </header>

  <form onsubmit={submitSession} class="create">
    <input placeholder="// new session callsign" bind:value={sessionName} />
    <button type="submit">+ Log</button>
  </form>

  {#if store.sessions.length === 0}
    <p class="empty">// no sessions logged</p>
  {:else}
    <ul class="list">
      {#each store.sessions as session (session.id)}
        <li>
          <a href="/session/{session.id}" class="entry">
            <span class="prefix">›</span>
            <span class="name">{session.name}</span>
          </a>
          <span class="meta">{session.encounters.length} ENC</span>
          <button
            type="button"
            class="del"
            onclick={() => removeSession(session.id, session.name)}
            aria-label="Delete {session.name}">×</button
          >
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .page {
    --faction: var(--accent);
    --faction-bright: var(--accent-bright);
  }

  .back {
    margin: 0 0 1.25rem;
    font-size: 0.85rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .back :global(a) {
    color: var(--text-faint);
  }
  .back :global(a:hover) {
    color: var(--faction);
  }

  .head {
    display: flex;
    align-items: baseline;
    gap: 0.65rem;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid var(--faction);
    padding-bottom: 0.6rem;
  }
  .head h1 {
    margin: 0;
    color: var(--text);
  }
  .head-prefix {
    color: var(--faction);
    font-family: var(--font-mono);
    font-weight: 700;
  }

  .create {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }
  .create input {
    flex: 1;
  }

  .list {
    margin: 0;
  }
  .list :global(li) {
    padding: 0.65rem 0;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
  }
  .list :global(li:last-child) {
    border-bottom: none;
  }
  .list :global(li:hover) {
    background: linear-gradient(90deg, color-mix(in srgb, var(--faction) 8%, transparent), transparent);
  }

  .entry {
    display: inline-flex;
    align-items: baseline;
    gap: 0.5rem;
    color: var(--text);
    flex: 1;
    min-width: 0;
  }
  .entry:hover {
    color: var(--faction-bright);
  }
  .prefix {
    color: var(--faction);
    font-family: var(--font-mono);
  }
  .name {
    font-weight: 500;
    overflow-wrap: anywhere;
  }
  .meta {
    color: var(--text-faint);
    font-family: var(--font-mono);
    font-size: 0.78em;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .del {
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

  .empty {
    color: var(--text-faint);
    font-family: var(--font-mono);
    font-size: 0.9em;
    padding: 0.75rem 0;
    margin: 0;
  }
</style>
