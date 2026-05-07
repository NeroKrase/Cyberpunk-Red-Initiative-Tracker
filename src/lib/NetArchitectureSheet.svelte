<script lang="ts">
  import type {
    NetArchitecture,
    NetDemon,
    NetFloor,
    NetFloorType,
  } from "./types";
  import {
    NET_FLOOR_TYPES,
    emptyNetDemon,
    emptyNetFloor,
    floorHasDv,
    floorNeedsDescription,
  } from "./types";
  import RowActions from "./RowActions.svelte";

  type Props = {
    arch: NetArchitecture;
    /**
     * Fires after every mutation (add / remove / duplicate / edit-done /
     * input blur). The parent persists in-memory state to storage. When
     * omitted, the sheet renders as read-only — no add buttons, no
     * action icons.
     */
    onChange?: () => void;
  };

  let { arch, onChange }: Props = $props();

  const editable = $derived(typeof onChange === "function");

  // Only one row can be in edit mode at a time per section. Storing the
  // id (not an index) keeps the toggle stable across reorders / removes.
  let editingName = $state(false);
  let editingDemonId = $state<string | null>(null);
  let editingFloorId = $state<string | null>(null);

  // Guard set when the document mousedown handler just exited an edit
  // (because the click landed outside that section's tight wrapper).
  // The matching action button's `click` handler runs immediately after
  // — without the guard it would re-toggle and re-open the editor.
  // queueMicrotask clears it after the current user gesture finishes.
  let mousedownExitedNameFlag = false;
  let mousedownExitedDemonId: string | null = null;
  let mousedownExitedFloorId: string | null = null;

  function commit() {
    onChange?.();
  }

  function toggleEditName() {
    if (mousedownExitedNameFlag) {
      mousedownExitedNameFlag = false;
      return;
    }
    editingName = !editingName;
    if (!editingName) commit();
  }

  function addDemon() {
    const d = emptyNetDemon();
    arch.demons.push(d);
    editingDemonId = d.id;
    commit();
  }
  function duplicateDemon(d: NetDemon) {
    const idx = arch.demons.indexOf(d);
    const clone: NetDemon = { ...d, id: crypto.randomUUID() };
    arch.demons.splice(idx + 1, 0, clone);
    commit();
  }
  function removeDemon(d: NetDemon) {
    const idx = arch.demons.indexOf(d);
    if (idx === -1) return;
    arch.demons.splice(idx, 1);
    if (editingDemonId === d.id) editingDemonId = null;
    commit();
  }
  function toggleEditDemon(d: NetDemon) {
    if (mousedownExitedDemonId === d.id) {
      mousedownExitedDemonId = null;
      return;
    }
    if (editingDemonId === d.id) {
      editingDemonId = null;
      commit();
    } else {
      editingDemonId = d.id;
    }
  }

  function addFloor() {
    const f = emptyNetFloor();
    arch.floors.push(f);
    editingFloorId = f.id;
    commit();
  }
  function duplicateFloor(f: NetFloor) {
    const idx = arch.floors.indexOf(f);
    const clone: NetFloor = { ...f, id: crypto.randomUUID() };
    arch.floors.splice(idx + 1, 0, clone);
    commit();
  }
  function removeFloor(f: NetFloor) {
    const idx = arch.floors.indexOf(f);
    if (idx === -1) return;
    arch.floors.splice(idx, 1);
    if (editingFloorId === f.id) editingFloorId = null;
    commit();
  }
  function toggleEditFloor(f: NetFloor) {
    if (mousedownExitedFloorId === f.id) {
      mousedownExitedFloorId = null;
      return;
    }
    if (editingFloorId === f.id) {
      editingFloorId = null;
      commit();
    } else {
      editingFloorId = f.id;
    }
  }
  function onTypeChange(f: NetFloor, next: NetFloorType) {
    f.type = next;
    // Password rows render no description — clear stale text on switch.
    if (!floorNeedsDescription(next)) f.description = "";
    // Black ICE has no DV — null it out, and seed a sensible default
    // when switching back to a typed-DV row.
    if (!floorHasDv(next)) f.dv = null;
    if (floorHasDv(next) && f.dv === null) f.dv = 10;
    commit();
  }

  // ---- Commit-on-exit helpers ----------------------------------------
  // Each editable section (name / demon block / floor row) is wrapped in
  // a container that listens for focusout + Enter. Tabbing between
  // sibling inputs inside the same wrapper keeps editing alive; moving
  // focus *out* of the wrapper, or pressing Enter, persists changes and
  // closes the editor. The contains-relatedTarget check is the standard
  // pattern for "did focus actually leave this widget".

  function focusStillInside(e: FocusEvent): boolean {
    const next = e.relatedTarget;
    const wrap = e.currentTarget as HTMLElement | null;
    if (!wrap) return false;
    return next instanceof Node && wrap.contains(next);
  }

  function handleNameFocusOut(e: FocusEvent) {
    if (!editingName) return;
    if (focusStillInside(e)) return;
    editingName = false;
    commit();
  }
  function handleNameKeydown(e: KeyboardEvent) {
    if (!editingName || e.key !== "Enter") return;
    e.preventDefault();
    editingName = false;
    commit();
  }

  function handleDemonFocusOut(e: FocusEvent, d: NetDemon) {
    if (editingDemonId !== d.id) return;
    if (focusStillInside(e)) return;
    editingDemonId = null;
    commit();
  }
  function handleDemonKeydown(e: KeyboardEvent, d: NetDemon) {
    if (editingDemonId !== d.id || e.key !== "Enter") return;
    e.preventDefault();
    editingDemonId = null;
    commit();
  }

  function handleFloorFocusOut(e: FocusEvent, f: NetFloor) {
    if (editingFloorId !== f.id) return;
    if (focusStillInside(e)) return;
    editingFloorId = null;
    commit();
  }
  function handleFloorKeydown(e: KeyboardEvent, f: NetFloor) {
    if (editingFloorId !== f.id || e.key !== "Enter") return;
    // Don't suppress Enter inside the type select — a keyboard user
    // expects Enter to confirm the highlighted option there. Browsers
    // dispatch the change event before the keydown bubbles, so we can
    // safely commit on Enter from any element including selects.
    e.preventDefault();
    editingFloorId = null;
    commit();
  }

  // ---- Click-outside-to-commit ---------------------------------------
  // Each editable wrapper carries a `data-edit-wrapper` key. While any
  // edit is active, a document-level mousedown listener checks whether
  // the click landed inside the *active* wrapper. If not, that edit is
  // closed and persisted. Covers cases focusout misses — e.g. clicks on
  // non-focusable areas (page background, sheet padding, the back-link
  // text) where browsers don't always shift focus.
  $effect(() => {
    if (
      !editingName &&
      editingDemonId === null &&
      editingFloorId === null
    ) {
      return;
    }

    function handler(e: MouseEvent) {
      const target = e.target;
      const wrapper =
        target instanceof Element
          ? target.closest("[data-edit-wrapper]")
          : null;
      const key =
        wrapper instanceof HTMLElement ? wrapper.dataset.editWrapper : null;

      let cleared = false;
      if (editingName && key !== "name") {
        mousedownExitedNameFlag = true;
        editingName = false;
        commit();
        cleared = true;
      }
      if (
        editingDemonId !== null &&
        key !== `demon-${editingDemonId}`
      ) {
        mousedownExitedDemonId = editingDemonId;
        editingDemonId = null;
        commit();
        cleared = true;
      }
      if (
        editingFloorId !== null &&
        key !== `floor-${editingFloorId}`
      ) {
        mousedownExitedFloorId = editingFloorId;
        editingFloorId = null;
        commit();
        cleared = true;
      }
      if (cleared) {
        // Microtasks flush after the current task — i.e. after the
        // matching `click` event has fired and the toggle button's
        // handler has read the guard. Then we reset for the next
        // gesture.
        queueMicrotask(() => {
          mousedownExitedNameFlag = false;
          mousedownExitedDemonId = null;
          mousedownExitedFloorId = null;
        });
      }
    }

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  });
</script>

<section class="sheet">
  <header class="sheet-head">
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="head-title"
      role="group"
      aria-label="Architecture title"
      onfocusout={handleNameFocusOut}
      onkeydown={handleNameKeydown}
    >
      <svg
        class="head-tri"
        viewBox="0 0 10 10"
        width="10"
        height="10"
        aria-hidden="true"
      >
        <polygon points="0,0 10,5 0,10" fill="currentColor" />
      </svg>
      <!-- Click-outside scope is the name field only — clicking the
           "NET ARCHITECTURE" suffix or the pencil counts as outside. -->
      <span class="head-name-wrap" data-edit-wrapper="name">
        {#if editable && editingName}
          <input
            class="name-input"
            bind:value={arch.name}
            placeholder="(unnamed)"
            aria-label="Architecture name"
          />
        {:else}
          <span class="head-name">{arch.name || "(unnamed)"}</span>
        {/if}
      </span>
      <span class="head-suffix">NET ARCHITECTURE</span>
      {#if editable}
        <RowActions
          label="architecture name"
          editing={editingName}
          onEdit={toggleEditName}
        />
      {/if}
    </div>

    <div class="demons-section">
      {#if arch.demons.length === 0}
        <p class="readout center">Demons Installed: None</p>
      {/if}
      {#each arch.demons as d (d.id)}
        {@const isEditing = editable && editingDemonId === d.id}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
          class="demon-block"
          role="group"
          aria-label={d.name ? `Demon ${d.name}` : "Demon"}
          onfocusout={(e) => handleDemonFocusOut(e, d)}
          onkeydown={(e) => handleDemonKeydown(e, d)}
        >
          <!-- Click-outside scope: the fields/readouts only. The action
               triplet is a sibling so clicking it counts as outside. -->
          <div
            class="demon-content"
            class:editing={isEditing}
            data-edit-wrapper={`demon-${d.id}`}
          >
            {#if isEditing}
              <div class="demon-edit-grid">
                <label class="full">
                  Demon name
                  <input
                    bind:value={d.name}
                    placeholder="(unnamed demon)"
                  />
                </label>
                <label
                  >REZ <input
                    type="number"
                    min="0"
                    step="1"
                    bind:value={d.rez}
                  /></label
                >
                <label
                  >Interface <input
                    type="number"
                    min="0"
                    step="1"
                    bind:value={d.interfaceLevel}
                  /></label
                >
                <label
                  >NET Actions <input
                    type="number"
                    min="0"
                    step="1"
                    bind:value={d.netActions}
                  /></label
                >
                <label
                  >Combat Number <input
                    type="number"
                    min="0"
                    step="1"
                    bind:value={d.combatNumber}
                  /></label
                >
              </div>
            {:else}
              <p class="readout center demon-name">
                Demons Installed: {d.name || "(unnamed demon)"}
              </p>
              <p class="readout center">
                REZ {d.rez} · Interface {d.interfaceLevel} · NET Actions {d.netActions}
                · Combat Number {d.combatNumber}
              </p>
            {/if}
          </div>
          {#if editable}
            <div class="demon-actions">
              <RowActions
                label={d.name ? `demon ${d.name}` : "demon"}
                editing={isEditing}
                onEdit={() => toggleEditDemon(d)}
                onDuplicate={() => duplicateDemon(d)}
                onRemove={() => removeDemon(d)}
                vertical
              />
            </div>
          {/if}
        </div>
      {/each}
      {#if editable}
        <div class="add-row">
          <button
            type="button"
            class="add-btn"
            onclick={addDemon}
            aria-label="Install demon"
            title="Install demon">+</button
          >
        </div>
      {/if}
    </div>
  </header>

  <div class="floor-stack">
    {#if arch.floors.length === 0 && !editable}
      <p class="empty">// no floors</p>
    {/if}
    {#each arch.floors as floor, i (floor.id)}
      {@const isEditing = editable && editingFloorId === floor.id}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        class="floor-row"
        class:editing={isEditing}
        role="group"
        aria-label="Floor {i + 1}"
        onfocusout={(e) => handleFloorFocusOut(e, floor)}
        onkeydown={(e) => handleFloorKeydown(e, floor)}
      >
        <!-- Click-outside scope: the three boxes only. The action
             triplet sits as a sibling so clicking it counts as outside. -->
        <div class="floor-content" data-edit-wrapper={`floor-${floor.id}`}>
          <div class="box-side">
            <span class="label">Floor</span>
            <span class="value">{i + 1}</span>
          </div>
          <div class="box-center">
            {#if isEditing}
              <div class="floor-edit">
                <select
                  value={floor.type}
                  onchange={(e) =>
                    onTypeChange(
                      floor,
                      (e.currentTarget as HTMLSelectElement).value as NetFloorType,
                    )}
                >
                  {#each NET_FLOOR_TYPES as t (t)}
                    <option value={t}>{t}</option>
                  {/each}
                </select>
                {#if floorNeedsDescription(floor.type)}
                  <input
                    class="desc-input"
                    bind:value={floor.description}
                    placeholder="Description"
                  />
                {/if}
              </div>
            {:else}
              <span class="text">
                <span class="type">{floor.type}</span>
                {#if floor.type !== "Password" && floor.description}
                  <span class="desc">{floor.description}</span>
                {/if}
              </span>
            {/if}
          </div>
          <div class="box-side">
            <span class="label">DV</span>
            {#if isEditing && floorHasDv(floor.type)}
              <input
                class="dv-input"
                type="number"
                min="0"
                step="1"
                value={floor.dv ?? 0}
                oninput={(e) => {
                  const v = Number(
                    (e.currentTarget as HTMLInputElement).value,
                  );
                  floor.dv = Number.isFinite(v) ? v : 0;
                }}
              />
            {:else}
              <span class="value"
                >{#if floorHasDv(floor.type)}{floor.dv ??
                    0}{:else}—{/if}</span
              >
            {/if}
          </div>
        </div>
        {#if editable}
          <div class="floor-actions">
            <RowActions
              label="floor {i + 1}"
              editing={isEditing}
              onEdit={() => toggleEditFloor(floor)}
              onDuplicate={() => duplicateFloor(floor)}
              onRemove={() => removeFloor(floor)}
              vertical
            />
          </div>
        {/if}
      </div>
      {#if i < arch.floors.length - 1}
        <div class="arrow" aria-hidden="true">
          <svg viewBox="0 0 12 12" width="12" height="12">
            <polygon points="0,0 12,0 6,12" fill="currentColor" />
          </svg>
        </div>
      {/if}
    {/each}
    {#if editable}
      <div class="add-row floor-add">
        <button
          type="button"
          class="add-btn"
          onclick={addFloor}
          aria-label="Add floor"
          title="Add floor">+</button
        >
      </div>
    {/if}
  </div>
</section>

<style>
  .sheet {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    /* Symmetric padding — the right side reserves space for the
       absolutely-positioned action triplets, the matching left padding
       gives the box stack visual breathing room so the floor/demon
       blocks read as centered inside the sheet. */
    padding: 1rem 3rem;
    border: 1px solid var(--border-strong);
    background: var(--surface);
  }

  .sheet-head {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
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
    flex-wrap: wrap;
  }
  /* Name and the "NET ARCHITECTURE" suffix sit on the same baseline.
     They wrap naturally if the name is too long for one line; no fixed
     flex sizing is needed. */
  .head-name,
  .head-suffix {
    min-width: 0;
  }
  /* Visually optical-align the pencil with the cap-height of the title
     letters. The default `align-items: center` puts the button at the
     line-box midpoint, which sits a few pixels below the visual midpoint
     of uppercase letterforms — the negative margin reclaims that gap. */
  .head-title :global(.row-actions) {
    margin-top: -3px;
  }
  .head-tri {
    color: var(--faction);
    flex: 0 0 auto;
  }

  .name-input {
    flex: 1;
    min-width: 12rem;
    text-transform: none;
    letter-spacing: normal;
    font-family: var(--font-ui);
    font-weight: 700;
  }
  .name-input:focus {
    border-color: var(--faction);
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
  .readout.demon-name {
    color: var(--text);
    margin-top: 0.35rem;
  }
  .readout.demon-name:first-of-type {
    margin-top: 0;
  }

  .demons-section {
    display: flex;
    flex-direction: column;
    /* Larger gap because each demon's action triplet is taller than the
       2-line readout — without breathing room here the buttons of one
       demon would overlap the buttons of the next. */
    gap: 1rem;
  }

  /* The block is a positioning context for the floating actions; all
     visual styling (padding, border, layout) belongs to the inner
     `.demon-content` so the click-outside scope matches the user's
     mental model (clicks outside the fields commit). */
  .demon-block {
    position: relative;
  }
  .demon-content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.2rem;
    padding: 0.4rem 0.5rem;
    border: 1px solid transparent;
    /* Match the action-triplet height (3 stacked buttons ≈ 72px) so the
       absolutely-positioned actions never spill outside the block and
       collide with the next demon below. */
    min-height: 5rem;
  }
  .demon-content.editing {
    border-color: var(--border);
  }
  .demon-actions {
    position: absolute;
    left: 100%;
    top: 0;
    bottom: 0;
    margin-left: 0.5rem;
    display: flex;
    align-items: center;
  }

  .demon-edit-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem 0.7rem;
  }
  .demon-edit-grid label {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.8em;
    color: var(--text-muted);
  }
  .demon-edit-grid label.full {
    grid-column: 1 / -1;
  }
  .demon-edit-grid input:focus {
    border-color: var(--faction);
  }

  .floor-stack {
    display: flex;
    flex-direction: column;
  }

  /* The row is a positioning context only; the 3-box grid lives on the
     inner `.floor-content` so the click-outside scope stops at the box
     edges and the absolutely-positioned actions sit just past it. */
  .floor-row {
    position: relative;
  }
  .floor-content {
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
  .dv-input {
    width: 4rem;
    margin-top: 0.2rem;
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    text-align: center;
    color: var(--text);
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
  .box-center .text {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
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

  .floor-edit {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    width: 100%;
    text-transform: none;
    letter-spacing: normal;
    font-weight: 400;
  }
  .floor-edit select,
  .floor-edit input,
  .floor-edit input:focus,
  .floor-edit select:focus {
    border-color: var(--faction);
  }

  /* Anchored just past the row's right border, vertically centered.
     The 0.5rem nudge is the "little out of borders" so the buttons
     read as belonging-to but not part-of the floor block. */
  .floor-actions {
    position: absolute;
    left: 100%;
    top: 0;
    bottom: 0;
    margin-left: 0.5rem;
    display: flex;
    align-items: center;
  }

  /* Arrow sits centered on the row's full width — when the editor adds
     an actions column the row gets wider on the right, so a grid-based
     centering on the description column would drift right of the page
     midpoint. Plain flex-center on a full-width strip stays anchored. */
  .arrow {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0.25rem 0;
    color: var(--faction);
  }

  .add-row {
    display: flex;
    justify-content: center;
    margin-top: 0.5rem;
  }
  .floor-add {
    margin-top: 0.75rem;
  }
  /* Compact, icon-only "+" — same circle of width regardless of label;
     keeps the centered position from being thrown off by text width. */
  .add-btn {
    width: 2.4rem;
    height: 2.4rem;
    padding: 0;
    border: 1px solid var(--faction);
    color: var(--faction);
    background: transparent;
    font-size: 1.4rem;
    line-height: 1;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .add-btn:hover {
    background: var(--faction);
    color: #000;
  }

  .empty {
    color: var(--text-faint);
    font-family: var(--font-mono);
    font-size: 0.9em;
    margin: 0;
  }
</style>
