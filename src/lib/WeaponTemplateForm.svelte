<script lang="ts">
  import { untrack } from "svelte";
  import type { WeaponTemplate } from "./types";

  type WeaponTemplateInput = Omit<WeaponTemplate, "id">;

  type Props = {
    initial?: WeaponTemplateInput;
    submitLabel: string;
    onSave: (data: WeaponTemplateInput) => void;
    onCancel?: () => void;
  };

  let { initial, submitLabel, onSave, onCancel }: Props = $props();

  const seed = untrack(
    () =>
      initial ?? {
        name: "",
        rof: 1,
        ammo: 0,
        damage: 0,
        description: "",
      },
  );

  let name = $state(seed.name);
  let rof = $state(seed.rof);
  let ammo = $state(seed.ammo);
  let damage = $state(seed.damage);
  let description = $state(seed.description);

  function natural(value: number, min = 0): number {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n)) return min;
    return Math.max(min, n);
  }

  function submit(event: Event) {
    event.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      rof: natural(rof, 1),
      ammo: natural(ammo, 0),
      damage: natural(damage, 0),
      description: description.trim(),
    });
  }
</script>

<form onsubmit={submit} class="weapon-form">
  <div class="grid">
    <label class="grow">
      Name
      <input bind:value={name} required />
    </label>
    <label>
      ROF
      <input type="number" min="1" step="1" bind:value={rof} />
    </label>
    <label>
      Ammo
      <input type="number" min="0" step="1" bind:value={ammo} />
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

  .grid {
    display: grid;
    grid-template-columns: 2fr repeat(3, minmax(80px, 1fr));
    gap: 0.5rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.85em;
    color: var(--text-muted);
  }

  textarea {
    font: inherit;
    padding: 0.5rem 0.6rem;
    background: var(--surface-2);
    color: var(--text);
    border: 1px solid var(--border-strong);
    resize: vertical;
  }

  textarea:focus {
    border-color: var(--ncpd);
    outline: none;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }
</style>
