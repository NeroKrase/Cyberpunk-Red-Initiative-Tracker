<script lang="ts">
  import {
    store,
    deleteTemplate,
    deleteWeaponTemplate,
  } from "$lib/store.svelte";
  import { downloadNpcCard, type CardSize } from "$lib/cards";
  import type { EnemyTemplate } from "$lib/types";
  import { maxHpFromStats } from "$lib/types";

  let tab = $state<"npcs" | "weapons">("npcs");

  function removeTemplate(id: string, name: string) {
    if (confirm(`Delete record "${name}"?`)) deleteTemplate(id);
  }

  function removeWeapon(id: string, name: string) {
    if (confirm(`Delete weapon "${name}"?`)) deleteWeaponTemplate(id);
  }

  async function generateCard(template: EnemyTemplate, size: CardSize) {
    try {
      await downloadNpcCard(template, size);
    } catch (err) {
      console.error("card generation failed", err);
      alert("Failed to generate card. See console for details.");
    }
  }
</script>

<div class="page">
  <p class="back"><a href="/">← Home</a></p>

  <header class="head">
    <span class="head-prefix">»</span>
    <h1>NCPD Crime Database</h1>
  </header>

  <div class="tabs" role="tablist">
    <button
      role="tab"
      type="button"
      class="tab"
      class:active={tab === "npcs"}
      aria-selected={tab === "npcs"}
      onclick={() => (tab = "npcs")}>NPCs</button
    >
    <button
      role="tab"
      type="button"
      class="tab"
      class:active={tab === "weapons"}
      aria-selected={tab === "weapons"}
      onclick={() => (tab = "weapons")}>Weapons</button
    >
  </div>

  {#if tab === "npcs"}
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
            <span class="meta"
              >HP {maxHpFromStats(template.stats)} · SP {template.armor.head
                .sp}/{template.armor.body.sp}</span
            >
            <button
              type="button"
              class="card-btn"
              onclick={() => generateCard(template, "small")}
              aria-label="Download small card for {template.name}"
              title="Download small NPC card"
            >
              <span class="card-tag">CARD</span>
              <span class="card-size">S</span>
            </button>
            <button
              type="button"
              class="card-btn"
              onclick={() => generateCard(template, "big")}
              aria-label="Download big card for {template.name}"
              title="Download big NPC card"
            >
              <span class="card-tag">CARD</span>
              <span class="card-size">L</span>
            </button>
            <button
              type="button"
              class="del"
              onclick={() => removeTemplate(template.id, template.name)}
              aria-label="Delete {template.name}">×</button
            >
          </li>
        {/each}
      </ul>
    {/if}
  {:else}
    <a href="/bestiary/weapons/new" class="action">+ Register new weapon</a>

    {#if store.weaponTemplates.length === 0}
      <p class="empty">// no weapons in registry</p>
    {:else}
      <ul class="list">
        {#each store.weaponTemplates as weapon (weapon.id)}
          <li>
            <a href="/bestiary/weapons/{weapon.id}" class="entry">
              <span class="prefix">›</span>
              <span class="name">{weapon.name || "(unnamed)"}</span>
            </a>
            <span class="meta"
              >ROF {weapon.rof} · {weapon.damage}D6 · AMMO {weapon.ammo}</span
            >
            <button
              type="button"
              class="del"
              onclick={() => removeWeapon(weapon.id, weapon.name)}
              aria-label="Delete {weapon.name}">×</button
            >
          </li>
        {/each}
      </ul>
    {/if}
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

  .tabs {
    display: flex;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid var(--border-strong);
  }
  .tab {
    padding: 0.45rem 1.1rem;
    margin-bottom: -1px;
    background: transparent;
    color: var(--text-faint);
    border: 1px solid transparent;
    border-bottom: 1px solid var(--border-strong);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.85em;
    font-weight: 700;
    cursor: pointer;
  }
  .tab:hover:not(.active) {
    color: var(--faction);
  }
  .tab.active {
    color: var(--faction);
    border-color: var(--border-strong) var(--border-strong) var(--bg)
      var(--border-strong);
    border-top-color: var(--faction);
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

  .card-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.2rem 0.5rem;
    border: 1px solid var(--border-strong);
    background: transparent;
    color: var(--text-muted);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    cursor: pointer;
    line-height: 1;
  }
  .card-btn:hover {
    color: var(--faction);
    border-color: var(--faction);
  }
  .card-tag {
    font-family: var(--font-mono);
    font-weight: 700;
  }
  .card-size {
    font-family: var(--font-mono);
    font-weight: 700;
    color: var(--faction);
  }

  .empty {
    color: var(--text-faint);
    font-family: var(--font-mono);
    font-size: 0.9em;
    padding: 0.75rem 0;
    margin: 0;
  }
</style>
