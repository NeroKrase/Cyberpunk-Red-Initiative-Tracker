<script lang="ts">
  // Reusable inline action triplet: [edit] [duplicate] [remove].
  //
  // Mirrors the icon set the NCPD bestiary uses for NPC and weapon
  // templates. Pass only the callbacks you need — buttons render
  // conditionally so you can use this for read-only contexts (no edit),
  // for mid-edit rows (`editing` flips the pencil to a checkmark), or
  // for fixed entries that can be copied but not edited.
  type Props = {
    /** Used for aria-label, e.g. `floor 1`, `demon Imp`. */
    label: string;
    /** Toggle handler. When set, button renders. */
    onEdit?: () => void;
    /** When true, the edit icon flips to a checkmark (done). */
    editing?: boolean;
    onDuplicate?: () => void;
    onRemove?: () => void;
    /** Stack the three buttons vertically instead of horizontally. */
    vertical?: boolean;
  };

  let {
    label,
    onEdit,
    editing = false,
    onDuplicate,
    onRemove,
    vertical = false,
  }: Props = $props();
</script>

<span class="row-actions" class:vertical>
  {#if onEdit}
    <button
      type="button"
      class="del"
      onclick={onEdit}
      aria-label={editing ? `Done editing ${label}` : `Edit ${label}`}
      title={editing ? "Done" : "Edit"}
    >
      {#if editing}
        <svg
          viewBox="0 0 100 100"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="12"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polyline points="18 52 42 78 82 24" />
        </svg>
      {:else}
        <svg
          viewBox="0 0 100 100"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M 14 86 L 14 70 L 64 20 L 80 36 L 30 86 Z" />
          <line x1="56" y1="28" x2="72" y2="44" />
        </svg>
      {/if}
    </button>
  {/if}
  {#if onDuplicate}
    <button
      type="button"
      class="del"
      onclick={onDuplicate}
      aria-label="Duplicate {label}"
      title="Duplicate"
    >
      <svg
        viewBox="0 0 100 100"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        stroke-width="8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="20" y="30" width="50" height="55" />
        <path d="M 30 30 L 30 15 L 80 15 L 80 70 L 70 70" />
      </svg>
    </button>
  {/if}
  {#if onRemove}
    <button
      type="button"
      class="del"
      onclick={onRemove}
      aria-label="Remove {label}"
      title="Remove">×</button
    >
  {/if}
</span>

<style>
  .row-actions {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
  }
  .row-actions.vertical {
    flex-direction: column;
  }
  /* Match the NCPD bestiary's `.del` styling so the buttons feel native
     in any list. Hover paints with the global red accent regardless of
     the surrounding faction theme — destructive cues stay red across
     the app. */
  .del {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    color: var(--text-faint);
    padding: 0.2rem 0.4rem;
    font-size: 1em;
    line-height: 1;
    background: transparent;
    cursor: pointer;
  }
  .del:hover {
    color: var(--accent-bright);
    border-color: var(--accent);
  }
</style>
