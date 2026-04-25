# Style Guide

Visual identity, design tokens, and component conventions for the Cyberpunk Red Initiative Tracker. Read this before changing any UI.

## Identity

The anchor is **Cyberpunk Red** (the tabletop, 2045) — *not* generic neon-cyberpunk. That means:

- **Red is the primary accent**, anchored in the literal blood-red sky after the orbital strikes. Not cyan, not magenta.
- Surfaces are **warm near-black**, not glassy blue-black.
- The vibe is **post-collapse / DIY / punk**. Grungy edges, sharp corners, HUD readouts. Not Apple-glass, not corporate-neon.
- Some **2077-era polish is welcome**: notched corners, glow on red accents, monospace data-readouts. But CP Red coloring stays dominant.

When in doubt: warmer over cooler, sharper over rounder, dimmer over neon-saturated.

## Design Tokens

All tokens live in `src/routes/+layout.svelte` under `:global(:root)`. Use CSS custom properties — never hardcode hex.

### Surfaces & borders

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#0d0d10` | Page background (warm near-black) |
| `--surface` | `#181820` | Panels, tiles |
| `--surface-2` | `#22232b` | Inputs, raised elements |
| `--surface-3` | `#2a2b35` | Subtle hover state |
| `--border` | `#2a2a35` | List separators, soft dividers |
| `--border-strong` | `#3a3b48` | Panel borders, input borders |

### Accents

| Token | Value | Use |
| --- | --- | --- |
| `--accent` | `#c8102e` | **Primary brand red.** Sessions tile, submit buttons, destructive actions, mortal-wound state. The dominant accent. |
| `--accent-bright` | `#ff2638` | Hover/active state of `--accent`. Use for glow shadows. |
| `--hazard` | `#f5b800` | Caution amber. Seriously-wounded, warnings. Stencil-only — borders and text, not fills. |
| `--ncpd` | `#2479ff` | Police-blue, NCPD-flavored surfaces (the bestiary). More saturated than `--data`. |
| `--ncpd-bright` | `#4d92ff` | Hover variant of `--ncpd`. |
| `--data` | `#3ed1d6` | Cool-teal data accent. Use **sparingly** — readout tags only, never as a dominant tint. |

### Text

| Token | Value | Use |
| --- | --- | --- |
| `--text` | `#f0f0f5` | Primary copy |
| `--text-muted` | `#a8a8b3` | Labels, secondary lines |
| `--text-faint` | `#707080` | Meta info, empty-state text, back-links |

### Typography

| Token | Value | Use |
| --- | --- | --- |
| `--font-ui` | `Rajdhani`, system fallbacks | Body, headings, labels, button text |
| `--font-mono` | `JetBrains Mono`, system fallbacks | Numbers, terminal prefixes, anything that updates |

Both fonts are loaded from Google Fonts via `<link>` in `src/app.html`. Don't switch — they were chosen because Rajdhani is the closest free analog to the official rulebook's Futura PT, and JetBrains Mono reads as "data terminal" without being kitschy.

#### Type rules

- Headings: UPPERCASE, `letter-spacing: 0.10–0.18em`, weight 600–700.
- Section labels: UPPERCASE, `letter-spacing: 0.08em`.
- Buttons: UPPERCASE, `letter-spacing: 0.08em`, weight 600.
- `<input type="number">` already gets `--font-mono` + `tabular-nums` from the global stylesheet — don't override.
- Any number that animates or updates (initiative, HP, totals) must use `--font-mono` + `tabular-nums` so digits don't dance.

## Motifs to apply

These patterns repeat throughout the app. Reach for them before inventing new ones.

### Faction theming (red vs. blue)

A page or panel that "belongs" to a faction sets a `--faction` CSS variable, and all coloring downstream pulls from it. This keeps Sessions consistently red, NCPD consistently blue, with no per-rule hardcoding.

```svelte
<div class="page" style="--faction: var(--accent); --faction-bright: var(--accent-bright);">
  ...
</div>
```

Inside the scope, write `border-color: var(--faction)` and `color: var(--faction-bright)`. Never reference `--accent` or `--ncpd` directly inside scoped components — use `--faction`.

### Corner brackets (CP HUD frame)

Used on the launcher tiles. 16×16 L-brackets at the top-right and bottom-right corners, drawn with `::before` / `::after` and a 2px faction-colored border with two sides removed:

```css
.frame::before {
  content: "";
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid var(--faction);
  border-left: none;
  border-bottom: none;
  top: -1px;
  right: -1px;
}
```

Use sparingly — only on hero/portal elements, not every panel.

### Out-of-frame label

A label sitting *below* the bordered area, with a leading short bracket and a trailing fading bracket. Used on the launcher tiles. Pattern:

```svelte
<div class="label">
  <span class="bracket-l"></span>
  <span class="label-text">Sessions</span>
  <span class="bracket-r"></span>
</div>
```

```css
.bracket-l, .bracket-r { flex: 1; height: 1px; background: var(--faction); }
.bracket-l { background: linear-gradient(90deg, transparent, var(--faction)); opacity: 0.55; }
.bracket-r { background: linear-gradient(90deg, var(--faction), transparent); opacity: 0.55; }
```

### Page header (list pages)

```svelte
<header class="head">
  <span class="head-prefix">»</span>
  <h1>Sessions</h1>
</header>
```

`.head` gets `border-bottom: 1px solid var(--faction)` + `padding-bottom: 0.6rem`. The `»` prefix is in `--font-mono`, faction-colored.

### Back-link

Top of every non-home page, quiet, mono-feeling:

```svelte
<p class="back"><a href="/sessions">← Sessions</a></p>
```

`.back` text is `--text-faint`, uppercase, letter-spaced, faint until hover.

### List entries

Each row uses a `›` prefix in faction color + monospace, content next, meta column right-aligned in monospace uppercase.

```svelte
<a href="..." class="entry">
  <span class="prefix">›</span>
  <span class="name">{item.name}</span>
</a>
<span class="meta">3 ENC</span>
```

### Empty states

Always mono, faded, prefixed `//`:

```svelte
<p class="empty">// no sessions logged</p>
```

### Wound badges

- **Seriously Wounded**: amber stencil — `--hazard` border + `--hazard` text, transparent bg, uppercase letterspaced.
- **Mortally Wounded**: filled red — `--accent` background, white text.

These are diegetic to CP Red's combat rules; do not invent new severity levels.

## Component conventions

### Buttons

- **Default (`<button>` no type)**: outlined, transparent bg, faction-or-accent border on hover.
- **Submit (`<button type="submit">`)**: filled `--accent`, white text. The global stylesheet already does this — write submit buttons as `<button type="submit">` and they look right automatically.
- **Destructive ("×" remove)**: transparent, no border, `--text-faint` color. Hover: `--accent-bright` text + `--accent` border. Class `.del`.
- **Action link** (e.g., "+ FILE NEW PERP"): styled as faction-bordered button using `<a class="tile-action">`.

Never add a `border-radius`. Sharp corners or notched corners only.

### Inputs

Inputs inherit from globals. Sharp corners, dark surface, faction-bordered on focus:

```css
input:focus { border-color: var(--accent); }
```

If you need a faction-aware input inside a scoped component, override `:focus { border-color: var(--faction); }`.

### Tiles (launcher)

See `src/routes/+page.svelte`. The pattern: square frame (`aspect-ratio: 1/1`), 1px border, 3px faction-colored left edge, big inline SVG icon (56% of width), out-of-frame label below. The whole tile is an `<a>` so the entire surface is clickable.

### Forms

Default `<form>` flexbox is set globally. For a stacked form (StatBlockForm), opt out locally with `flex-direction: column` and `gap: 1.5rem`.

## SVG icons

- Inline SVG, `viewBox="0 0 100 100"`.
- `stroke="currentColor"` so they pick up the faction color via CSS.
- Stroke width 2.5px for line elements.
- `stroke-linejoin="round"` and `stroke-linecap="round"` for friendly weight without rounding the silhouette.
- For glow on a faction-colored icon: `filter: drop-shadow(0 0 14px color-mix(in srgb, var(--faction) 35%, transparent))`.

Don't import an icon library. Don't use emoji as icons.

## Don'ts

- **No emoji** as iconography. SVG only.
- **No `border-radius`** beyond 0. Pills, capsules, soft chips — none of it.
- **No glassmorphism** (no `backdrop-filter`, no translucent surfaces over blurred backgrounds).
- **No gradient fills** on surfaces. Single very-faint diagonal highlight (≤ 2% white) on tile backgrounds is the only allowed surface gradient.
- **No drop-shadow** for general depth. Use border contrast against `--surface` instead. Drop-shadow is reserved for icon glow on faction-colored elements.
- **No cyan-dominant palettes.** Cyan (`--data`) is a sparing accent for readouts/tags. Don't make it the primary tint of a panel.
- **No pastel / soft neon.** Saturation matters: CP Red is bloody and grungy, not bubblegum.
- **No hardcoded hex values** in component CSS. Always pull from tokens.
- **No comments explaining what styles do** when class names already say it.

## File conventions

- **Global tokens, base styles, fonts**: `src/routes/+layout.svelte` (`:global(:root)` block) + `src/app.html`.
- **Page-specific styles**: scoped `<style>` block in the page's `+page.svelte`.
- **Reusable components**: `src/lib/`. Keep their CSS scoped; reach for tokens, never hardcoded colors.
- **Routes**:
  - `/` is the launcher (two app-icon tiles only). Don't add lists or forms here.
  - `/sessions` is the sessions list + create form.
  - `/bestiary` is the NCPD Crime Database list.
  - `/session/[id]` and `/session/[id]/encounter/[id]` are the in-session views.
  - `/bestiary/new` and `/bestiary/[templateId]` are the template editor (shared `StatBlockForm`).
- Back-link target convention: leaf pages return to their list, list pages return to `/`.

## Adding new things

- **New accent color**: try to fit `--accent`, `--ncpd`, `--hazard`, or `--data` first. Add a new token only for a genuinely new faction/concept (e.g., a future Trauma Team teal-yellow), and document it here.
- **New page**: copy the back-link + page-header pattern from `src/routes/sessions/+page.svelte` or `src/routes/bestiary/+page.svelte`. Set `--faction` at the top of the scoped block; everything downstream uses it.
- **New icon**: hand-roll an inline SVG using the conventions above. Match the density of existing ones (skull, NCPD shield) — geometric, recognizable at 96px, readable at 24px.
