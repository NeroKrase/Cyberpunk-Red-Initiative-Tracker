<script lang="ts">
  import { page } from "$app/state";
  import {
    getSession,
    getEncounter,
    addCombatant,
    updateCombatant,
    updateArmorSp,
    applyDamage,
    removeCombatant,
    store,
  } from "$lib/store.svelte";
  import { woundState, maxHpFromStats, type ArmorLocation } from "$lib/types";
  import CombatantDetails from "$lib/CombatantDetails.svelte";
  import { showConfirm } from "$lib/confirm.svelte";
  import { SvelteSet } from "svelte/reactivity";

  const session = $derived(getSession(page.params.sessionId!));
  const encounter = $derived(
    getEncounter(page.params.sessionId!, page.params.encounterId!),
  );

  const ordered = $derived(
    encounter
      ? [...encounter.combatants].sort((a, b) => b.initiative - a.initiative)
      : [],
  );

  let kind = $state<"pc" | "enemy">("enemy");
  let name = $state("");
  let initiative = $state<number | "">("");
  let templateId = $state<string>("");
  let nameOverride = $state("");

  let expanded = $state<Set<string>>(new SvelteSet());

  function toggleExpanded(id: string) {
    if (expanded.has(id)) expanded.delete(id);
    else expanded.add(id);
  }

  async function submit(event: Event) {
    event.preventDefault();
    if (initiative === "" || !session || !encounter) return;

    const init = Number(initiative);
    initiative = "";

    if (kind === "pc") {
      const trimmed = name.trim();
      if (!trimmed) return;
      name = "";
      await addCombatant(session.id, encounter.id, {
        kind: "pc",
        name: trimmed,
        initiative: init,
      });
    } else {
      if (!templateId) return;
      const override = nameOverride.trim() || undefined;
      nameOverride = "";
      await addCombatant(session.id, encounter.id, {
        kind: "enemy",
        templateId,
        initiative: init,
        nameOverride: override,
      });
    }
  }

  async function onFieldChange(
    combatantId: string,
    field: "initiative" | "hp",
    value: string,
  ) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !session || !encounter) return;
    await updateCombatant(session.id, encounter.id, combatantId, { [field]: parsed });
  }

  async function onArmorSpChange(
    combatantId: string,
    location: ArmorLocation,
    value: string,
  ) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !session || !encounter) return;
    await updateArmorSp(session.id, encounter.id, combatantId, location, parsed);
  }

  async function submitDamage(event: SubmitEvent, combatantId: string) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const dmgInput = form.elements.namedItem("damage") as HTMLInputElement;
    const locInput = form.elements.namedItem("location") as HTMLSelectElement;
    const dmg = Number(dmgInput.value);
    const location = locInput.value as ArmorLocation;
    if (!Number.isFinite(dmg) || dmg <= 0 || !session || !encounter) return;
    dmgInput.value = "";
    await applyDamage(session.id, encounter.id, combatantId, dmg, location);
  }

  async function deleteCombatant(combatantId: string, combatantName: string) {
    if (!session || !encounter) return;
    const ok = await showConfirm({
      title: "Remove combatant",
      message: `Remove "${combatantName}" from the encounter?`,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    expanded.delete(combatantId);
    await removeCombatant(session.id, encounter.id, combatantId);
  }
</script>

{#if session}
  <p><a href="/session/{session.id}">&larr; {session.name}</a></p>
{/if}

{#if !encounter}
  <h1>Encounter not found</h1>
{:else}
  <h1>{encounter.name}</h1>

  <form onsubmit={submit}>
    <fieldset class="kind-picker">
      <label>
        <input type="radio" bind:group={kind} value="pc" /> PC
      </label>
      <label>
        <input type="radio" bind:group={kind} value="enemy" /> Enemy
      </label>
    </fieldset>

    {#if kind === "pc"}
      <input placeholder="Name" bind:value={name} />
    {:else if store.templates.length === 0}
      <em>No templates yet &mdash; <a href="/bestiary/new">create one</a>.</em>
    {:else}
      <select bind:value={templateId}>
        <option value="" disabled>Pick template…</option>
        {#each store.templates as template (template.id)}
          <option value={template.id}>{template.name || "(unnamed)"}</option>
        {/each}
      </select>
      <input
        placeholder="Name override (optional)"
        bind:value={nameOverride}
      />
    {/if}

    <input
      type="number"
      placeholder="Init"
      bind:value={initiative}
      class="num"
    />
    <button
      type="submit"
      disabled={kind === "enemy" &&
        (store.templates.length === 0 || !templateId)}>Add</button
    >
  </form>

  {#if ordered.length === 0}
    <p>No combatants yet.</p>
  {:else}
    <ul>
      {#each ordered as combatant (combatant.id)}
        {@const isOpen = expanded.has(combatant.id)}
        <li>
          {#if combatant.kind === "enemy"}
            {@const maxHp = maxHpFromStats(combatant.stats)}
            {@const wound = woundState(combatant.hp, maxHp)}
            <div class="row">
              <button
                type="button"
                class="expand"
                class:open={isOpen}
                aria-expanded={isOpen}
                aria-label={isOpen ? `Collapse ${combatant.name}` : `Expand ${combatant.name}`}
                onclick={() => toggleExpanded(combatant.id)}
              >
                ›
              </button>
              <input
                type="number"
                value={combatant.initiative}
                onchange={(e) =>
                  onFieldChange(combatant.id, "initiative", e.currentTarget.value)}
                class="num"
                aria-label="Initiative for {combatant.name}"
              />
              <span class="kind-tag enemy">ENEMY</span>
              <strong class="name">{combatant.name}</strong>

              <span class="wound-slot" aria-hidden={wound === "none"}>
                {#if wound === "mortal"}
                  <span
                    class="wound-badge mortal"
                    aria-label="Mortally Wounded — HP at 0. −4 to all actions, −6 to MOVE. Roll a Death Save each turn (d10 ≤ BODY) until stabilized."
                    data-tooltip="Mortally Wounded — HP at 0. −4 to all actions, −6 to MOVE. Roll a Death Save each turn (d10 ≤ BODY) until stabilized."
                  >MW</span>
                {:else if wound === "serious"}
                  <span
                    class="wound-badge serious"
                    aria-label="Seriously Wounded — HP at or below half max. −2 penalty to all rolls until healed above half via First Aid or Paramedic."
                    data-tooltip="Seriously Wounded — HP at or below half max. −2 penalty to all rolls until healed above half via First Aid or Paramedic."
                  >SW</span>
                {/if}
              </span>

              <span class="stat">
                HP
                <input
                  type="number"
                  value={combatant.hp}
                  onchange={(e) =>
                    onFieldChange(combatant.id, "hp", e.currentTarget.value)}
                  class="num"
                  aria-label="HP for {combatant.name}"
                />
                / <span class="num readonly" aria-label="Max HP for {combatant.name}">{maxHp}</span>
              </span>

              <span class="stat">
                SP H
                <input
                  type="number"
                  value={combatant.armor.head.sp}
                  onchange={(e) =>
                    onArmorSpChange(combatant.id, "head", e.currentTarget.value)}
                  class="num"
                  aria-label="Head SP for {combatant.name}"
                />
              </span>
              <span class="stat">
                SP B
                <input
                  type="number"
                  value={combatant.armor.body.sp}
                  onchange={(e) =>
                    onArmorSpChange(combatant.id, "body", e.currentTarget.value)}
                  class="num"
                  aria-label="Body SP for {combatant.name}"
                />
              </span>

              <form
                class="damage-form"
                onsubmit={(e) => submitDamage(e, combatant.id)}
              >
                <select name="location" aria-label="Hit location">
                  <option value="body">Body</option>
                  <option value="head">Head</option>
                </select>
                <input
                  name="damage"
                  type="number"
                  placeholder="Dmg"
                  class="num"
                />
                <button type="submit">Hit</button>
              </form>
              <button
                type="button"
                class="del"
                onclick={() => deleteCombatant(combatant.id, combatant.name)}
                aria-label="Remove {combatant.name}">×</button
              >
            </div>
            {#if isOpen}
              <CombatantDetails
                {combatant}
                sessionId={session!.id}
                encounterId={encounter.id}
              />
            {/if}
          {:else}
            <div class="row">
              <span class="expand-spacer" aria-hidden="true"></span>
              <input
                type="number"
                value={combatant.initiative}
                onchange={(e) =>
                  onFieldChange(combatant.id, "initiative", e.currentTarget.value)}
                class="num"
                aria-label="Initiative for {combatant.name}"
              />
              <span class="kind-tag pc">PC</span>
              <strong class="name">{combatant.name}</strong>
              <button
                type="button"
                class="del"
                onclick={() => deleteCombatant(combatant.id, combatant.name)}
                aria-label="Remove {combatant.name}">×</button
              >
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
{/if}

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex-wrap: wrap;
  }

  .expand {
    width: 1.6rem;
    height: 1.6rem;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid var(--border-strong);
    color: var(--accent);
    font-family: var(--font-mono);
    font-size: 1rem;
    line-height: 1;
    transition: transform 120ms, border-color 120ms, color 120ms;
  }

  .expand:hover {
    border-color: var(--accent);
    color: var(--accent-bright);
  }

  .expand.open {
    transform: rotate(90deg);
    border-color: var(--accent);
  }

  .expand-spacer {
    width: 1.6rem;
    height: 1.6rem;
  }

  .name {
    flex: 0 1 8rem;
  }

  .stat {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    color: var(--text-muted);
    font-size: 0.78rem;
    letter-spacing: 0.04em;
  }

  :global(.num) {
    width: 3.4rem;
  }

  .row :global(.num) {
    padding-left: 0.4rem;
    padding-right: 0.3rem;
  }

  .readonly {
    display: inline-block;
    text-align: center;
    color: #ddd;
  }

  .kind-tag {
    padding: 0.1rem 0.4rem;
    font-size: 0.7em;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  .kind-tag.pc {
    background: color-mix(in srgb, var(--ncpd) 35%, transparent);
    color: var(--ncpd-bright);
  }

  .kind-tag.enemy {
    background: color-mix(in srgb, var(--accent) 35%, transparent);
    color: var(--accent-bright);
  }

  .wound-slot {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2.4rem;
  }

  .wound-badge {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.15rem 0.45rem;
    font-weight: 700;
    font-size: 0.78rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    cursor: help;
    line-height: 1;
  }

  .wound-badge.serious {
    color: var(--hazard);
    border: 1px solid var(--hazard);
    background: transparent;
  }

  .wound-badge.mortal {
    color: #fff;
    background: var(--accent);
    border: 1px solid var(--accent);
  }

  .wound-badge::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    width: max-content;
    max-width: 18rem;
    padding: 0.55rem 0.7rem;
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border-strong);
    border-left: 2px solid var(--accent);
    font-family: var(--font-ui);
    font-size: 0.78rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    text-transform: none;
    text-align: left;
    line-height: 1.4;
    white-space: normal;
    pointer-events: none;
    opacity: 0;
    transition: opacity 120ms;
    z-index: 10;
  }

  .wound-badge:hover::after {
    opacity: 1;
  }

  /* Push the right-side action cluster (damage form + delete) as a
     group; only the damage form anchors to auto so the delete button
     sits adjacent to it instead of fighting for the same edge. */
  .damage-form {
    display: inline-flex;
    gap: 0.2rem;
    margin: 0 0 0 auto;
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

  .damage-form select,
  .damage-form input,
  .damage-form button {
    padding: 0.3rem 0.5rem;
    font-size: 0.85rem;
  }

  .damage-form select {
    padding-right: 1.6rem;
  }

  .kind-picker {
    display: inline-flex;
    gap: 0.75rem;
    padding: 0.2rem 0.6rem;
    margin: 0;
    border: 1px solid var(--border-strong);
  }

  .kind-picker label {
    display: inline-flex;
    gap: 0.25rem;
    align-items: center;
    cursor: pointer;
  }

  select {
    font: inherit;
    padding: 0.4rem 0.6rem;
    background: var(--surface-2);
    color: inherit;
    border: 1px solid var(--border-strong);
  }
</style>
