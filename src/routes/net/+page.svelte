<script lang="ts">
  import PageChrome from "$lib/PageChrome.svelte";
  import {
    store,
    deleteNetArchitecture,
    duplicateNetArchitecture,
  } from "$lib/store.svelte";
  import { showConfirm } from "$lib/confirm.svelte";

  async function removeArchitecture(id: string, name: string) {
    const ok = await showConfirm({
      title: "Delete architecture",
      message: `Delete architecture "${name || "(unnamed)"}"?`,
    });
    if (ok) await deleteNetArchitecture(id);
  }
</script>

<PageChrome
  backHref="/"
  backLabel="Home"
  title="NET Architectures"
  faction="net"
>
  <a href="/net/new" class="action">+ Build new architecture</a>

  {#if store.netArchitectures.length === 0}
    <p class="empty">// no architectures logged</p>
  {:else}
    <ul class="list">
      {#each store.netArchitectures as arch (arch.id)}
        <li>
          <a href="/net/{arch.id}" class="entry">
            <span class="prefix">›</span>
            <span class="name">{arch.name || "(unnamed)"}</span>
          </a>
          <span class="meta">
            {arch.floors.length} {arch.floors.length === 1 ? "FLOOR" : "FLOORS"}
            · {arch.demons.length === 0
              ? "—"
              : arch.demons.length === 1
                ? arch.demons[0].name || "DEMON"
                : `${arch.demons.length} DEMONS`}
          </span>
          <button
            type="button"
            class="del"
            onclick={() => void duplicateNetArchitecture(arch.id)}
            aria-label="Duplicate {arch.name}"
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
            class="del"
            onclick={() => removeArchitecture(arch.id, arch.name)}
            aria-label="Delete {arch.name}">×</button
          >
        </li>
      {/each}
    </ul>
  {/if}
</PageChrome>

<style>
  .action {
    display: inline-block;
    margin-bottom: 1.5rem;
    padding: 0.45rem 0.95rem;
    border: 1px solid var(--faction);
    color: var(--faction);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.85em;
    font-weight: 700;
  }
  .action:hover {
    background: var(--faction);
    color: #000;
  }

  .list {
    margin: 0;
  }
  .list :global(li) {
    padding: 0.65rem 0;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
    row-gap: 0.35rem;
  }
  .list :global(li > .meta) {
    margin-left: auto;
  }
  .list :global(li:last-child) {
    border-bottom: none;
  }
  .list :global(li:hover) {
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--faction) 8%, transparent),
      transparent
    );
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
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: 0.78em;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .del {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    color: var(--text-faint);
    padding: 0.2rem 0.4rem;
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
