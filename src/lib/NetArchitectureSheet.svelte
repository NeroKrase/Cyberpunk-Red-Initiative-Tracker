<script lang="ts">
  import type { NetArchitecture } from "./types";
  import { floorHasDv } from "./types";

  type Props = {
    arch: NetArchitecture;
  };

  let { arch }: Props = $props();
</script>

<section class="sheet">
  <header class="sheet-head">
    <span class="head-title">
      <svg
        class="head-tri"
        viewBox="0 0 10 10"
        width="10"
        height="10"
        aria-hidden="true"
      >
        <polygon points="0,0 10,5 0,10" fill="currentColor" />
      </svg>
      <span>{arch.name || "(unnamed)"} NET ARCHITECTURE</span>
    </span>
    {#if arch.demons.length === 0}
      <p class="readout center">Demons Installed: —</p>
    {:else}
      {#each arch.demons as d (d.id)}
        <p class="readout center demon-name">
          Demons Installed: {d.name || "(unnamed demon)"}
        </p>
        <p class="readout center">
          REZ {d.rez} · Interface {d.interfaceLevel} · NET Actions {d.netActions} · Combat Number {d.combatNumber}
        </p>
      {/each}
    {/if}
  </header>

  {#if arch.floors.length === 0}
    <p class="empty">// no floors</p>
  {:else}
    <div class="floor-stack">
      {#each arch.floors as floor, i (floor.id)}
        <div class="floor-row">
          <div class="box-side">
            <span class="label">Floor</span>
            <span class="value">{i + 1}</span>
          </div>
          <div class="box-center">
            <span class="text">
              <span class="type">{floor.type}</span>
              {#if floor.type !== "Password" && floor.description}
                <span class="desc">{floor.description}</span>
              {/if}
            </span>
          </div>
          <div class="box-side">
            <span class="label">DV</span>
            <span class="value"
              >{#if floorHasDv(floor.type)}{floor.dv ?? 0}{:else}—{/if}</span
            >
          </div>
        </div>
        {#if i < arch.floors.length - 1}
          <div class="arrow" aria-hidden="true">
            <svg viewBox="0 0 12 12" width="12" height="12">
              <polygon points="0,0 12,0 6,12" fill="currentColor" />
            </svg>
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</section>

<style>
  .sheet {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    border: 1px solid var(--border-strong);
    background: var(--surface);
  }

  .sheet-head {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    margin-bottom: 0.5rem;
    padding-bottom: 0.6rem;
    border-bottom: 1px solid var(--faction);
  }

  .head-title {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-family: var(--font-ui);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--text);
  }
  .head-tri {
    color: var(--faction);
    flex: 0 0 auto;
  }

  .readout {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.85em;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
  .readout.center {
    text-align: center;
  }
  /* Per-demon name line: brighter than the stat line below it so the
     "which demon is this?" anchor reads first when scanning. */
  .readout.demon-name {
    color: var(--text);
    margin-top: 0.35rem;
  }
  .readout.demon-name:first-of-type {
    margin-top: 0;
  }

  .floor-stack {
    display: flex;
    flex-direction: column;
  }

  .floor-row {
    display: grid;
    grid-template-columns: 88px 1fr 88px;
    gap: 0.6rem;
    align-items: stretch;
  }

  .box-side {
    background: var(--faction);
    color: #000;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 0.4rem 0.2rem;
    border: 1px solid var(--faction);
  }
  .box-side .label {
    font: 600 0.7rem/1 var(--font-ui);
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .box-side .value {
    font: 700 1.6rem/1.1 var(--font-mono);
    font-variant-numeric: tabular-nums;
    margin-top: 0.2rem;
  }

  .box-center {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.6rem 0.9rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    min-width: 0;
    text-align: center;
  }
  /* Stack type and description vertically, both centered. Type is the
     anchor; description (when present) reads on the line below. */
  .box-center .text {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    /* Long unbroken descriptions (rulebook examples include hash-like
       strings) must wrap inside the box, not blow it past its column. */
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .box-center .type {
    display: block;
  }
  .box-center .desc {
    display: block;
    font-weight: 400;
    text-transform: none;
    letter-spacing: normal;
    color: var(--text-muted);
  }

  .arrow {
    display: grid;
    grid-template-columns: 88px 1fr 88px;
    margin: 0.25rem 0;
    color: var(--faction);
  }
  .arrow svg {
    grid-column: 2;
    justify-self: center;
  }

  .empty {
    color: var(--text-faint);
    font-family: var(--font-mono);
    font-size: 0.9em;
    margin: 0;
  }
</style>
