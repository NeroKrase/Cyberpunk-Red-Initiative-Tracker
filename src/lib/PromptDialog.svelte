<script lang="ts">
  import { promptState, resolvePrompt } from "$lib/prompt.svelte";

  let dialog: HTMLDialogElement | undefined = $state();
  let input: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (!dialog) return;
    if (promptState.open && !dialog.open) {
      dialog.showModal();
      queueMicrotask(() => {
        input?.focus();
        input?.select();
      });
    } else if (!promptState.open && dialog.open) {
      dialog.close();
    }
  });

  function submit(e: Event) {
    e.preventDefault();
    const trimmed = promptState.value.trim();
    if (!trimmed) return;
    resolvePrompt(trimmed);
  }

  function onBackdropClick(e: MouseEvent) {
    if (e.target === dialog) resolvePrompt(null);
  }
</script>

<dialog
  bind:this={dialog}
  onclose={() => resolvePrompt(null)}
  onclick={onBackdropClick}
>
  {#if promptState.open}
    <form class="frame" onsubmit={submit}>
      <header class="title">{promptState.opts.title}</header>
      {#if promptState.opts.label}
        <label class="field-label" for="prompt-input">
          {promptState.opts.label}
        </label>
      {/if}
      <input
        id="prompt-input"
        bind:this={input}
        bind:value={promptState.value}
        autocomplete="off"
      />
      <div class="actions">
        <button
          type="button"
          class="cancel"
          onclick={() => resolvePrompt(null)}
        >
          {promptState.opts.cancelLabel}
        </button>
        <button
          type="submit"
          class="confirm"
          disabled={!promptState.value.trim()}
        >
          {promptState.opts.confirmLabel}
        </button>
      </div>
    </form>
  {/if}
</dialog>

<style>
  dialog {
    padding: 0;
    margin: auto;
    border: none;
    background: transparent;
    color: var(--text);
    font-family: var(--font-ui);
    max-width: min(28rem, calc(100vw - 2rem));
    width: 100%;
  }

  dialog::backdrop {
    background: rgba(8, 8, 12, 0.78);
  }

  .frame {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-left: 3px solid var(--accent);
    padding: 1.1rem 1.25rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 0;
  }

  .title {
    font-size: 0.95rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--text);
  }

  .field-label {
    color: var(--text-muted);
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: -0.35rem;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }

  .cancel {
    background: transparent;
    color: var(--text-muted);
    border: 1px solid var(--border-strong);
  }

  .cancel:hover {
    color: var(--text);
    border-color: var(--text-muted);
  }

  .confirm {
    background: var(--accent);
    border: 1px solid var(--accent);
    color: #fff;
  }

  .confirm:hover:not(:disabled) {
    background: var(--accent-bright);
    border-color: var(--accent-bright);
  }

  .confirm:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
