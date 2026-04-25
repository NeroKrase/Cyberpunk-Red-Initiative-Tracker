<script lang="ts">
  import { untrack } from "svelte";
  import type { EnemyStatBlock, SkillCategory } from "./types";
  import {
    STAT_KEYS,
    SKILL_CATALOG,
    SKILL_CATEGORIES,
    emptyStatBlock,
    getSkillStat,
    maxHpFromStats,
  } from "./types";

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
    weapons.push({ id: crypto.randomUUID(), name: "", rof: 1, damage: "" });
  }

  function submit(event: Event) {
    event.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      role: role.trim(),
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
      <button type="button" onclick={addWeapon}>+ Weapon</button>
    </div>
    {#each weapons as weapon, i (weapon.id)}
      <div class="row">
        <input bind:value={weapon.name} placeholder="Name" class="grow" />
        <input
          type="number"
          bind:value={weapon.rof}
          placeholder="ROF"
          class="num"
        />
        <input bind:value={weapon.damage} placeholder="Dmg (e.g. 4d6)" />
        <button type="button" onclick={() => weapons.splice(i, 1)}>×</button>
      </div>
    {/each}
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
  }

  .section-head h3 {
    margin: 0;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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
    color: #bbb;
  }

  label input {
    font-size: 1em;
  }

  .stat-name {
    text-align: center;
    font-weight: 600;
    letter-spacing: 0.5px;
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
    color: #bbb;
  }

  .readonly-value {
    padding: 0.4rem 0.6rem;
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 4px;
    color: #ddd;
    font-size: 1em;
  }

  .label-text {
    font-size: 0.85em;
    color: #bbb;
  }

  .add-skill {
    font: inherit;
    padding: 0.3rem 0.5rem;
    background: #2a2a2a;
    color: inherit;
    border: 1px solid #444;
    border-radius: 4px;
  }

  .skill-grid {
    display: grid;
    grid-template-columns: 1fr auto 4.5rem 4.5rem auto auto;
    gap: 0.4rem 0.6rem;
    align-items: center;
  }

  .skill-head {
    font-size: 0.75em;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #888;
  }

  .skill-name {
    font-weight: 500;
  }

  .skill-stat {
    font-size: 0.85em;
    color: #bbb;
    white-space: nowrap;
  }

  .skill-total {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    text-align: right;
    min-width: 1.5rem;
  }
</style>
