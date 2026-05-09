// Shared drawing primitives + IO for printable cards (NPC and NET).
// Bumping a constant or tweaking a primitive here changes both card
// families uniformly — keep card-family-specific logic in the sibling
// `npc.ts` / `net.ts` modules.

import { notify } from "../notification-queue.svelte";

// Detects whether the page is running inside the Tauri webview shell.
// In the shell we save into a `cards/` folder beside the executable; in
// a plain browser (dev preview, vite preview, etc.) we fall back to a
// normal download.
export function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}

// Brutalist tech-noir palette.
export const RED = "#dc2626";
export const BLACK = "#0f0f0f";
export const WHITE = "#ffffff";
export const GREY_LIGHT = "#e5e7eb";
export const FAINT = "#7a7a7a";

// Fonts (loaded via Google Fonts in app.html).
export const FONT_HEADER = '"Oswald", "Rajdhani", system-ui, sans-serif';
export const FONT_STENCIL = '"Black Ops One", "Rajdhani", system-ui, sans-serif';
export const FONT_BODY = '"Inter", system-ui, sans-serif';

export const BORDER_THICK = 4;
export const BORDER_THIN = 1;
export const TAB_CHAMFER = 14;
export const BOX_CHAMFER = 10;

export type Chamfer = { tl?: number; tr?: number; br?: number; bl?: number };

export type Segment = { text: string; bold?: boolean };

export function slug(s: string, fallback = "card"): string {
  return (
    (s || fallback)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || fallback
  );
}

// "solo: combat awareness 2" → "Solo: Combat Awareness 2"
// All-caps short tokens like "SMG" or "ROF2" are preserved as-is.
export function titleCase(s: string): string {
  return s
    .split(/(\s+|:)/)
    .map((part) => {
      if (!part || part === ":" || /^\s+$/.test(part)) return part;
      if (part === part.toUpperCase() && /[A-Z]/.test(part) && part.length <= 5) {
        return part;
      }
      return part[0].toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");
}

export function chamferPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  c: Chamfer = {},
) {
  ctx.beginPath();
  if (c.tl) {
    ctx.moveTo(x, y + c.tl);
    ctx.lineTo(x + c.tl, y);
  } else {
    ctx.moveTo(x, y);
  }
  if (c.tr) {
    ctx.lineTo(x + w - c.tr, y);
    ctx.lineTo(x + w, y + c.tr);
  } else {
    ctx.lineTo(x + w, y);
  }
  if (c.br) {
    ctx.lineTo(x + w, y + h - c.br);
    ctx.lineTo(x + w - c.br, y + h);
  } else {
    ctx.lineTo(x + w, y + h);
  }
  if (c.bl) {
    ctx.lineTo(x + c.bl, y + h);
    ctx.lineTo(x, y + h - c.bl);
  } else {
    ctx.lineTo(x, y + h);
  }
  ctx.closePath();
}

// Thick red bordered white-filled box. Chamfer defaults to top-right only.
// Restores caller's fillStyle so the next ctx.fillText uses the expected color.
export function thickRedBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  chamfer: Chamfer = { tr: BOX_CHAMFER },
) {
  ctx.save();
  chamferPath(ctx, x, y, w, h, chamfer);
  ctx.fillStyle = WHITE;
  ctx.fill();
  ctx.lineWidth = BORDER_THICK;
  ctx.strokeStyle = RED;
  ctx.lineJoin = "miter";
  ctx.stroke();
  ctx.restore();
}

// Section tab: red-filled trapezoid where the right edge slopes outward
// (top recessed by `chamfer`, bottom flush). White Oswald label inside.
export function sectionTab(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
) {
  const chamfer = TAB_CHAMFER;
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w - chamfer, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = WHITE;
  ctx.font = `700 14px ${FONT_HEADER}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label.toUpperCase(), x + 12, y + h / 2 + 1);
}

// Targeting-reticle stat label: light grey bg + 4 red L-shaped corner brackets
// + black centered text.
export function reticleLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
) {
  ctx.fillStyle = GREY_LIGHT;
  ctx.fillRect(x, y, w, h);

  const arm = Math.min(7, Math.min(w, h) / 3);
  ctx.lineWidth = 2;
  ctx.strokeStyle = RED;
  ctx.lineJoin = "miter";
  ctx.beginPath();
  // top-left
  ctx.moveTo(x, y + arm);
  ctx.lineTo(x, y);
  ctx.lineTo(x + arm, y);
  // top-right
  ctx.moveTo(x + w - arm, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + arm);
  // bottom-right
  ctx.moveTo(x + w, y + h - arm);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w - arm, y + h);
  // bottom-left
  ctx.moveTo(x + arm, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + h - arm);
  ctx.stroke();

  ctx.fillStyle = BLACK;
  ctx.font = `700 11px ${FONT_HEADER}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label.toUpperCase(), x + w / 2, y + h / 2 + 1);
}

export function thinRule(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineWidth = BORDER_THIN;
  ctx.strokeStyle = BLACK;
  ctx.stroke();
}

export function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Wraps a "rich" segments array (used for the gear list with bold "Cash:").
export function wrapSegments(
  ctx: CanvasRenderingContext2D,
  segments: Segment[],
  maxWidth: number,
  bodyFont: (bold: boolean) => string,
): Segment[][] {
  // Normalize into space-separated tokens that preserve their bold flag.
  type Token = { text: string; bold: boolean };
  const tokens: Token[] = [];
  for (const seg of segments) {
    const parts = seg.text.split(/(\s+)/);
    for (const p of parts) if (p) tokens.push({ text: p, bold: !!seg.bold });
  }

  const lines: Segment[][] = [];
  let line: Segment[] = [];
  let lineWidth = 0;

  function widthOf(t: Token) {
    ctx.font = bodyFont(t.bold);
    return ctx.measureText(t.text).width;
  }

  for (const tok of tokens) {
    const tw = widthOf(tok);
    const isSpace = /^\s+$/.test(tok.text);
    if (lineWidth + tw > maxWidth && line.length && !isSpace) {
      lines.push(line);
      line = [];
      lineWidth = 0;
    }
    if (isSpace && !line.length) continue;
    line.push({ text: tok.text, bold: tok.bold });
    lineWidth += tw;
  }
  if (line.length) lines.push(line);
  return lines;
}

export function drawSegmentLine(
  ctx: CanvasRenderingContext2D,
  segs: Segment[],
  x: number,
  y: number,
  bodyFont: (bold: boolean) => string,
) {
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = BLACK;
  let cx = x;
  for (const s of segs) {
    ctx.font = bodyFont(!!s.bold);
    ctx.fillText(s.text, cx, y);
    cx += ctx.measureText(s.text).width;
  }
}

export function drawWrapped(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
) {
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  let ty = y;
  for (const line of lines) {
    ctx.fillText(line, x, ty);
    ty += lineHeight;
  }
}

export type Stage = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  dpr: number;
};

export function makeStage(width: number, dpr = 2): Stage {
  const c = document.createElement("canvas");
  c.width = width * dpr;
  c.height = 4000 * dpr;
  const ctx = c.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, width, 4000);
  return { canvas: c, ctx, width, dpr };
}

export function crop(
  stage: HTMLCanvasElement,
  width: number,
  height: number,
  dpr: number,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = width * dpr;
  c.height = height * dpr;
  c.style.width = `${width}px`;
  c.style.height = `${height}px`;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(stage, 0, 0);
  return c;
}

// Sends the PNG bytes to the Rust `save_card` command which writes them
// into `<exe_dir>/cards/<filename>` and returns the absolute path.
async function saveBlobViaTauri(blob: Blob, filename: string): Promise<string> {
  // Lazy-load the API so a vite/browser build that never enters this branch
  // doesn't pay the bundle cost.
  const { invoke } = await import("@tauri-apps/api/core");
  const buffer = await blob.arrayBuffer();
  // `serde_json` decodes Vec<u8> from a JSON array of byte values, which
  // is what Tauri's invoke serialiser produces from a number array.
  const bytes = Array.from(new Uint8Array(buffer));
  return await invoke<string>("save_card", { filename, bytes });
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  return new Promise<void>((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve();
        return;
      }

      if (isTauri()) {
        try {
          const path = await saveBlobViaTauri(blob, filename);
          notify({
            kind: "success",
            title: "Card saved",
            body: `Saved to ${path}`,
          });
        } catch (err) {
          notify({
            kind: "error",
            title: "Failed to save card",
            body: err instanceof Error ? err.message : String(err),
          });
        }
      } else {
        // Fallback for plain-browser dev/preview: trigger a download.
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        notify({
          kind: "info",
          title: "Card downloaded",
          body: `Saved as ${filename} via browser download`,
        });
      }
      resolve();
    }, "image/png");
  });
}

// Ensures custom Google fonts have loaded before we start drawing — cards
// drawn before fonts settle would silently fall back to system fonts and
// look wrong. Idempotent and a no-op outside the browser.
export async function awaitFonts(): Promise<void> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }
}
