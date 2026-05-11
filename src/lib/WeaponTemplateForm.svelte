<script lang="ts">
  import { untrack } from "svelte";
  import type {
    MeleeWeaponType,
    RangeWeaponType,
    WeaponKind,
    WeaponQuality,
    WeaponTemplate,
  } from "./types";
  import {
    MELEE_WEAPON_TYPES,
    RANGE_WEAPON_TYPES,
  } from "./types";

  // Distribute Omit across the discriminated union so kind narrowing
  // survives. A plain Omit<WeaponTemplate, "id"> collapses the union.
  type DistOmit<T, K extends keyof any> = T extends unknown
    ? Omit<T, K>
    : never;
  type WeaponTemplateInput = DistOmit<WeaponTemplate, "id">;

  type Props = {
    initial?: WeaponTemplateInput;
    submitLabel: string;
    onSave: (data: WeaponTemplateInput) => void;
    onCancel?: () => void;
  };

  let { initial, submitLabel, onSave, onCancel }: Props = $props();

  const seed = untrack(() => initial);
  // Narrow once so subsequent property access keeps its kind-specific type.
  const seedMelee = seed?.kind === "melee" ? seed : undefined;
  const seedRange = seed?.kind === "range" ? seed : undefined;

  let kind = $state<WeaponKind>(seed?.kind ?? "range");
  let name = $state(seed?.name ?? "");
  // We track melee/range types in separate slots so switching kinds
  // doesn't lose the previously-typed value.
  let meleeType = $state<MeleeWeaponType | "">(seedMelee?.weaponType ?? "");
  let rangeType = $state<RangeWeaponType | "">(seedRange?.weaponType ?? "");
  let quality = $state<WeaponQuality>(seed?.quality ?? "");
  let rof = $state(seed?.rof ?? 1);
  let magazine = $state<number>(seedRange?.magazine ?? 0);
  let damage = $state(seed?.damage ?? 0);
  let description = $state(seed?.description ?? "");

  function natural(value: number, min = 0): number {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n)) return min;
    return Math.max(min, n);
  }

  function submit(event: Event) {
    event.preventDefault();
    if (!name.trim()) return;
    if (kind === "melee") {
      onSave({
        kind: "melee",
        name: name.trim(),
        weaponType: meleeType,
        quality,
        rof: natural(rof, 1),
        damage: natural(damage, 0),
        description: description.trim(),
      });
    } else {
      const mag = natural(magazine, 0);
      onSave({
        kind: "range",
        name: name.trim(),
        weaponType: rangeType,
        quality,
        rof: natural(rof, 1),
        magazine: mag,
        // Blueprint defaults: a freshly-spawned NPC weapon starts with
        // a full mag and one mag's worth of spare rounds in inventory.
        loaded: mag,
        ammo: mag,
        damage: natural(damage, 0),
        description: description.trim(),
      });
    }
  }
</script>

<form onsubmit={submit} class="weapon-form">
  <div class="grid">
    <label class="span-name">
      Name
      <input bind:value={name} required />
    </label>
    <label>
      Kind
      <select bind:value={kind}>
        <option value="melee">Melee</option>
        <option value="range">Range</option>
      </select>
    </label>
    <label>
      Type
      {#if kind === "melee"}
        <select bind:value={meleeType}>
          <option value="">— Untyped —</option>
          {#each MELEE_WEAPON_TYPES as wt (wt)}
            <option value={wt}>{wt}</option>
          {/each}
        </select>
      {:else}
        <select bind:value={rangeType}>
          <option value="">— Untyped —</option>
          {#each RANGE_WEAPON_TYPES as wt (wt)}
            <option value={wt}>{wt}</option>
          {/each}
        </select>
      {/if}
    </label>
    <label>
      Quality
      <select
        class="quality-select quality-bg-{quality || 'normal'}"
        bind:value={quality}
      >
        <option value="" class="quality-opt-normal">Normal</option>
        <option value="excellent" class="quality-opt-excellent">Excellent</option>
        <option value="poor" class="quality-opt-poor">Poor</option>
      </select>
    </label>
    <label>
      ROF
      <input type="number" min="1" step="1" bind:value={rof} />
    </label>
    <label>
      Magazine
      {#if kind === "range"}
        <input type="number" min="0" step="1" bind:value={magazine} />
      {:else}
        <span class="na-cell" aria-label="Not applicable for melee">—</span>
      {/if}
    </label>
    <label>
      Damage
      <span class="dmg-block">
        <input
          type="number"
          min="0"
          step="1"
          bind:value={damage}
          class="dmg-input"
        />
        <span class="dmg-suffix">d6</span>
      </span>
    </label>
  </div>

  <label class="desc">
    Description
    <textarea bind:value={description} rows="5"></textarea>
  </label>

  <div class="actions">
    <button type="submit">{submitLabel}</button>
    {#if onCancel}
      <button type="button" onclick={onCancel}>Cancel</button>
    {/if}
  </div>
</form>

<style>
  .weapon-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin: 0;
  }

  /* Single row: Name | Kind | Type | Quality | ROF | Magazine | Damage.
     Melee weapons swap the Magazine input for a stencil "—" so the
     column stays put across kind switches. */
  .grid {
    display: grid;
    grid-template-columns:
      minmax(12rem, 2.2fr) /* Name (wider) */
      minmax(5rem, 0.5fr) /* Kind */
      minmax(6.5rem, 0.85fr) /* Type — fits "Rocket Launcher" */
      minmax(5rem, 0.55fr) /* Quality — fits "Excellent" */
      minmax(3.5rem, 0.35fr) /* ROF */
      minmax(4.5rem, 0.5fr) /* Magazine */
      minmax(4rem, 0.4fr); /* Damage */
    gap: 0.6rem 0.5rem;
  }

  @media (max-width: 760px) {
    .grid {
      grid-template-columns: repeat(3, 1fr);
    }
    .span-name {
      grid-column: 1 / -1;
    }
  }
  @media (max-width: 480px) {
    .grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .na-cell {
    padding: 0.45rem 0.7rem;
    background: var(--surface-2);
    border: 1px solid var(--border-strong);
    color: var(--text-faint);
    font-family: var(--font-mono);
    text-align: center;
    box-sizing: border-box;
  }

  /* The closed select takes the bg colour of the currently-selected
     quality. Tokens only — no raw hex. */
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

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.85em;
    color: var(--text-muted);
  }

  textarea {
    resize: vertical;
  }

  .weapon-form input:focus,
  .weapon-form select:focus,
  .weapon-form textarea:focus {
    border-color: var(--faction, var(--ncpd));
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  /* Damage cell: bordered block (matching a regular input) wraps the
     editable digits and the static "d6" suffix together. Inner
     <input> is borderless/transparent and hides its spinners so the
     value hugs "d6" with no gap. */
  .dmg-block {
    display: inline-flex;
    align-items: baseline;
    gap: 0.15rem;
    padding: 0.45rem 0.7rem;
    background: var(--surface-2);
    border: 1px solid var(--border-strong);
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    line-height: normal;
    box-sizing: border-box;
  }
  .dmg-block:focus-within {
    border-color: var(--faction, var(--ncpd));
  }
  .dmg-block .dmg-input {
    flex: 0 0 auto;
    text-align: left;
    /* Shrink to content so "d6" hugs the digits with no dead space. */
    field-sizing: content;
    min-width: 1ch;
    max-width: 4ch;
    background: transparent;
    border: none;
    padding: 0;
    color: var(--text);
    font-family: inherit;
    font-size: inherit;
    appearance: textfield;
    -moz-appearance: textfield;
  }
  .dmg-block .dmg-input:focus {
    outline: none;
  }
  .dmg-block .dmg-input::-webkit-outer-spin-button,
  .dmg-block .dmg-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .dmg-suffix {
    color: var(--text-muted);
    flex: 0 0 auto;
  }
</style>
