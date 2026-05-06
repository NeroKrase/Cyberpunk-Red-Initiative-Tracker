<script lang="ts">
  import type { NetFloor, NetFloorType } from "./types";
  import {
    NET_FLOOR_TYPES,
    floorHasDv,
    floorNeedsDescription,
  } from "./types";

  type Props = {
    floor: NetFloor;
    index: number;
    onRemove: () => void;
  };

  let { floor, index, onRemove }: Props = $props();

  // Sync description / dv to the rules whenever type changes. Password
  // floors carry no description; Black ICE has no DV. Clearing on switch
  // keeps the persisted shape clean and prevents surprising values from
  // re-appearing if the user toggles types around.
  function onTypeChange(next: NetFloorType) {
    floor.type = next;
    if (!floorNeedsDescription(next)) floor.description = "";
    if (!floorHasDv(next)) floor.dv = null;
    if (floorHasDv(next) && floor.dv === null) floor.dv = 10;
  }
</script>

<div class="row">
  <div class="num">F{index + 1}</div>

  <label class="type">
    <span class="lbl">Type</span>
    <select
      value={floor.type}
      onchange={(e) =>
        onTypeChange((e.currentTarget as HTMLSelectElement).value as NetFloorType)}
    >
      {#each NET_FLOOR_TYPES as t (t)}
        <option value={t}>{t}</option>
      {/each}
    </select>
  </label>

  <label class="desc" class:hidden={!floorNeedsDescription(floor.type)}>
    <span class="lbl">Description</span>
    <input
      bind:value={floor.description}
      disabled={!floorNeedsDescription(floor.type)}
    />
  </label>

  <label class="dv">
    <span class="lbl">DV</span>
    {#if floorHasDv(floor.type)}
      <input
        type="number"
        min="0"
        step="1"
        value={floor.dv ?? 0}
        oninput={(e) => {
          const v = Number((e.currentTarget as HTMLInputElement).value);
          floor.dv = Number.isFinite(v) ? v : 0;
        }}
      />
    {:else}
      <span class="dv-dash" aria-label="no DV">—</span>
    {/if}
  </label>

  <button
    type="button"
    class="del"
    onclick={onRemove}
    aria-label="Remove floor {index + 1}">×</button
  >
</div>

<style>
  .row {
    display: grid;
    grid-template-columns: 2.5rem minmax(8rem, 1fr) minmax(10rem, 2fr) 6rem auto;
    gap: 0.5rem;
    align-items: end;
    padding: 0.4rem;
    border: 1px solid var(--border);
  }

  .num {
    font-family: var(--font-mono);
    font-weight: 700;
    color: var(--faction);
    text-align: center;
    align-self: center;
    letter-spacing: 0.04em;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.85em;
    color: var(--text-muted);
    margin: 0;
  }
  .lbl {
    font-size: 0.75em;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  /* Keep the description input in the DOM (preserves typed text across
     type toggles in non-Password directions) but hide it when the rules
     say it's meaningless — Password floors render no description. */
  .desc.hidden {
    visibility: hidden;
  }

  .dv-dash {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 2.1rem;
    font-family: var(--font-mono);
    color: var(--text-faint);
    font-size: 1.2rem;
  }

  .del {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    color: var(--text-faint);
    padding: 0.2rem 0.5rem;
    font-size: 1em;
    line-height: 1;
    align-self: center;
  }
  .del:hover {
    color: var(--accent-bright);
    border-color: var(--accent);
  }

  @media (max-width: 640px) {
    .row {
      grid-template-columns: 2.5rem 1fr 1fr auto;
    }
    .desc {
      grid-column: 1 / -1;
    }
  }
</style>
