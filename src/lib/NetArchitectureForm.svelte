<script lang="ts">
  import { untrack } from "svelte";
  import type { NetArchitecture, NetDemon, NetFloor } from "./types";
  import {
    emptyNetDemon,
    emptyNetFloor,
    floorHasDv,
    floorNeedsDescription,
  } from "./types";
  import NetFloorRow from "./NetFloorRow.svelte";

  type Input = Omit<NetArchitecture, "id">;

  type Props = {
    initial?: Input;
    submitLabel: string;
    onSave: (data: Input) => void;
    onCancel?: () => void;
    // Fires on every state change so a parent can render a live preview
    // alongside the form. Receives a deep clone so the parent can't
    // accidentally mutate the form's working state.
    onChange?: (data: Input) => void;
  };

  let { initial, submitLabel, onSave, onCancel, onChange }: Props = $props();

  const seed = untrack(() => initial);

  let name = $state(seed?.name ?? "");
  let demons = $state<NetDemon[]>(
    seed?.demons.map((d) => ({ ...d })) ?? [],
  );
  let floors = $state<NetFloor[]>(
    seed?.floors.map((f) => ({ ...f })) ?? [],
  );

  function natural(value: number, min = 0): number {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n)) return min;
    return Math.max(min, n);
  }

  // Reading every field inside the effect registers it as a dependency,
  // so any edit (name input, demon add/remove/mutate, floor mutation) re-
  // fires onChange with the current snapshot.
  $effect(() => {
    if (!onChange) return;
    onChange({
      name,
      demons: demons.map((d) => ({
        id: d.id,
        name: d.name,
        rez: d.rez,
        interfaceLevel: d.interfaceLevel,
        netActions: d.netActions,
        combatNumber: d.combatNumber,
      })),
      floors: floors.map((f) => ({
        id: f.id,
        type: f.type,
        description: f.description,
        dv: f.dv,
      })),
    });
  });

  function addDemon() {
    demons.push(emptyNetDemon());
  }

  function removeDemon(index: number) {
    demons.splice(index, 1);
  }

  function addFloor() {
    floors.push(emptyNetFloor());
  }

  function removeFloor(index: number) {
    floors.splice(index, 1);
  }

  function submit(event: Event) {
    event.preventDefault();
    if (!name.trim()) return;
    const cleanFloors: NetFloor[] = floors.map((f) => ({
      id: f.id,
      type: f.type,
      // Description is meaningless for Password floors — drop it on save
      // so the persisted shape matches the renderer's contract.
      description: floorNeedsDescription(f.type) ? f.description.trim() : "",
      dv: floorHasDv(f.type) ? natural(f.dv ?? 0, 0) : null,
    }));
    const cleanDemons: NetDemon[] = demons.map((d) => ({
      id: d.id,
      name: d.name.trim(),
      rez: natural(d.rez, 0),
      interfaceLevel: natural(d.interfaceLevel, 0),
      netActions: natural(d.netActions, 0),
      combatNumber: natural(d.combatNumber, 0),
    }));
    onSave({
      name: name.trim(),
      demons: cleanDemons,
      floors: cleanFloors,
    });
  }
</script>

<form onsubmit={submit} class="arch-form">
  <label class="full">
    Architecture name
    <input bind:value={name} required />
  </label>

  <section class="demons-block">
    <header class="section-head">
      <h3>Demons</h3>
      <button type="button" class="toggle" onclick={addDemon}>
        + Install demon
      </button>
    </header>
    {#if demons.length === 0}
      <p class="empty">// no demons installed</p>
    {:else}
      <div class="demons-list">
        {#each demons as d, i (d.id)}
          <div class="demon-card">
            <div class="demon-card-head">
              <span class="demon-num">D{i + 1}</span>
              <button
                type="button"
                class="del"
                onclick={() => removeDemon(i)}
                aria-label="Remove demon {i + 1}">×</button
              >
            </div>
            <div class="demon-grid">
              <label class="full">
                Demon name
                <input bind:value={d.name} />
              </label>
              <label>
                REZ
                <input type="number" min="0" step="1" bind:value={d.rez} />
              </label>
              <label>
                Interface
                <input
                  type="number"
                  min="0"
                  step="1"
                  bind:value={d.interfaceLevel}
                />
              </label>
              <label>
                NET Actions
                <input
                  type="number"
                  min="0"
                  step="1"
                  bind:value={d.netActions}
                />
              </label>
              <label>
                Combat Number
                <input
                  type="number"
                  min="0"
                  step="1"
                  bind:value={d.combatNumber}
                />
              </label>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <section class="floors-block">
    <header class="section-head">
      <h3>Floors</h3>
    </header>
    {#if floors.length === 0}
      <p class="empty">// no floors yet</p>
    {:else}
      <div class="floors">
        {#each floors as floor, i (floor.id)}
          <NetFloorRow
            {floor}
            index={i}
            onRemove={() => removeFloor(i)}
          />
        {/each}
      </div>
    {/if}
    <button type="button" class="add-floor" onclick={addFloor}>
      + Add floor
    </button>
  </section>

  <div class="actions">
    <button type="submit">{submitLabel}</button>
    {#if onCancel}
      <button type="button" onclick={onCancel}>Cancel</button>
    {/if}
  </div>
</form>

<style>
  .arch-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin: 0;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.85em;
    color: var(--text-muted);
  }
  label.full {
    grid-column: 1 / -1;
  }

  .arch-form input:focus {
    border-color: var(--faction, var(--accent));
  }

  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    margin-bottom: 0.6rem;
    border-bottom: 1px solid var(--border-strong);
    padding-bottom: 0.4rem;
  }
  .section-head h3 {
    margin: 0;
    color: var(--faction, var(--text-muted));
  }

  .toggle {
    border: 1px solid var(--border-strong);
    color: var(--text-muted);
  }
  .toggle:hover {
    border-color: var(--faction);
    color: var(--faction-bright);
  }

  .demons-list {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .demon-card {
    border: 1px solid var(--border);
    padding: 0.5rem 0.6rem 0.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .demon-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .demon-num {
    font-family: var(--font-mono);
    font-weight: 700;
    color: var(--faction);
    letter-spacing: 0.04em;
  }

  .demon-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem 0.8rem;
  }

  .floors {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .add-floor {
    align-self: flex-start;
    border: 1px solid var(--faction);
    color: var(--faction);
  }
  .add-floor:hover {
    background: var(--faction);
    color: #000;
  }

  .del {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    color: var(--text-faint);
    padding: 0.2rem 0.4rem;
    font-size: 1em;
    line-height: 1;
  }
  .del:hover {
    color: var(--accent-bright);
    border-color: var(--accent);
  }

  .empty {
    color: var(--text-faint);
    font-family: var(--font-mono);
    font-size: 0.9em;
    padding: 0.5rem 0;
    margin: 0 0 0.75rem;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }
</style>
