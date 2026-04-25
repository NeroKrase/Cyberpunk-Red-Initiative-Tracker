<script lang="ts">
  let { children } = $props();
</script>

<main>
  {@render children()}
</main>

<style>
  :global(:root) {
    --bg: #0d0d10;
    --surface: #181820;
    --surface-2: #22232b;
    --surface-3: #2a2b35;
    --border: #2a2a35;
    --border-strong: #3a3b48;
    --accent: #c8102e;
    --accent-bright: #ff2638;
    --hazard: #f5b800;
    --data: #3ed1d6;
    --ncpd: #2479ff;
    --ncpd-bright: #4d92ff;
    --text: #f0f0f5;
    --text-muted: #a8a8b3;
    --text-faint: #707080;

    --font-ui: "Rajdhani", system-ui, sans-serif;
    --font-mono: "JetBrains Mono", ui-monospace, "SFMono-Regular", monospace;

    font-family: var(--font-ui);
    font-size: 16px;
    background: var(--bg);
    color: var(--text);
    color-scheme: dark;
    line-height: 1.4;
  }

  :global(body) {
    margin: 0;
    background:
      radial-gradient(circle at 12% -10%, rgba(200, 16, 46, 0.06), transparent 45%),
      radial-gradient(circle at 95% 110%, rgba(36, 121, 255, 0.05), transparent 45%),
      var(--bg);
    background-attachment: fixed;
    min-height: 100vh;
  }

  :global(h1, h2, h3) {
    margin: 0 0 1rem;
    font-family: var(--font-ui);
    font-weight: 600;
    letter-spacing: 0.06em;
  }

  :global(h1) {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 700;
    font-size: 1.6rem;
  }

  :global(h3) {
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.95rem;
    color: var(--text-muted);
  }

  :global(a) {
    color: var(--data);
    text-decoration: none;
    transition: color 120ms;
  }

  :global(a:hover) {
    color: var(--ncpd-bright);
  }

  :global(input),
  :global(button),
  :global(select),
  :global(textarea) {
    font: inherit;
    font-family: var(--font-ui);
    padding: 0.45rem 0.7rem;
    background: var(--surface-2);
    color: var(--text);
    border: 1px solid var(--border-strong);
    border-radius: 0;
    outline: none;
    transition: border-color 120ms, background 120ms, color 120ms;
  }

  :global(input[type="number"]) {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
  }

  :global(input:focus),
  :global(select:focus),
  :global(textarea:focus) {
    border-color: var(--accent);
  }

  :global(button) {
    cursor: pointer;
    background: transparent;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
    font-size: 0.88em;
  }

  :global(button:hover) {
    border-color: var(--accent);
    color: var(--accent-bright);
  }

  :global(button[type="submit"]) {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  :global(button[type="submit"]:hover) {
    background: var(--accent-bright);
    border-color: var(--accent-bright);
    color: #fff;
  }

  :global(ul) {
    list-style: none;
    padding: 0;
    margin: 0 0 1rem;
  }

  :global(li) {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--border);
  }

  :global(form) {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  :global(::selection) {
    background: var(--accent);
    color: #fff;
  }

  main {
    max-width: 1100px;
    margin: 0 auto;
    padding: 2.5rem 1.5rem 3rem;
  }
</style>
