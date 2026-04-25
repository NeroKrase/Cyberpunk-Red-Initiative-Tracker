<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    backHref: string;
    backLabel: string;
    title: string;
    faction: "red" | "blue";
    children: Snippet;
  };

  let { backHref, backLabel, title, faction, children }: Props = $props();
</script>

<div class="page" data-faction={faction}>
  <p class="back"><a href={backHref}>← {backLabel}</a></p>
  <header class="head">
    <span class="head-prefix">»</span>
    <h1>{title}</h1>
  </header>
  {@render children()}
</div>

<style>
  .page[data-faction="red"] {
    --faction: var(--accent);
    --faction-bright: var(--accent-bright);
  }
  .page[data-faction="blue"] {
    --faction: var(--ncpd);
    --faction-bright: var(--ncpd-bright);
  }

  .back {
    margin: 0 0 1.25rem;
    font-size: 0.85rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .back :global(a) {
    color: var(--text-faint);
  }
  .back :global(a:hover) {
    color: var(--faction);
  }

  .head {
    display: flex;
    align-items: baseline;
    gap: 0.65rem;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid var(--faction);
    padding-bottom: 0.6rem;
  }
  .head h1 {
    margin: 0;
    color: var(--text);
  }
  .head-prefix {
    color: var(--faction);
    font-family: var(--font-mono);
    font-weight: 700;
  }
</style>
