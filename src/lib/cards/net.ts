import type { NetArchitecture, NetFloor } from "../types";
import { floorHasDv, floorNeedsDescription } from "../types";
import {
  BLACK,
  RED,
  WHITE,
  FAINT,
  FONT_HEADER,
  FONT_STENCIL,
  FONT_BODY,
  BOX_CHAMFER,
  awaitFonts,
  thickRedBox,
  sectionTab,
  wrap,
  makeStage,
  crop,
  slug,
  downloadCanvas,
} from "./shared";

const W = 580;
const PAD = 14;

// Floor row dimensions: side boxes (Floor # / DV) flank a centered
// type+description box. The base height is generous enough to seat the
// type label plus a single line of description without growing — only a
// second description line bumps the row taller (capped at 2 lines).
const SIDE_W = 96;
const ROW_GAP = 6;
const FLOOR_BASE_H = 68;
const FLOOR_DESC_LINE_H = 16;
const FLOOR_DESC_GAP = 4; // between type label and first description line
const ARROW_H = 22;

export async function downloadNetArchitectureCard(
  arch: NetArchitecture,
): Promise<void> {
  await awaitFonts();
  const canvas = drawNetArchitectureCard(arch);
  await downloadCanvas(
    canvas,
    `${slug(arch.name, "architecture")}-architecture-card.png`,
  );
}

export function drawNetArchitectureCard(
  arch: NetArchitecture,
): HTMLCanvasElement {
  const dpr = 2;
  const stage = makeStage(W, dpr);
  const ctx = stage.ctx;
  const innerW = W - 2 * PAD;
  let y = PAD;

  // ---- Header: triangle marker | name | "NET ARCHITECTURE" suffix ----
  y = drawHeader(ctx, y, innerW, arch.name);

  // ---- Demons section ----
  const tabH = 26;
  sectionTab(ctx, PAD, y, 100, tabH, "Demons");
  y += tabH + 8;
  y = drawDemons(ctx, y, innerW, arch);

  // ---- Architecture section (floor stack) ----
  sectionTab(ctx, PAD, y, 130, tabH, "Architecture");
  y += tabH + 8;
  y = drawFloors(ctx, y, innerW, arch.floors);

  y += PAD;
  return crop(stage.canvas, W, y, dpr);
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  y: number,
  innerW: number,
  name: string,
): number {
  const headerH = 60;
  thickRedBox(ctx, PAD, y, innerW, headerH, { tr: 18 });

  // Right-pointing red triangle marker — matches the on-screen sheet's
  // `<polygon points="0,0 10,5 0,10">` glyph.
  const triX = PAD + 16;
  const triY = y + headerH / 2;
  const triH = 7;
  const triW = 12;
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.moveTo(triX, triY - triH);
  ctx.lineTo(triX + triW, triY);
  ctx.lineTo(triX, triY + triH);
  ctx.closePath();
  ctx.fill();

  // Suffix first so we know where the name has to stop.
  ctx.fillStyle = BLACK;
  ctx.font = `700 13px ${FONT_HEADER}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const suffix = "NET ARCHITECTURE";
  const suffixRight = PAD + innerW - 16;
  ctx.fillText(suffix, suffixRight, y + headerH / 2 + 1);
  const suffixW = ctx.measureText(suffix).width;

  // Name fills the remaining horizontal space.
  ctx.fillStyle = BLACK;
  ctx.font = `700 22px ${FONT_HEADER}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const nameLeft = triX + triW + 10;
  const nameRightLimit = suffixRight - suffixW - 14;
  const display = (name || "(unnamed)").toUpperCase();
  const fitted = ellipsize(ctx, display, nameRightLimit - nameLeft);
  ctx.fillText(fitted, nameLeft, y + headerH / 2 + 1);

  return y + headerH + 12;
}

function drawDemons(
  ctx: CanvasRenderingContext2D,
  y: number,
  innerW: number,
  arch: { demons: NetArchitecture["demons"] },
): number {
  if (arch.demons.length === 0) {
    const noteH = 38;
    thickRedBox(ctx, PAD, y, innerW, noteH, { tr: BOX_CHAMFER });
    ctx.fillStyle = BLACK;
    ctx.font = `700 14px ${FONT_HEADER}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      "DEMONS INSTALLED: NONE",
      PAD + innerW / 2,
      y + noteH / 2 + 1,
    );
    return y + noteH + 8;
  }

  const demonH = 60;
  for (const d of arch.demons) {
    thickRedBox(ctx, PAD, y, innerW, demonH, { tr: BOX_CHAMFER });

    ctx.fillStyle = BLACK;
    ctx.font = `700 15px ${FONT_HEADER}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `DEMONS INSTALLED: ${(d.name || "(unnamed demon)").toUpperCase()}`,
      PAD + innerW / 2,
      y + demonH / 2 - 11,
    );

    ctx.font = `400 12px ${FONT_BODY}`;
    ctx.fillText(
      `REZ ${d.rez}  ·  INTERFACE ${d.interfaceLevel}  ·  NET ACTIONS ${d.netActions}  ·  COMBAT # ${d.combatNumber}`,
      PAD + innerW / 2,
      y + demonH / 2 + 11,
    );

    y += demonH + 8;
  }
  return y;
}

function drawFloors(
  ctx: CanvasRenderingContext2D,
  y: number,
  innerW: number,
  floors: NetFloor[],
): number {
  if (floors.length === 0) {
    ctx.fillStyle = FAINT;
    ctx.font = `400 12px ${FONT_BODY}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("// no floors", PAD + 4, y + 4);
    return y + 22;
  }

  const centerW = innerW - 2 * SIDE_W - 2 * ROW_GAP;

  for (let i = 0; i < floors.length; i++) {
    const f = floors[i];
    const showDesc = floorNeedsDescription(f.type) && f.description.trim();

    // Pre-measure description so the row can grow when a long description
    // wraps to a second line. Cap at two lines so a runaway description
    // doesn't dominate the card. A single description line fits inside
    // FLOOR_BASE_H without growing the row.
    ctx.font = `400 12px ${FONT_BODY}`;
    const descLines = showDesc ? wrap(ctx, f.description, centerW - 24) : [];
    const limited = descLines.slice(0, 2);
    const extraLines = Math.max(0, limited.length - 1);
    const floorH = FLOOR_BASE_H + extraLines * FLOOR_DESC_LINE_H;

    // Left red side box: FLOOR / number
    redSideBox(ctx, PAD, y, SIDE_W, floorH, "FLOOR", String(i + 1));

    // Center white box: type + optional description
    const cx = PAD + SIDE_W + ROW_GAP;
    thickRedBox(ctx, cx, y, centerW, floorH, { tr: BOX_CHAMFER });

    const type = f.type.toUpperCase();
    ctx.fillStyle = BLACK;
    ctx.textAlign = "center";

    if (limited.length === 0) {
      ctx.font = `700 16px ${FONT_HEADER}`;
      ctx.textBaseline = "middle";
      ctx.fillText(type, cx + centerW / 2, y + floorH / 2 + 1);
    } else {
      // Center the (type + description) block vertically.
      const typeH = 18;
      const blockH = typeH + FLOOR_DESC_GAP + limited.length * FLOOR_DESC_LINE_H;
      const blockTop = y + (floorH - blockH) / 2;

      ctx.font = `700 16px ${FONT_HEADER}`;
      ctx.textBaseline = "top";
      ctx.fillText(type, cx + centerW / 2, blockTop);

      ctx.font = `400 12px ${FONT_BODY}`;
      let dy = blockTop + typeH + FLOOR_DESC_GAP;
      for (const line of limited) {
        ctx.fillText(line, cx + centerW / 2, dy);
        dy += FLOOR_DESC_LINE_H;
      }
    }

    // Right red side box: DV / value or em-dash for Black ICE
    const dvX = cx + centerW + ROW_GAP;
    const dvVal = floorHasDv(f.type) ? String(f.dv ?? 0) : "—";
    redSideBox(ctx, dvX, y, SIDE_W, floorH, "DV", dvVal);

    y += floorH;

    // Red downward triangle between consecutive floors. Mirrors the
    // on-screen sheet's `<polygon points="0,0 12,0 6,12">` arrow.
    if (i < floors.length - 1) {
      ctx.fillStyle = RED;
      const cax = PAD + innerW / 2;
      const ax = 11;
      const ah = 14;
      const top = y + (ARROW_H - ah) / 2;
      ctx.beginPath();
      ctx.moveTo(cax - ax, top);
      ctx.lineTo(cax + ax, top);
      ctx.lineTo(cax, top + ah);
      ctx.closePath();
      ctx.fill();
      y += ARROW_H;
    }
  }
  return y;
}

// Red-filled box with a small uppercase label (top half) and a big
// stencil value (bottom half), both white. Mirrors the on-screen
// `.box-side` style on the architecture sheet.
function redSideBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
) {
  ctx.fillStyle = RED;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = WHITE;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = `700 11px ${FONT_HEADER}`;
  ctx.fillText(label.toUpperCase(), x + w / 2, y + h / 2 - 12);

  ctx.font = `400 28px ${FONT_STENCIL}`;
  ctx.fillText(value, x + w / 2, y + h / 2 + 11);
}

function ellipsize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = "…";
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ctx.measureText(text.slice(0, mid) + ellipsis).width <= maxWidth) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return text.slice(0, lo) + ellipsis;
}
