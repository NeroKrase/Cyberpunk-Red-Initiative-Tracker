<script lang="ts">
  import { dismiss, notifications } from "./notification-queue.svelte";
</script>

<aside class="stack" aria-live="polite">
  {#each notifications as n (n.id)}
    <article class="toast {n.kind}" role="status">
      <button
        type="button"
        class="close"
        aria-label="Dismiss"
        onclick={() => dismiss(n.id)}>×</button
      >
      <strong class="title">{n.title}</strong>
      {#if n.body}<p class="body">{n.body}</p>{/if}
    </article>
  {/each}
</aside>

<style>
  .stack {
    position: fixed;
    bottom: 1.25rem;
    right: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    z-index: 9999;
    pointer-events: none;
  }

  .toast {
    pointer-events: auto;
    position: relative;
    min-width: 18rem;
    max-width: 26rem;
    padding: 0.7rem 2.2rem 0.7rem 0.9rem;
    background: var(--surface, #181820);
    border: 1px solid var(--border-strong, #3a3b48);
    border-left: 4px solid var(--accent, #c8102e);
    color: var(--text, #f0f0f5);
    font-family: var(--font-ui, system-ui), sans-serif;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
    animation: toast-in 160ms ease-out;
  }
  .toast.success {
    border-left-color: #28c76f;
  }
  .toast.error {
    border-left-color: #ff2638;
  }

  .title {
    display: block;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .body {
    margin: 0.25rem 0 0;
    font-size: 0.8rem;
    line-height: 1.35;
    color: var(--text-muted, #a8a8b3);
    word-break: break-all;
  }

  .close {
    position: absolute;
    top: 0.25rem;
    right: 0.4rem;
    background: transparent;
    border: none;
    color: var(--text-faint, #707080);
    font-size: 1rem;
    line-height: 1;
    padding: 0.15rem 0.35rem;
    cursor: pointer;
  }
  .close:hover {
    color: var(--text, #fff);
  }

  @keyframes toast-in {
    from {
      transform: translateY(8px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
</style>
