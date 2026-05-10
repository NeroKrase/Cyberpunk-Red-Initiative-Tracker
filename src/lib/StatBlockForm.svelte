<script lang="ts">
  import { untrack } from "svelte";
  import type {
    EnemyStatBlock,
    SkillCategory,
    Weapon,
    WeaponKind,
  } from "./types";
  import {
    MAX_REPUTATION,
    MELEE_WEAPON_TYPES,
    RANGE_WEAPON_TYPES,
    STAT_KEYS,
    SKILL_CATALOG,
    SKILL_CATEGORIES,
    clampReputation,
    emptyStatBlock,
    emptyWeapon,
    getSkillStat,
    isRange,
    maxHpFromStats,
    weaponCombatNumber,
  } from "./types";
  import { store } from "./store.svelte";

  type Props = {
    initial?: EnemyStatBlock;
    submitLabel: string;
    onSave: (data: EnemyStatBlock) => void;
    onCancel?: () => void;
  };

  let { initial, submitLabel, onSave, onCancel }: Props = $props();

  function clone(data: EnemyStatBlock): EnemyStatBlock {
    return JSON.parse(JSON.stringify(data));
  }

  const seed = untrack(() => clone(initial ?? emptyStatBlock()));
  let name = $state(seed.name);
  let role = $state(seed.role);
  let reputation = $state(seed.reputation);
  let stats = $state(seed.stats);
  let armor = $state(seed.armor);
  let weapons = $state(seed.weapons);
  let skills = $state(seed.skills);
  let gear = $state(seed.gear);
  let cyberware = $state(seed.cyberware);

  const maxHp = $derived(maxHpFromStats(stats));
  const usedSkillNames = $derived(new Set(skills.map((s) => s.name)));

  function availableInCategory(category: SkillCategory) {
    return SKILL_CATALOG.filter(
      (s) => s.category === category && !usedSkillNames.has(s.name),
    );
  }

  function addSkillFromSelect(event: Event) {
    const select = event.currentTarget as HTMLSelectElement;
    const skillName = select.value;
    if (!skillName) return;
    skills.push({ id: crypto.randomUUID(), name: skillName, level: 0, mod: 0 });
    select.value = "";
  }

  function statValue(skillName: string): { stat: string; value: number } {
    const stat = getSkillStat(skillName);
    if (!stat) return { stat: "—", value: 0 };
    return { stat: stat.toUpperCase(), value: stats[stat] };
  }

  function addWeapon() {
    weapons.push(emptyWeapon());
  }

  function addWeaponFromTemplate(event: Event) {
    const select = event.currentTarget as HTMLSelectElement;
    const id = select.value;
    select.value = "";
    if (!id) return;
    const template = store.weaponTemplates.find((t) => t.id === id);
    if (!template) return;
    const id_ = crypto.randomUUID();
    const common = {
      id: id_,
      name: template.name,
      quality: template.quality,
      rof: template.rof,
      damage: template.damage,
      description: template.description,
      templateId: template.id,
    };
    weapons.push(
      template.kind === "melee"
        ? {
            ...common,
            kind: "melee",
            weaponType: template.weaponType,
          }
        : {
            ...common,
            kind: "range",
            weaponType: template.weaponType,
            magazine: template.magazine,
            // Fresh NPC weapon: mag full, inventory carries the
            // template's stock of spare rounds.
            loaded: template.magazine,
            ammo: template.ammo,
          },
    );
  }

  // Switch a weapon row between melee and range while preserving every
  // shared field. Resets weaponType because the allowed-types lists are
  // disjoint between the two kinds.
  function changeKind(i: number, newKind: WeaponKind) {
    const w = weapons[i];
    if (w.kind === newKind) return;
    if (newKind === "melee") {
      weapons[i] = {
        id: w.id,
        kind: "melee",
        name: w.name,
        weaponType: "",
        quality: w.quality,
        rof: w.rof,
        damage: w.damage,
        description: w.description,
        templateId: w.templateId,
      };
    } else {
      weapons[i] = {
        id: w.id,
        kind: "range",
        name: w.name,
        weaponType: "",
        quality: w.quality,
        rof: w.rof,
        magazine: 0,
        loaded: 0,
        ammo: 0,
        damage: w.damage,
        description: w.description,
        templateId: w.templateId,
      };
    }
  }

  // Combat number = associated-skill total + EQ bonus. Memoized via
  // $derived so we only rebuild the lookup block when stats/skills
  // actually change, instead of once per weapon row per keystroke.
  const combatBlock = $derived<EnemyStatBlock>({
    name,
    role,
    reputation,
    stats,
    armor,
    weapons,
    skills,
    gear,
    cyberware,
  });
  function combatNumber(weapon: Weapon): string {
    const v = weaponCombatNumber(combatBlock, weapon.weaponType, weapon.quality);
    return v == null ? "—" : String(v);
  }

  function submit(event: Event) {
    event.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      role: role.trim(),
      reputation: clampReputation(reputation),
      stats,
      armor,
      weapons,
      skills,
      gear,
      cyberware,
    });
  }
</script>

<form onsubmit={submit} class="stat-form">
  <section>
    <h3>Identity</h3>
    <div class="grid">
      <label>
        Name
        <input bind:value={name} required />
      </label>
      <label>
        Role
        <input bind:value={role} placeholder="e.g. Solo, None" />
      </label>
      <label>
        Reputation
        <input
          type="number"
          min="0"
          max={MAX_REPUTATION}
          step="1"
          value={reputation}
          oninput={(e) => {
            reputation = clampReputation(Number(e.currentTarget.value));
            e.currentTarget.value = String(reputation);
          }}
        />
      </label>
      <div class="readonly-field" title="HP = 10 + 5 × ⌈(BODY + WILL) / 2⌉">
        <span class="label-text">Max HP</span>
        <span class="readonly-value">{maxHp}</span>
      </div>
    </div>
  </section>

  <section>
    <h3>Stats</h3>
    <div class="stats-grid">
      {#each STAT_KEYS as key}
        <label>
          <span class="stat-name">{key.toUpperCase()}</span>
          <input type="number" bind:value={stats[key]} />
        </label>
      {/each}
    </div>
  </section>

  <section>
    <h3>Armor</h3>
    <div class="grid">
      <label>
        Head name
        <input bind:value={armor.head.name} placeholder="e.g. Leather" />
      </label>
      <label>
        Head SP
        <input type="number" bind:value={armor.head.sp} />
      </label>
      <label>
        Body name
        <input bind:value={armor.body.name} placeholder="e.g. Leather" />
      </label>
      <label>
        Body SP
        <input type="number" bind:value={armor.body.sp} />
      </label>
    </div>
  </section>

  <section>
    <div class="section-head">
      <h3>Weapons</h3>
      <div class="weapon-add">
        <button type="button" onclick={addWeapon}>+ Weapon</button>
        {#if store.weaponTemplates.length}
          <select
            class="add-from-template"
            onchange={addWeaponFromTemplate}
            aria-label="Add weapon from template"
          >
            <option value="" selected>+ From template…</option>
            {#each store.weaponTemplates as wt (wt.id)}
              <option value={wt.id}>{wt.name || "(unnamed)"}</option>
            {/each}
          </select>
        {/if}
      </div>
    </div>
    {#if weapons.length}
      <div class="weapon-grid">
        <span class="weapon-head">Name</span>
        <span class="weapon-head">Kind</span>
        <span class="weapon-head">Type</span>
        <span class="weapon-head">Qual</span>
        <span class="weapon-head" title="Combat number">C#</span>
        <span class="weapon-head">ROF</span>
        <span class="weapon-head" title="Loaded / max magazine (range only)">Mag</span>
        <span class="weapon-head" title="Inventory ammo (range only)">Ammo</span>
        <span class="weapon-head">Dmg</span>
        <span></span>
        {#each weapons as weapon, i (weapon.id)}
          <input bind:value={weapon.name} placeholder="Name" />
          <select
            class="kind-select"
            value={weapon.kind}
            onchange={(e) =>
              changeKind(i, e.currentTarget.value as WeaponKind)}
            aria-label="Kind for {weapon.name || 'weapon'}"
          >
            <option value="melee">Melee</option>
            <option value="range">Range</option>
          </select>
          {#if weapon.kind === "melee"}
            <select
              class="type-select"
              bind:value={weapon.weaponType}
              aria-label="Type for {weapon.name || 'weapon'}"
            >
              <option value="">— Untyped —</option>
              {#each MELEE_WEAPON_TYPES as wt (wt)}
                <option value={wt}>{wt}</option>
              {/each}
            </select>
          {:else}
            <select
              class="type-select"
              bind:value={weapon.weaponType}
              aria-label="Type for {weapon.name || 'weapon'}"
            >
              <option value="">— Untyped —</option>
              {#each RANGE_WEAPON_TYPES as wt (wt)}
                <option value={wt}>{wt}</option>
              {/each}
            </select>
          {/if}
          <select
            class="quality-select quality-bg-{weapon.quality || 'normal'}"
            bind:value={weapon.quality}
            aria-label="Quality for {weapon.name || 'weapon'}"
          >
            <option value="" class="quality-opt-normal">Normal</option>
            <option value="excellent" class="quality-opt-excellent"
              >EQ — Excellent</option
            >
            <option value="poor" class="quality-opt-poor">PQ — Poor</option>
          </select>
          <span
            class="combat-num"
            aria-label="Combat number for {weapon.name || 'weapon'}"
            title="Associated skill total{weapon.quality === 'excellent'
              ? ' (+1 EQ)'
              : ''}"
          >
            {combatNumber(weapon)}
          </span>
          <input
            type="number"
            min="1"
            step="1"
            bind:value={weapon.rof}
            class="num"
            aria-label="ROF for {weapon.name || 'weapon'}"
          />
          {#if weapon.kind === "range"}
            <span
              class="mag-block"
              aria-label="Loaded / max magazine for {weapon.name || 'weapon'}"
            >
              <input
                type="number"
                min="0"
                step="1"
                max={weapon.magazine}
                bind:value={weapon.loaded}
                class="mag-loaded"
                aria-label="Loaded rounds for {weapon.name || 'weapon'}"
              />
              <span class="mag-sep">/</span>
              <span class="mag-max">{weapon.magazine}</span>
            </span>
            <input
              type="number"
              min="0"
              step="1"
              bind:value={weapon.ammo}
              class="num"
              aria-label="Inventory ammo for {weapon.name || 'weapon'}"
            />
          {:else}
            <span
              class="empty-cell empty-melee"
              aria-label="No magazine or ammo for melee">—</span
            >
          {/if}
          <span class="dmg-block">
            <input
              type="number"
              min="0"
              step="1"
              bind:value={weapon.damage}
              class="dmg-input"
              aria-label="Damage d6 for {weapon.name || 'weapon'}"
            />
            <span class="dmg-suffix">d6</span>
          </span>
          <button
            type="button"
            onclick={() => weapons.splice(i, 1)}
            aria-label="Remove {weapon.name || 'weapon'}">×</button
          >
          <details class="weapon-desc">
            <summary>Description</summary>
            <textarea
              bind:value={weapon.description}
              rows="3"
              placeholder="Notes, ammo type, mods…"
            ></textarea>
          </details>
        {/each}
      </div>
    {/if}
  </section>

  <section>
    <div class="section-head">
      <h3>Skills</h3>
      <select class="add-skill" onchange={addSkillFromSelect}>
        <option value="" selected>+ Add skill…</option>
        {#each SKILL_CATEGORIES as category}
          {@const options = availableInCategory(category)}
          {#if options.length}
            <optgroup label={category}>
              {#each options as entry (entry.name)}
                <option value={entry.name}>{entry.name}</option>
              {/each}
            </optgroup>
          {/if}
        {/each}
      </select>
    </div>
    {#if skills.length}
      <div class="skill-grid">
        <span class="skill-head">Skill</span>
        <span class="skill-head">Stat</span>
        <span class="skill-head">Lvl</span>
        <span class="skill-head">Mod</span>
        <span class="skill-head">Total</span>
        <span></span>
        {#each skills as skill, i (skill.id)}
          {@const sv = statValue(skill.name)}
          <span class="skill-name">{skill.name}</span>
          <span class="skill-stat">{sv.stat} ({sv.value})</span>
          <input type="number" bind:value={skill.level} class="num" aria-label="Level for {skill.name}" />
          <input type="number" bind:value={skill.mod} class="num" aria-label="Mod for {skill.name}" />
          <span class="skill-total">{sv.value + skill.level + skill.mod}</span>
          <button type="button" onclick={() => skills.splice(i, 1)} aria-label="Remove {skill.name}">×</button>
        {/each}
      </div>
    {/if}
  </section>

  <section>
    <div class="section-head">
      <h3>Gear</h3>
      <button type="button" onclick={() => gear.push("")}>+ Gear</button>
    </div>
    {#each gear as _, i}
      <div class="row">
        <input bind:value={gear[i]} placeholder="Item" class="grow" />
        <button type="button" onclick={() => gear.splice(i, 1)}>×</button>
      </div>
    {/each}
  </section>

  <section>
    <div class="section-head">
      <h3>Cyberware</h3>
      <button type="button" onclick={() => cyberware.push("")}
        >+ Cyberware</button
      >
    </div>
    {#each cyberware as _, i}
      <div class="row">
        <input bind:value={cyberware[i]} placeholder="Item" class="grow" />
        <button type="button" onclick={() => cyberware.splice(i, 1)}>×</button>
      </div>
    {/each}
  </section>

  <div class="actions">
    <button type="submit">{submitLabel}</button>
    {#if onCancel}
      <button type="button" onclick={onCancel}>Cancel</button>
    {/if}
  </div>
</form>

<style>
  .stat-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin: 0;
  }

  .stat-form input:focus,
  .stat-form select:focus,
  .stat-form textarea:focus {
    border-color: var(--faction, var(--ncpd));
  }

  section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .section-head h3 {
    margin: 0;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: 0.5rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.85em;
    color: var(--text-muted);
  }

  label input {
    font-size: 1em;
  }

  .stat-name {
    text-align: center;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--faction, var(--text-muted));
  }

  .row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .grow {
    flex: 1;
  }

  .num {
    width: 4.5rem;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .readonly-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.85em;
    color: var(--text-muted);
  }

  .readonly-value {
    padding: 0.45rem 0.7rem;
    background: var(--surface-2);
    border: 1px solid var(--border-strong);
    color: var(--text);
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
  }

  .label-text {
    color: var(--text-muted);
  }

  .add-skill,
  .add-from-template {
    padding: 0.35rem 0.6rem;
    font-size: 0.85em;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }
  .add-skill:hover,
  .add-from-template:hover {
    border-color: var(--faction, var(--ncpd));
    color: var(--text);
  }

  .skill-grid {
    display: grid;
    grid-template-columns: 1fr auto 4.5rem 4.5rem 4.5rem auto;
    gap: 0.4rem 0.6rem;
    align-items: center;
  }

  .skill-grid .num {
    width: 100%;
    box-sizing: border-box;
  }

  .skill-head,
  .weapon-head {
    font-size: 0.72em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-faint);
  }

  .skill-name {
    font-weight: 500;
  }

  .skill-stat {
    font-family: var(--font-mono);
    font-size: 0.85em;
    color: var(--text-muted);
    white-space: nowrap;
  }

  .skill-total {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    text-align: center;
    min-width: 1.5rem;
    color: var(--faction, var(--ncpd));
  }

  .weapon-add {
    display: inline-flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .weapon-grid {
    display: grid;
    grid-template-columns:
      minmax(12.5rem, 1.83fr) /* Name (wider) */
      5rem /* Kind */
      minmax(5.5rem, 0.77fr) /* Type (half width +10%) */
      minmax(8rem, 0.7fr) /* Qual — wide enough for "EQ — Excellent" */
      2.5rem /* C# */
      4rem /* ROF */
      5.5rem /* Mag — fits "99 / 99" with snug separator */
      4rem /* Ammo (inventory) */
      4.5rem /* Dmg + d6 suffix */
      auto; /* × */
    gap: 0.4rem 0.6rem;
    align-items: center;
  }

  .weapon-grid .num {
    width: 100%;
    box-sizing: border-box;
  }

  .kind-select,
  .type-select {
    font-size: 0.85em;
  }

  .empty-cell {
    text-align: center;
    color: var(--text-faint);
    font-family: var(--font-mono);
  }
  /* For melee rows the Mag and Ammo columns collapse into one centered
     dash spanning both grid tracks — keeps row alignment with range
     rows while saying "n/a" once instead of twice. */
  .empty-cell.empty-melee {
    grid-column: span 2;
  }

  /* Damage cell: bordered block matching a regular input (same
     padding / border / surface), with the editable digits and a
     static "d6" suffix sitting inside as one visual unit. The inner
     <input> is borderless and transparent so the wrapper plays the
     role of the input field; native number spinners are hidden so
     the value hugs the suffix. */
  .dmg-block,
  .mag-block {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    padding: 0.45rem 0.7rem;
    background: var(--surface-2);
    border: 1px solid var(--border-strong);
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    box-sizing: border-box;
    width: 100%;
    line-height: normal;
    /* Stretch to the grid row's natural height (set by sibling input
       cells) so heights always match across the row. */
    align-self: stretch;
  }
  .dmg-block:focus-within,
  .mag-block:focus-within {
    border-color: var(--faction, var(--ncpd));
  }
  .dmg-block input,
  .mag-block input {
    background: transparent;
    border: none;
    padding: 0;
    color: var(--text);
    font-family: inherit;
    font-size: inherit;
    appearance: textfield;
    -moz-appearance: textfield;
  }
  .dmg-block input:focus,
  .mag-block input:focus {
    outline: none;
  }
  .dmg-block input::-webkit-outer-spin-button,
  .dmg-block input::-webkit-inner-spin-button,
  .mag-block input::-webkit-outer-spin-button,
  .mag-block input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .dmg-block {
    justify-content: flex-start;
  }
  .dmg-block .dmg-input {
    flex: 0 0 auto;
    text-align: left;
    /* Shrink to content so "d6" sits right after the digits, with no
       dead space on either side. */
    field-sizing: content;
    min-width: 1ch;
    max-width: 4ch;
  }
  .dmg-suffix {
    color: var(--text-muted);
    flex: 0 0 auto;
  }

  /* Mag cell: loaded value sits at the left of the cell (under the
     "Mag" header), with "/{max}" immediately after it on the same
     baseline. Everything inside the block, no floating elements. */
  .mag-block {
    justify-content: flex-start;
  }
  .mag-block .mag-loaded {
    flex: 0 0 auto;
    text-align: left;
    /* Same content-sizing trick as .dmg-input so "/" hugs the value
       regardless of digit count. */
    field-sizing: content;
    min-width: 1ch;
    max-width: 4ch;
  }
  .mag-sep {
    color: var(--text-faint);
    flex: 0 0 auto;
  }
  .mag-max {
    color: var(--text-muted);
    flex: 0 0 auto;
  }

  .quality-select {
    font-size: 0.85em;
    font-weight: 700;
  }
  /* Closed-select bg follows the selected quality. Tokens only — never
     raw hex (per STYLE.md). */
  .quality-select.quality-bg-excellent,
  .quality-select option.quality-opt-excellent {
    background-color: var(--hazard);
    color: var(--bg);
  }
  .quality-select.quality-bg-poor,
  .quality-select option.quality-opt-poor {
    background-color: var(--accent);
    color: var(--text);
  }
  .quality-select.quality-bg-normal,
  .quality-select option.quality-opt-normal {
    background-color: var(--text-faint);
    color: var(--text);
  }

  .combat-num {
    text-align: center;
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    color: var(--faction, var(--ncpd));
    min-width: 2.2rem;
  }

  .weapon-desc {
    grid-column: 1 / -1;
    margin: 0 0 0.5rem;
  }
  .weapon-desc summary {
    cursor: pointer;
    font-size: 0.78em;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    padding: 0.2rem 0;
    list-style: none;
    user-select: none;
  }
  .weapon-desc summary::-webkit-details-marker {
    display: none;
  }
  .weapon-desc summary::before {
    content: "▸";
    display: inline-block;
    width: 1em;
    color: var(--faction, var(--ncpd));
    margin-right: 0.15rem;
  }
  .weapon-desc[open] summary::before {
    content: "▾";
  }
  .weapon-desc textarea {
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    margin-top: 0.3rem;
  }

</style>
