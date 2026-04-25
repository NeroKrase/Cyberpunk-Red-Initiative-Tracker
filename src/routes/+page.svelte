<script lang="ts">
</script>

<div class="launcher">
  <a class="app" href="/sessions" style="--faction: var(--accent); --faction-bright: var(--accent-bright);">
    <div class="frame">
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">
        <path d="M22 50 Q22 16 50 16 Q78 16 78 50 L78 62 Q78 70 71 72 L71 82 L62 82 L62 73 L56 73 L56 82 L44 82 L44 73 L38 73 L38 82 L29 82 L29 72 Q22 70 22 62 Z" />
        <rect x="30" y="38" width="16" height="14" fill="currentColor" stroke="none" />
        <rect x="54" y="38" width="16" height="14" fill="currentColor" stroke="none" />
        <rect x="46" y="56" width="8" height="10" fill="currentColor" stroke="none" />
        <line x1="14" y1="30" x2="22" y2="34" />
        <line x1="86" y1="30" x2="78" y2="34" />
      </svg>
    </div>
    <div class="label">
      <span class="bracket-l"></span>
      <span class="label-text">Sessions</span>
      <span class="bracket-r"></span>
    </div>
  </a>

  <a class="app" href="/bestiary" style="--faction: var(--ncpd); --faction-bright: var(--ncpd-bright);">
    <div class="frame">
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">
        <path d="M50 6 L88 18 L88 50 Q88 82 50 94 Q12 82 12 50 L12 18 Z" />
        <line x1="18" y1="32" x2="82" y2="32" stroke-width="1.5" />
        <line x1="18" y1="68" x2="82" y2="68" stroke-width="1.5" />
        <path d="M50 38 L54.5 51 L68 51 L57 59 L61 72 L50 64 L39 72 L43 59 L32 51 L45.5 51 Z" fill="currentColor" stroke="none" />
      </svg>
    </div>
    <div class="label">
      <span class="bracket-l"></span>
      <span class="label-text">NCPD Crime Database</span>
      <span class="bracket-r"></span>
    </div>
  </a>
</div>

<style>
  .launcher {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    max-width: 640px;
    margin: clamp(2rem, 8vh, 6rem) auto 0;
  }

  .app {
    display: flex;
    flex-direction: column;
    color: inherit;
    text-decoration: none;
  }

  .frame {
    position: relative;
    aspect-ratio: 1 / 1;
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.018) 0%, transparent 65%),
      var(--surface);
    border: 1px solid var(--border-strong);
    border-left: 3px solid var(--faction);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 160ms, box-shadow 200ms, transform 160ms, background 200ms;
  }

  .frame::before,
  .frame::after {
    content: "";
    position: absolute;
    width: 16px;
    height: 16px;
    border: 2px solid var(--faction);
    pointer-events: none;
    transition: border-color 160ms, width 160ms, height 160ms;
  }
  .frame::before {
    top: -1px;
    right: -1px;
    border-left: none;
    border-bottom: none;
  }
  .frame::after {
    bottom: -1px;
    right: -1px;
    border-left: none;
    border-top: none;
  }

  .frame svg {
    width: 56%;
    height: 56%;
    color: var(--faction);
    filter: drop-shadow(0 0 14px color-mix(in srgb, var(--faction) 35%, transparent));
    transition: filter 200ms, transform 200ms;
  }

  .app:hover .frame {
    border-color: var(--faction);
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--faction) 35%, transparent),
      0 12px 28px color-mix(in srgb, var(--faction) 22%, transparent);
    transform: translateY(-2px);
  }
  .app:hover .frame::before,
  .app:hover .frame::after {
    width: 20px;
    height: 20px;
    border-color: var(--faction-bright);
  }
  .app:hover .frame svg {
    color: var(--faction-bright);
    filter: drop-shadow(0 0 22px color-mix(in srgb, var(--faction-bright) 55%, transparent));
  }
  .app:active .frame {
    transform: translateY(0);
  }

  .label {
    margin-top: 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.55rem;
    color: var(--faction);
  }
  .label-text {
    font-weight: 700;
    font-size: 0.85rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    text-align: center;
    flex-shrink: 0;
  }
  .bracket-l,
  .bracket-r {
    flex: 1;
    height: 1px;
    background: var(--faction);
  }
  .bracket-l {
    background: linear-gradient(90deg, transparent 0%, var(--faction) 100%);
    opacity: 0.55;
  }
  .bracket-r {
    background: linear-gradient(90deg, var(--faction) 0%, transparent 100%);
    opacity: 0.55;
  }
</style>
