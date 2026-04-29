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
        // Templates don't carry ammo — that lives on each NPC weapon.
        // Default to magazine size so NPC weapons added from this template
        // start out fully loaded.
        ammo: natural(magazine, 0),
        damage: natural(damage, 0),
        description: description.trim(),
      });
    }
  }
</script>

<form onsubmit={submit} class="weapon-form">
  <div class="grid">
    <label class="grow">
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
    {#if kind === "range"}
      <label>
        Magazine
        <input type="number" min="0" step="1" bind:value={magazine} />
      </label>
    {/if}
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

  .grid {
    display: grid;
    grid-template-columns: 2fr 1fr 2fr 1.4fr repeat(3, minmax(80px, 1fr));
    gap: 0.5rem;
  }

  /* The closed select takes the bg colour of the currently-selected
     quality. Text colour is always inherited (default), per spec. */
  .quality-select.quality-bg-excellent {
    background-color: #d4a017;
    color: #000;
  }
  .quality-select.quality-bg-poor {
    background-color: var(--accent);
    color: #fff;
  }
  .quality-select.quality-bg-normal {
    background-color: #6b6b75;
    color: #fff;
  }
  /* Each option always renders with its own quality colour, regardless
     of which one is currently selected. */
  .quality-select option.quality-opt-excellent {
    background-color: #d4a017;
    color: #000;
  }
  .quality-select option.quality-opt-poor {
    background-color: var(--accent);
    color: #fff;
  }
  .quality-select option.quality-opt-normal {
    background-color: #6b6b75;
    color: #fff;
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
