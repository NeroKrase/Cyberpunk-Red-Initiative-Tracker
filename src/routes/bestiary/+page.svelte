<script lang="ts">
  import { store, deleteTemplate } from "$lib/store.svelte";
  import { maxHpFromStats } from "$lib/types";

  function removeTemplate(id: string, name: string) {
    if (confirm(`Delete record "${name}"?`)) deleteTemplate(id);
  }
</script>

<div class="page">
  <p class="back"><a href="/">← Home</a></p>

  <header class="head">
    <span class="head-prefix">»</span>
    <h1>NCPD Crime Database</h1>
  </header>

  <a href="/bestiary/new" class="action">+ File new perp</a>

  {#if store.templates.length === 0}
    <p class="empty">// records database empty</p>
  {:else}
    <ul class="list">
      {#each store.templates as template (template.id)}
        <li>
          <a href="/bestiary/{template.id}" class="entry">
            <span class="prefix">›</span>
            <span class="name">{template.name || "(unnamed)"}</span>
            {#if template.role}<span class="role">{template.role}</span>{/if}
          </a>
          <span class="meta">HP {maxHpFromStats(template.stats)} · SP {template.armor.head.sp}/{template.armor.body.sp}</span>
          <button
            type="button"
            class="del"
            onclick={() => removeTemplate(template.id, template.name)}
            aria-label="Delete {template.name}"
          >×</button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .page {
    --faction: var(--ncpd);
    --faction-bright: var(--ncpd-bright);
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
    align-items: baseline;
    gap: 0.6rem;
    flex-wrap: wrap;
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
  .role {
    color: var(--text-faint);
    font-size: 0.85em;
    margin-left: 0.4rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .meta {
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: 0.78em;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-left: auto;
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
