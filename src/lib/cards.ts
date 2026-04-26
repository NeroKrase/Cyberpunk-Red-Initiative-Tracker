import type { EnemyTemplate } from "./types";
import {
  STAT_KEYS,
  maxHpFromStats,
  skillTotal,
  weaponCombatNumber,
} from "./types";

// Brutalist tech-noir palette.
const RED = "#dc2626"; // border-red-600
const BLACK = "#0f0f0f";
const WHITE = "#ffffff";
const GREY_LIGHT = "#e5e7eb"; // bg-gray-200
const FAINT = "#7a7a7a";

// Fonts (loaded via Google Fonts in app.html).
const FONT_HEADER = '"Oswald", "Rajdhani", system-ui, sans-serif';
const FONT_STENCIL = '"Black Ops One", "Rajdhani", system-ui, sans-serif';
const FONT_BODY = '"Inter", system-ui, sans-serif';

const BORDER_THICK = 4;
const BORDER_THIN = 1;
const TAB_CHAMFER = 14;
const BOX_CHAMFER = 10;

export type CardSize = "small" | "big";

type Chamfer = { tl?: number; tr?: number; br?: number; bl?: number };

export async function downloadNpcCard(
  template: EnemyTemplate,
  size: CardSize,
): Promise<void> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }
  const canvas =
    size === "small" ? drawSmallCard(template) : drawBigCard(template);
  await downloadCanvas(canvas, `${slug(template.name)}-${size}-card.png`);
}

function slug(s: string): string {
  return (
    (s || "npc")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "npc"
  );
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  return new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve();
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      resolve();
    }, "image/png");
  });
}

// ---------- Drawing primitives ----------

function chamferPath(
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
function thickRedBox(
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
function sectionTab(
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
// + black centered text. Returns the right edge x for placing the value next.
function reticleLabel(
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

function thinRule(
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

function wrap(
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
type Segment = { text: string; bold?: boolean };

function wrapSegments(
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

function drawSegmentLine(
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

function drawWrapped(
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

function makeStage(width: number, dpr = 2) {
  const c = document.createElement("canvas");
  c.width = width * dpr;
  c.height = 4000 * dpr;
  const ctx = c.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, width, 4000);
  return { canvas: c, ctx, width, dpr };
}

function crop(
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

// "solo: combat awareness 2" → "Solo: Combat Awareness 2"
// All-caps short tokens like "SMG" or "ROF2" are preserved as-is.
function titleCase(s: string): string {
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

// ---------- Small card ----------

export function drawSmallCard(template: EnemyTemplate): HTMLCanvasElement {
  const W = 500;
  const PAD = 14;
  const dpr = 2;
  const stage = makeStage(W, dpr);
  const ctx = stage.ctx;
  const innerW = W - 2 * PAD;
  let y = PAD;

  // --- Header row: name | HP/(DS) ---
  const headerH = 60;
  const hpW = 132;
  const gap = 6;
  const nameW = innerW - hpW - gap;
  thickRedBox(ctx, PAD, y, nameW, headerH, { tr: 18 });
  ctx.fillStyle = BLACK;
  ctx.font = `700 26px ${FONT_HEADER}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(
    (template.name || "(unnamed)").toUpperCase(),
    PAD + 16,
    y + headerH / 2 + 1,
  );

  const hpX = PAD + nameW + gap;
  thickRedBox(ctx, hpX, y, hpW, headerH, { tr: 12 });
  // Stacked "HP / (DS)" label on left side
  ctx.fillStyle = BLACK;
  ctx.font = `700 11px ${FONT_HEADER}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("HP", hpX + 10, y + headerH / 2 - 9);
  ctx.fillText("(DS)", hpX + 10, y + headerH / 2 + 9);
  // Big stencil number
  ctx.fillStyle = BLACK;
  ctx.font = `400 26px ${FONT_STENCIL}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(
    `${maxHpFromStats(template.stats)}(${template.stats.body})`,
    hpX + hpW - 12,
    y + headerH / 2 + 2,
  );
  y += headerH + 6;

  // --- Role row ---
  const roleH = 38;
  thickRedBox(ctx, PAD, y, innerW, roleH, { tr: 12 });
  ctx.fillStyle = BLACK;
  ctx.font = `500 17px ${FONT_HEADER}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(
    titleCase(template.role || "—"),
    PAD + 16,
    y + roleH / 2 + 1,
  );
  y += roleH + 4;

  // --- Reputation small text right-aligned ---
  ctx.fillStyle = BLACK;
  ctx.font = `400 11px ${FONT_BODY}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText(
    `REPUTATION: ${template.reputation}`,
    W - PAD,
    y,
  );
  y += 18;

  // --- STATS section tab ---
  const tabH = 26;
  sectionTab(ctx, PAD, y, 96, tabH, "Stats");
  y += tabH + 8;

  // Top thin black border above stats row
  thinRule(ctx, PAD, y, innerW);
  y += 8;

  // Stats row: INIT | COOL | MOVE
  const statRow: { label: string; value: number }[] = [
    { label: "INIT", value: template.stats.ref },
    { label: "COOL", value: template.stats.cool },
    { label: "MOVE", value: template.stats.move },
  ];
  const statRowH = 38;
  const cellW = innerW / statRow.length;
  for (let i = 0; i < statRow.length; i++) {
    const cx = PAD + i * cellW;
    const lblW = 50;
    const lblH = 22;
    const lblY = y + (statRowH - lblH) / 2;
    reticleLabel(ctx, cx + 4, lblY, lblW, lblH, statRow[i].label);
    // Big stencil value
    ctx.fillStyle = BLACK;
    ctx.font = `400 26px ${FONT_STENCIL}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(
      String(statRow[i].value),
      cx + 4 + lblW + 8,
      y + statRowH / 2 + 2,
    );
  }
  y += statRowH + 6;

  // Bottom thin black border below stats row
  thinRule(ctx, PAD, y, innerW);
  y += 12;

  // --- IMPORTANT SKILL BASES section tab ---
  sectionTab(ctx, PAD, y, 220, tabH, "Important Skill Bases");
  y += tabH + 4;

  const skillsActive = template.skills.filter((s) => s.level > 0);
  ctx.font = `400 12px ${FONT_BODY}`;
  const skillsText = skillsActive.length
    ? skillsActive
        .map((s) => `${s.name} ${skillTotal(template.stats, s)}`)
        .join(" • ")
    : "—";
  const innerTextW = innerW - 24;
  const skillLines = wrap(ctx, skillsText, innerTextW);
  const skillBoxH = Math.max(38, skillLines.length * 16 + 18);
  thickRedBox(ctx, PAD, y, innerW, skillBoxH, { tr: BOX_CHAMFER });
  ctx.fillStyle = BLACK;
  drawWrapped(ctx, skillLines, PAD + 12, y + 10, 16);
  y += skillBoxH + 8;

  // --- ATTACKS section tab ---
  sectionTab(ctx, PAD, y, 100, tabH, "Attacks");
  y += tabH + 4;

  const dmgW = 76;
  const rowH = 34;
  const rowGap = 6;
  const attackNameW = innerW - dmgW - rowGap;
  if (template.weapons.length === 0) {
    ctx.fillStyle = FAINT;
    ctx.font = `400 12px ${FONT_BODY}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("(no weapons)", PAD + 6, y + 4);
    y += 22;
  }
  for (const w of template.weapons) {
    const cnum = weaponCombatNumber(template, w.weaponType);
    const cTag = cnum != null ? `  #${cnum}` : "";
    const left = `${titleCase(w.name || "—")} (ROF${w.rof})${cTag}`;
    thickRedBox(ctx, PAD, y, attackNameW, rowH, { tr: BOX_CHAMFER });
    ctx.fillStyle = BLACK;
    ctx.font = `700 16px ${FONT_HEADER}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(left, PAD + 14, y + rowH / 2 + 1);

    const dx = PAD + attackNameW + rowGap;
    thickRedBox(ctx, dx, y, dmgW, rowH, { tr: BOX_CHAMFER });
    ctx.fillStyle = BLACK;
    ctx.font = `400 22px ${FONT_STENCIL}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${w.damage}D6`, dx + dmgW / 2, y + rowH / 2 + 2);
    y += rowH + 6;
  }
  y += 4;

  // --- ARMOR section tab ---
  sectionTab(ctx, PAD, y, 196, tabH, "Armor (Head/Body)");
  y += tabH + 4;
  const spW = 76;
  const armorNameW = innerW - spW - rowGap;
  thickRedBox(ctx, PAD, y, armorNameW, rowH, { tr: BOX_CHAMFER });
  ctx.fillStyle = BLACK;
  ctx.font = `700 16px ${FONT_HEADER}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(
    `${titleCase(template.armor.head.name || "—")} / ${titleCase(template.armor.body.name || "—")}`,
    PAD + 14,
    y + rowH / 2 + 1,
  );
  const sx = PAD + armorNameW + rowGap;
  thickRedBox(ctx, sx, y, spW, rowH, { tr: BOX_CHAMFER });
  ctx.fillStyle = BLACK;
  ctx.font = `400 22px ${FONT_STENCIL}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    `${template.armor.head.sp}/${template.armor.body.sp}`,
    sx + spW / 2,
    y + rowH / 2 + 2,
  );
  y += rowH + 8;

  // --- IMPORTANT GEAR & CYBERWARE section tab ---
  sectionTab(ctx, PAD, y, 270, tabH, "Important Gear & Cyberware");
  y += tabH + 4;

  const gearItems: Segment[] = [];
  const all = [...template.gear, ...template.cyberware]
    .map((s) => s.trim())
    .filter(Boolean);
  for (let i = 0; i < all.length; i++) {
    const item = all[i];
    if (i > 0) gearItems.push({ text: " • " });
    // Detect a leading "Cash" / "Cash:" segment and bold it.
    const cashMatch = item.match(/^(Cash:?\s*)(.*)$/i);
    if (cashMatch) {
      gearItems.push({ text: cashMatch[1], bold: true });
      if (cashMatch[2]) gearItems.push({ text: cashMatch[2] });
    } else {
      gearItems.push({ text: item });
    }
  }
  if (!gearItems.length) gearItems.push({ text: "—" });

  const bodyFont = (bold: boolean) =>
    `${bold ? 700 : 400} 12px ${FONT_BODY}`;
  ctx.font = bodyFont(false);
  const gearLines = wrapSegments(ctx, gearItems, innerTextW, bodyFont);
  const gearBoxH = Math.max(38, gearLines.length * 16 + 18);
  thickRedBox(ctx, PAD, y, innerW, gearBoxH, { tr: BOX_CHAMFER });
  let ty = y + 10;
  for (const line of gearLines) {
    drawSegmentLine(ctx, line, PAD + 12, ty, bodyFont);
    ty += 16;
  }
  y += gearBoxH + PAD;

  return crop(stage.canvas, W, y, dpr);
}

// ---------- Big card (kept from previous redesign) ----------

export function drawBigCard(template: EnemyTemplate): HTMLCanvasElement {
  const W = 920;
  const PAD = 12;
  const dpr = 2;
  const stage = makeStage(W, dpr);
  const ctx = stage.ctx;
  const innerW = W - 2 * PAD;
  const maxHp = maxHpFromStats(template.stats);
  const seriouslyWounded = Math.ceil(maxHp / 2);
  let y = PAD;

  // --- Header rows ---
  const rowH = 36;
  const gap = 4;
  const hpW = 76;
  const repW = 80;
  const swW = 200;
  const nameW = innerW - hpW - swW - repW - 3 * gap;

  // HP block: filled red, tall (spans both rows)
  const hpH = rowH * 2 + gap;
  const hpX = PAD + innerW - hpW;
  chamferPath(ctx, hpX, y, hpW, hpH, { tr: BOX_CHAMFER, bl: BOX_CHAMFER });
  ctx.fillStyle = RED;
  ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.font = `700 12px ${FONT_HEADER}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("HP", hpX + 8, y + 6);
  ctx.font = `400 36px ${FONT_STENCIL}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(String(maxHp), hpX + hpW - 10, y + hpH / 2 + 4);

  // Row 1 cells
  drawTagCell(ctx, PAD, y, nameW, rowH, "NAME", template.name || "—", "left", 18);
  let cellX = PAD + nameW + gap;
  drawTagCell(ctx, cellX, y, repW, rowH, "REP", String(template.reputation), "right", 22);
  cellX += repW + gap;
  drawTagCell(
    ctx,
    cellX,
    y,
    swW,
    rowH,
    "SERIOUSLY WOUNDED",
    String(seriouslyWounded),
    "right",
    22,
  );
  y += rowH + gap;

  // Row 2 cells
  drawTagCell(
    ctx,
    PAD,
    y,
    nameW,
    rowH,
    "ROLE",
    titleCase(template.role || "—"),
    "left",
    16,
  );
  drawTagCell(
    ctx,
    PAD + nameW + gap,
    y,
    repW + swW + gap,
    rowH,
    "DEATH SAVE",
    String(template.stats.body),
    "right",
    22,
  );
  y += rowH + 8;

  // --- STATS section ---
  const tabH = 24;
  sectionTab(ctx, PAD, y, 86, tabH, "Stats");
  y += tabH + 6;

  const statCellW = (innerW - 8 * gap) / 9;
  const statTagW = Math.min(48, statCellW * 0.45);
  const statH = 28;
  for (let i = 0; i < STAT_KEYS.length; i++) {
    const k = STAT_KEYS[i];
    const cx = PAD + i * (statCellW + gap);
    reticleLabel(ctx, cx, y + (statH - 22) / 2, statTagW, 22, k.toUpperCase());
    ctx.fillStyle = BLACK;
    ctx.font = `400 22px ${FONT_STENCIL}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(
      String(template.stats[k]),
      cx + statTagW + 6,
      y + statH / 2 + 2,
    );
  }
  y += statH + 10;

  // --- WEAPONS / ARMOR split ---
  const splitGap = 14;
  const leftW = Math.floor((innerW - splitGap) * 0.62);
  const rightW = innerW - splitGap - leftW;
  sectionTab(ctx, PAD, y, 110, tabH, "Weapons");
  sectionTab(ctx, PAD + leftW + splitGap, y, 100, tabH, "Armor");
  let lY = y + tabH + 6;
  let rY = y + tabH + 6;

  const wRowH = 32;
  const wDmgW = 64;
  const wRofW = 64;
  const wNameW = leftW - wDmgW - wRofW - 2 * gap;
  if (template.weapons.length === 0) {
    ctx.fillStyle = FAINT;
    ctx.font = `400 12px ${FONT_BODY}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("(no weapons)", PAD + 4, lY + 4);
    lY += 22;
  }
  for (const w of template.weapons) {
    const cnum = weaponCombatNumber(template, w.weaponType);
    const cTag = cnum != null ? ` (C#: ${cnum})` : "";
    const wLabel = `${titleCase(w.name || "—")}${cTag}`;
    thickRedBox(ctx, PAD, lY, wNameW, wRowH, { tr: BOX_CHAMFER });
    ctx.fillStyle = BLACK;
    ctx.font = `700 14px ${FONT_HEADER}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(wLabel, PAD + 12, lY + wRowH / 2 + 1);

    let bx = PAD + wNameW + gap;
    thickRedBox(ctx, bx, lY, wRofW, wRowH, { tr: BOX_CHAMFER });
    ctx.textAlign = "center";
    ctx.font = `400 18px ${FONT_STENCIL}`;
    ctx.fillText(`ROF${w.rof}`, bx + wRofW / 2, lY + wRowH / 2 + 2);
    bx += wRofW + gap;
    thickRedBox(ctx, bx, lY, wDmgW, wRowH, { tr: BOX_CHAMFER });
    ctx.fillText(`${w.damage}D6`, bx + wDmgW / 2, lY + wRowH / 2 + 2);
    lY += wRowH + 4;
  }

  // armor rows: HEAD then BODY
  const aSpW = 64;
  const aTagW = 36;
  const aNameW = rightW - aSpW - aTagW - 2 * gap;
  const armorRows: { label: string; name: string; sp: number }[] = [
    {
      label: "HEAD",
      name: template.armor.head.name || "—",
      sp: template.armor.head.sp,
    },
    {
      label: "BODY",
      name: template.armor.body.name || "—",
      sp: template.armor.body.sp,
    },
  ];
  for (const a of armorRows) {
    const ax = PAD + leftW + splitGap;
    chamferPath(ctx, ax, rY, aTagW, wRowH, { tr: BOX_CHAMFER });
    ctx.fillStyle = RED;
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.font = `700 11px ${FONT_HEADER}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(a.label, ax + aTagW / 2, rY + wRowH / 2 + 1);

    const nx = ax + aTagW + gap;
    thickRedBox(ctx, nx, rY, aNameW, wRowH, { tr: BOX_CHAMFER });
    ctx.fillStyle = BLACK;
    ctx.font = `700 14px ${FONT_HEADER}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(titleCase(a.name), nx + 12, rY + wRowH / 2 + 1);

    const sx2 = nx + aNameW + gap;
    thickRedBox(ctx, sx2, rY, aSpW, wRowH, { tr: BOX_CHAMFER });
    ctx.font = `400 18px ${FONT_STENCIL}`;
    ctx.textAlign = "center";
    ctx.fillText(`SP${a.sp}`, sx2 + aSpW / 2, rY + wRowH / 2 + 2);
    rY += wRowH + 4;
  }

  y = Math.max(lY, rY) + 6;

  // --- SKILL BASES ---
  sectionTab(ctx, PAD, y, 130, tabH, "Skill Bases");
  y += tabH + 4;
  const innerSkillW = innerW - 24;
  const allSkills = template.skills
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  ctx.font = `400 12px ${FONT_BODY}`;
  const skillsText = allSkills.length
    ? allSkills
        .map((s) => `${s.name} ${skillTotal(template.stats, s)}`)
        .join(" • ")
    : "—";
  const skillLines = wrap(ctx, skillsText, innerSkillW);
  const skillH = Math.max(36, skillLines.length * 16 + 14);
  thickRedBox(ctx, PAD, y, innerW, skillH, { tr: BOX_CHAMFER });
  ctx.fillStyle = BLACK;
  drawWrapped(ctx, skillLines, PAD + 12, y + 8, 16);
  y += skillH + 6;

  // --- GEAR ---
  sectionTab(ctx, PAD, y, 80, tabH, "Gear");
  y += tabH + 4;
  const gear = template.gear.map((s) => s.trim()).filter(Boolean);
  const gearText = gear.length ? gear.join(" • ") : "—";
  ctx.font = `400 12px ${FONT_BODY}`;
  const gearLines = wrap(ctx, gearText, innerSkillW);
  const gearH = Math.max(28, gearLines.length * 16 + 14);
  thickRedBox(ctx, PAD, y, innerW, gearH, { tr: BOX_CHAMFER });
  ctx.fillStyle = BLACK;
  drawWrapped(ctx, gearLines, PAD + 12, y + 8, 16);
  y += gearH + 6;

  // --- CYBERWARE ---
  sectionTab(ctx, PAD, y, 100, tabH, "Cyberware");
  y += tabH + 4;
  const cyber = template.cyberware.map((s) => s.trim()).filter(Boolean);
  const cyberText = cyber.length ? cyber.join(" • ") : "—";
  ctx.font = `400 12px ${FONT_BODY}`;
  const cyberLines = wrap(ctx, cyberText, innerSkillW);
  const cyberH = Math.max(28, cyberLines.length * 16 + 14);
  thickRedBox(ctx, PAD, y, innerW, cyberH, { tr: BOX_CHAMFER });
  ctx.fillStyle = BLACK;
  drawWrapped(ctx, cyberLines, PAD + 12, y + 8, 16);
  y += cyberH + PAD;

  return crop(stage.canvas, W, y, dpr);
}

function drawTagCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  align: "left" | "right",
  valueSize: number,
) {
  thickRedBox(ctx, x, y, w, h, { tr: BOX_CHAMFER });
  const tagW = Math.max(40, ctx.measureText(label).width + 16);
  chamferPath(ctx, x, y, tagW, 16, { tr: 8 });
  ctx.fillStyle = RED;
  ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.font = `700 9px ${FONT_HEADER}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + 6, y + 9);
  ctx.fillStyle = BLACK;
  ctx.font = `400 ${valueSize}px ${FONT_STENCIL}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  const valueX = align === "right" ? x + w - 10 : x + 8;
  ctx.fillText(value, valueX, y + 16 + (h - 16) / 2 + 1);
}
