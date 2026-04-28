<script lang="ts">
  import { confirmState, resolveConfirm } from "$lib/confirm.svelte";

  let dialog: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (!dialog) return;
    if (confirmState.open && !dialog.open) {
      dialog.showModal();
    } else if (!confirmState.open && dialog.open) {
      dialog.close();
    }
  });

  function onBackdropClick(e: MouseEvent) {
    if (e.target === dialog) resolveConfirm(false);
  }
</script>

<dialog
  bind:this={dialog}
  onclose={() => resolveConfirm(false)}
  onclick={onBackdropClick}
>
  {#if confirmState.open}
    <div class="frame">
      <header class="title">{confirmState.opts.title}</header>
      {#if confirmState.opts.message}
        <p class="message">{confirmState.opts.message}</p>
      {/if}
      <div class="actions">
        <button
          type="button"
          class="cancel"
          onclick={() => resolveConfirm(false)}
        >
          {confirmState.opts.cancelLabel}
        </button>
        <button
          type="button"
          class="confirm"
          onclick={() => resolveConfirm(true)}
        >
          {confirmState.opts.confirmLabel}
        </button>
      </div>
    </div>
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
    gap: 0.85rem;
  }

  .title {
    font-size: 0.95rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--text);
  }

  .message {
    margin: 0;
    color: var(--text-muted);
    line-height: 1.5;
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

  .confirm:hover {
    background: var(--accent-bright);
    border-color: var(--accent-bright);
  }
</style>
