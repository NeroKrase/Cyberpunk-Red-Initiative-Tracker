<script lang="ts">
  import { page } from "$app/state";
  import {
    getSession,
    getEncounter,
    addCombatant,
    updateCombatant,
    updateArmorSp,
    applyDamage,
    store,
  } from "$lib/store.svelte";
  import { woundState, maxHpFromStats, type ArmorLocation } from "$lib/types";

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

  function submit(event: Event) {
    event.preventDefault();
    if (initiative === "" || !session || !encounter) return;

    if (kind === "pc") {
      const trimmed = name.trim();
      if (!trimmed) return;
      addCombatant(session.id, encounter.id, {
        kind: "pc",
        name: trimmed,
        initiative: Number(initiative),
      });
      name = "";
    } else {
      if (!templateId) return;
      addCombatant(session.id, encounter.id, {
        kind: "enemy",
        templateId,
        initiative: Number(initiative),
        nameOverride: nameOverride.trim() || undefined,
      });
      nameOverride = "";
    }
    initiative = "";
  }

  function onFieldChange(
    combatantId: string,
    field: "initiative" | "hp",
    value: string,
  ) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !session || !encounter) return;
    updateCombatant(session.id, encounter.id, combatantId, { [field]: parsed });
  }

  function onArmorSpChange(
    combatantId: string,
    location: ArmorLocation,
    value: string,
  ) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !session || !encounter) return;
    updateArmorSp(session.id, encounter.id, combatantId, location, parsed);
  }

  function submitDamage(event: SubmitEvent, combatantId: string) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const dmgInput = form.elements.namedItem("damage") as HTMLInputElement;
    const locInput = form.elements.namedItem("location") as HTMLSelectElement;
    const dmg = Number(dmgInput.value);
    const location = locInput.value as ArmorLocation;
    if (!Number.isFinite(dmg) || dmg <= 0 || !session || !encounter) return;
    applyDamage(session.id, encounter.id, combatantId, dmg, location);
    dmgInput.value = "";
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
        <li>
          <div class="row">
            <input
              type="number"
              value={combatant.initiative}
              onchange={(e) =>
                onFieldChange(combatant.id, "initiative", e.currentTarget.value)}
              class="num"
              aria-label="Initiative for {combatant.name}"
            />
            <span class="kind-tag {combatant.kind}">
              {combatant.kind === "pc" ? "PC" : "ENEMY"}
            </span>
            <strong class="name">{combatant.name}</strong>

            {#if combatant.kind === "enemy"}
              {@const maxHp = maxHpFromStats(combatant.stats)}
              {@const wound = woundState(combatant.hp, maxHp)}
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

              {#if wound === "mortal"}
                <span class="badge mortal">Mortally Wounded</span>
              {:else if wound === "serious"}
                <span class="badge serious">Seriously Wounded</span>
              {/if}

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
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
{/if}

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .name {
    flex: 0 1 8rem;
  }

  .stat {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: #bbb;
    font-size: 0.9em;
  }

  :global(.num) {
    width: 4rem;
  }

  .readonly {
    display: inline-block;
    text-align: center;
    color: #ddd;
  }

  .kind-tag {
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    font-size: 0.7em;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  .kind-tag.pc {
    background: #1f4f70;
    color: #aad8ff;
  }

  .kind-tag.enemy {
    background: #5a2030;
    color: #ffb5c0;
  }

  .badge {
    padding: 0.1rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8em;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .badge.serious {
    background: #7a5200;
    color: #fff;
  }

  .badge.mortal {
    background: #a33;
    color: #fff;
  }

  .damage-form {
    display: inline-flex;
    gap: 0.25rem;
    margin: 0;
    margin-left: auto;
  }

  .kind-picker {
    display: inline-flex;
    gap: 0.75rem;
    padding: 0.2rem 0.6rem;
    margin: 0;
    border: 1px solid #444;
    border-radius: 4px;
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
    background: #2a2a2a;
    color: inherit;
    border: 1px solid #444;
    border-radius: 4px;
  }
</style>
