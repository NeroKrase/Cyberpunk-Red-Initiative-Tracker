<script lang="ts">
  import {
    STAT_KEYS,
    isRange,
    maxHpFromStats,
    skillTotal,
    weaponCombatNumber,
    QUALITY_CARD_PREFIX,
    type Enemy,
  } from "$lib/types";
  import { updateWeaponAmmo } from "$lib/store.svelte";

  let {
    combatant,
    sessionId,
    encounterId,
  }: {
    combatant: Enemy;
    sessionId: string;
    encounterId: string;
  } = $props();

  const maxHp = $derived(maxHpFromStats(combatant.stats));
  const seriousThreshold = $derived(Math.ceil(maxHp / 2));
  const deathSave = $derived(combatant.stats.body);

  const trainedSkills = $derived(
    combatant.skills.filter((s) => s.level + s.mod !== 0),
  );

  async function onAmmoChange(weaponId: string, value: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    await updateWeaponAmmo(sessionId, encounterId, combatant.id, weaponId, parsed);
  }
</script>

<div class="details">
  <div class="meta">
    {#if combatant.role}
      <div class="meta-item">
        <span class="flag">Role</span>
        <span class="value">{combatant.role}</span>
      </div>
    {/if}
    <div class="meta-item">
      <span class="flag">Rep</span>
      <span class="value mono">{combatant.reputation}</span>
    </div>
    <div class="meta-item">
      <span class="flag">Death Save</span>
      <span class="value mono">{deathSave}</span>
    </div>
    <div class="meta-item">
      <span class="flag">Seriously Wounded</span>
      <span class="value mono">{seriousThreshold}</span>
    </div>
  </div>

  <section class="block">
    <header class="flag">Stats</header>
    <ul class="stats">
      {#each STAT_KEYS as key (key)}
        <li>
          <span class="stat-label">{key.toUpperCase()}</span>
          <span class="mono">{combatant.stats[key]}</span>
        </li>
      {/each}
    </ul>
  </section>

  {#if combatant.weapons.length > 0}
    <section class="block">
      <header class="flag">Weapons</header>
      <ul class="weapons">
        {#each combatant.weapons as w (w.id)}
          {@const c = weaponCombatNumber(combatant, w.weaponType, w.quality)}
          {@const prefix = QUALITY_CARD_PREFIX[w.quality]}
          <li>
            <span class="weapon-name">
              {#if prefix}<span class="quality">{prefix}</span>{/if}
              {w.name || "(unnamed)"}
            </span>
            {#if c != null}
              <span class="cell strong">
                <span class="cell-label">C#</span>
                <span class="mono cell-value">{c}</span>
              </span>
            {/if}
            <span class="cell">
              <span class="cell-label">ROF</span>
              <span class="mono cell-value">{w.rof}</span>
            </span>
            {#if isRange(w)}
              <span class="cell">
                <span class="cell-label">Mag</span>
                <span class="mono cell-value">{w.magazine}</span>
              </span>
              <span class="cell">
                <span class="cell-label">Ammo</span>
                <input
                  type="number"
                  class="cell-input num mono"
                  min="0"
                  value={w.ammo}
                  onchange={(e) => onAmmoChange(w.id, e.currentTarget.value)}
                  aria-label="Ammo for {w.name || 'weapon'}"
                />
              </span>
            {/if}
            <span class="cell">
              <span class="mono cell-value">{w.damage}D6</span>
            </span>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if combatant.armor.head.name || combatant.armor.body.name}
    <section class="block">
      <header class="flag">Armor</header>
      <ul class="armor">
        {#if combatant.armor.head.name}
          <li>
            <span class="armor-loc">Head</span>
            <span class="armor-name">{combatant.armor.head.name}</span>
            <span class="cell">
              <span class="cell-label">SP</span>
              <span class="mono cell-value">{combatant.armor.head.sp}</span>
            </span>
          </li>
        {/if}
        {#if combatant.armor.body.name}
          <li>
            <span class="armor-loc">Body</span>
            <span class="armor-name">{combatant.armor.body.name}</span>
            <span class="cell">
              <span class="cell-label">SP</span>
              <span class="mono cell-value">{combatant.armor.body.sp}</span>
            </span>
          </li>
        {/if}
      </ul>
    </section>
  {/if}

  {#if trainedSkills.length > 0}
    <section class="block">
      <header class="flag">Skill Bases</header>
      <p class="skills">
        {#each trainedSkills as s, i (s.id)}
          {#if i > 0}<span class="sep">•</span>{/if}<span class="skill"
            >{s.name}&nbsp;<span class="mono">{skillTotal(combatant.stats, s)}</span></span
          >
        {/each}
      </p>
    </section>
  {/if}

  {#if combatant.gear.length > 0}
    <section class="block">
      <header class="flag">Gear</header>
      <p class="line">{combatant.gear.join(", ")}</p>
    </section>
  {/if}

  {#if combatant.cyberware.length > 0}
    <section class="block">
      <header class="flag">Cyberware</header>
      <p class="line">{combatant.cyberware.join(", ")}</p>
    </section>
  {/if}
</div>

<style>
  .details {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    padding: 0.9rem 1rem 1rem;
    margin-top: 0.5rem;
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-left: 3px solid var(--accent);
  }

  .flag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 1.6rem;
    padding: 0 0.65rem;
    background: var(--accent);
    color: #fff;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    line-height: 1;
    text-align: center;
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem 1rem;
    align-items: center;
  }

  .meta-item {
    display: inline-flex;
    align-items: stretch;
    border: 1px solid var(--border-strong);
  }

  .meta-item .value {
    display: inline-flex;
    align-items: center;
    padding: 0 0.7rem;
    background: var(--surface-2);
    color: var(--text);
    font-weight: 600;
    min-height: 1.6rem;
  }

  .block {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .block > header.flag {
    align-self: flex-start;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(5rem, 1fr));
    gap: 0.4rem;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .stats li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem;
    padding: 0.3rem 0.55rem;
    border: 1px solid var(--border-strong);
    background: var(--surface-2);
    border-bottom: none;
  }

  .stat-label {
    color: var(--text-muted);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.1em;
  }

  .weapons,
  .armor {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .weapons li,
  .armor li {
    display: flex;
    align-items: stretch;
    gap: 0.4rem;
    padding: 0.35rem 0.6rem;
    border: 1px solid var(--border-strong);
    border-left: 2px solid var(--accent);
    background: var(--surface-2);
    flex-wrap: wrap;
  }

  .weapon-name {
    flex: 1;
    min-width: 8rem;
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    flex-wrap: wrap;
  }

  .quality {
    color: var(--accent-bright);
    font-weight: 700;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
  }

  /* Inline data cell — small label + value, separated visually like a stencil readout. */
  .cell {
    display: inline-flex;
    align-items: stretch;
    border: 1px solid var(--border-strong);
    background: var(--surface);
  }

  .cell-label {
    display: inline-flex;
    align-items: center;
    padding: 0 0.45rem;
    background: var(--accent);
    color: #fff;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    line-height: 1;
  }

  .cell-value {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 0.55rem;
    min-width: 2.2rem;
    color: var(--text);
    font-weight: 600;
    font-size: 0.9rem;
  }

  .cell.strong .cell-label {
    background: var(--accent-bright);
  }

  .cell.strong .cell-value {
    font-size: 1rem;
    font-weight: 700;
  }

  .cell-input {
    width: 3.2rem;
    padding: 0 0.45rem;
    background: var(--surface);
    color: var(--text);
    border: none;
    text-align: center;
    font-weight: 600;
  }


  .cell-input:focus {
    outline: 1px solid var(--accent);
    outline-offset: -1px;
  }

  .armor-loc {
    display: inline-flex;
    align-items: center;
    color: var(--accent-bright);
    font-weight: 700;
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    width: 3rem;
  }

  .armor-name {
    flex: 1;
    display: inline-flex;
    align-items: center;
  }

  .skills {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    line-height: 1.7;
    color: var(--text);
  }

  .skill {
    white-space: nowrap;
  }

  .sep {
    color: var(--accent);
    margin: 0 0.45rem;
  }

  .line {
    margin: 0;
    color: var(--text);
  }

  .mono {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
  }
</style>
