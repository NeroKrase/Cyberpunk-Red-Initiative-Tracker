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
      onSave({
        kind: "range",
        name: name.trim(),
        weaponType: rangeType,
        quality,
        rof: natural(rof, 1),
        magazine: natural(magazine, 0),
        // NPC weapons added from this template start with ammo equal to
        // magazine size (fully loaded). Templates carry the same shape
        // as NPC weapons, so we initialise ammo here.
        ammo: natural(magazine, 0),
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
        <option value="excellent" class="quality-opt-excellent"
          >EQ — Excellent</option
        >
        <option value="poor" class="quality-opt-poor">PQ — Poor</option>
      </select>
    </label>
    <label>
      ROF
      <input type="number" min="1" step="1" bind:value={rof} />
    </label>
    <label class:hidden={kind !== "range"} aria-hidden={kind !== "range"}>
      Magazine
      <input
        type="number"
        min="0"
        step="1"
        bind:value={magazine}
        disabled={kind !== "range"}
      />
    </label>
    <label>
      Damage (d6)
      <input type="number" min="0" step="1" bind:value={damage} />
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

  /* Row 1: Name (full width). Row 2: Kind | Type | Quality | ROF |
     Max Magazine | Damage — all six on one line. The Max Magazine cell
     keeps its slot but visibility:hidden when the weapon is melee, so
     widths never shift across kind switches. */
  .grid {
    display: grid;
    grid-template-columns:
      minmax(5.5rem, 0.7fr) /* Kind */
      minmax(7rem, 1.2fr) /* Type */
      minmax(7.5rem, 1.1fr) /* Quality */
      minmax(4rem, 0.5fr) /* ROF */
      minmax(6rem, 0.8fr) /* Max Magazine */
      minmax(5rem, 0.6fr); /* Damage */
    gap: 0.6rem 0.5rem;
  }
  .span-name {
    grid-column: 1 / -1;
  }
  .hidden {
    visibility: hidden;
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
</style>
