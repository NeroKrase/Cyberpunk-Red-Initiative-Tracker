import type { EnemyTemplate } from "./types";
import {
  STAT_KEYS,
  maxHpFromStats,
  skillTotal,
  weaponCombatNumber,
} from "./types";

const RED = "#c8102e";
const BLACK = "#111";
const WHITE = "#fff";
const FAINT = "#7a7a7a";
const FONT = '"Rajdhani", system-ui, sans-serif';

const NOTCH = 6;
const STROKE = 2;

export type CardSize = "small" | "big";

type Sides = {
  tl?: boolean;
  tr?: boolean;
  br?: boolean;
  bl?: boolean;
};

const NOTCH_TR_BL: Sides = { tr: true, bl: true };
const NOTCH_TR: Sides = { tr: true };
const NOTCH_ALL: Sides = { tl: true, tr: true, br: true, bl: true };

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

function notchPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  sides: Sides,
  notch = NOTCH,
) {
  const n = Math.min(notch, w / 3, h / 3);
  ctx.beginPath();
  if (sides.tl) {
    ctx.moveTo(x, y + n);
    ctx.lineTo(x + n, y);
  } else {
    ctx.moveTo(x, y);
  }
  if (sides.tr) {
    ctx.lineTo(x + w - n, y);
    ctx.lineTo(x + w, y + n);
  } else {
    ctx.lineTo(x + w, y);
  }
  if (sides.br) {
    ctx.lineTo(x + w, y + h - n);
    ctx.lineTo(x + w - n, y + h);
  } else {
    ctx.lineTo(x + w, y + h);
  }
  if (sides.bl) {
    ctx.lineTo(x + n, y + h);
    ctx.lineTo(x, y + h - n);
  } else {
    ctx.lineTo(x, y + h);
  }
  ctx.closePath();
}

function notchedBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  sides: Sides = NOTCH_TR_BL,
  fill?: string,
) {
  notchPath(ctx, x, y, w, h, sides);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.lineWidth = STROKE;
  ctx.strokeStyle = RED;
  ctx.stroke();
}

// Red banner with a stepped/notched right tail.
function flagBanner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
) {
  const tail = h * 0.55;
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w + tail, y + h / 2);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.font = `800 13px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label.toUpperCase(), x + 10, y + h / 2 + 1);
}

// Small label tag (white-filled, red bordered, red text). Used for COM#, INIT, etc.
function labelTag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  fontSize = 11,
) {
  notchedBox(ctx, x, y, w, h, NOTCH_TR_BL, WHITE);
  ctx.fillStyle = RED;
  ctx.font = `800 ${fontSize}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label.toUpperCase(), x + w / 2, y + h / 2 + 1);
}

// Returns next x after drawing label-tag + value.
function tagAndValue(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tagW: number,
  tagH: number,
  label: string,
  value: string,
  valueGap = 6,
  valueFontSize = 26,
): number {
  labelTag(ctx, x, y, tagW, tagH, label);
  ctx.fillStyle = BLACK;
  ctx.font = `800 ${valueFontSize}px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(value, x + tagW + valueGap, y + tagH / 2 + 1);
  return x + tagW + valueGap + ctx.measureText(value).width;
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

// ---------- Small card ----------

export function drawSmallCard(template: EnemyTemplate): HTMLCanvasElement {
  const W = 480;
  const PAD = 10;
  const dpr = 2;
  const stage = makeStage(W, dpr);
  const ctx = stage.ctx;
  const innerW = W - 2 * PAD;
  let y = PAD;

  // --- Header row: name + HP(DS) ---
  const headerH = 54;
  const hpW = 96;
  const nameW = innerW - hpW - 6;
  notchedBox(ctx, PAD, y, nameW, headerH, NOTCH_TR_BL);
  ctx.fillStyle = BLACK;
  ctx.font = `800 22px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(
    (template.name || "(unnamed)").toUpperCase(),
    PAD + 14,
    y + headerH / 2 + 1,
  );

  // HP(DS) box: small red-filled "HP(DS)" tag + big black number below
  const hpX = PAD + nameW + 6;
  const hpTagH = 18;
  notchedBox(ctx, hpX, y, hpW, headerH, NOTCH_TR_BL);
  // red-filled HP(DS) label
  ctx.save();
  notchPath(ctx, hpX + 4, y + 4, 38, hpTagH, NOTCH_TR);
  ctx.clip();
  ctx.fillStyle = RED;
  ctx.fillRect(hpX, y, 50, hpTagH + 6);
  ctx.restore();
  ctx.fillStyle = WHITE;
  ctx.font = `800 9px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("HP", hpX + 8, y + 8);
  ctx.fillText("(DS)", hpX + 8, y + 18);
  ctx.fillStyle = BLACK;
  ctx.font = `800 22px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText(
    `${maxHpFromStats(template.stats)}(${template.stats.body})`,
    hpX + hpW - 8,
    y + headerH / 2 + 4,
  );
  y += headerH + 4;

  // --- Role row ---
  const roleH = 30;
  notchedBox(ctx, PAD, y, innerW, roleH, NOTCH_TR_BL);
  ctx.fillStyle = BLACK;
  ctx.font = `700 15px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(
    titleCase(template.role || "—"),
    PAD + 14,
    y + roleH / 2 + 1,
  );
  y += roleH + 8;

  // --- STATS flag + REPUTATION right ---
  const flagH = 22;
  flagBanner(ctx, PAD, y, 70, flagH, "Stats");
  ctx.fillStyle = BLACK;
  ctx.font = `700 11px ${FONT}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(
    `REPUTATION: ${template.reputation}`,
    W - PAD,
    y + flagH / 2,
  );
  y += flagH + 6;

  // --- Stats row: COM# / INIT / COOL / MOVE ---
  // Spec says: skip COM# on small card; show INIT/COOL/MOVE.
  // Example image shows COM# too — keep it for visual fidelity, but it's
  // displayed as a derived combat number from REF.
  const statRow = [
    { label: "COM #", value: template.stats.ref },
    { label: "INIT", value: template.stats.ref },
    { label: "COOL", value: template.stats.cool },
    { label: "MOVE", value: template.stats.move },
  ];
  const cellW = innerW / 4;
  for (let i = 0; i < statRow.length; i++) {
    const cx = PAD + i * cellW;
    const tagW = i === 0 ? 56 : 46;
    const tagH = 22;
    tagAndValue(
      ctx,
      cx,
      y,
      tagW,
      tagH,
      statRow[i].label,
      String(statRow[i].value),
      6,
      24,
    );
  }
  y += 32;

  // --- IMPORTANT SKILL BASES ---
  flagBanner(ctx, PAD, y, 200, flagH, "Important Skill Bases");
  y += flagH + 4;
  const skillsActive = template.skills.filter((s) => s.level > 0);
  ctx.font = `400 12px ${FONT}`;
  const skillsText = skillsActive.length
    ? skillsActive
        .map((s) => `${s.name} ${skillTotal(template.stats, s)}`)
        .join(" · ")
    : "—";
  const innerBoxW = innerW;
  const innerTextW = innerBoxW - 24;
  const skillLines = wrap(ctx, skillsText, innerTextW);
  const skillH = Math.max(36, skillLines.length * 16 + 14);
  notchedBox(ctx, PAD, y, innerBoxW, skillH, NOTCH_TR_BL);
  ctx.fillStyle = BLACK;
  drawWrapped(ctx, skillLines, PAD + 12, y + 8, 16);
  y += skillH + 8;

  // --- ATTACKS ---
  flagBanner(ctx, PAD, y, 88, flagH, "Attacks");
  y += flagH + 4;
  const dmgW = 70;
  const rowH = 30;
  const attackNameW = innerW - dmgW - 6;
  if (template.weapons.length === 0) {
    ctx.fillStyle = FAINT;
    ctx.font = `400 12px ${FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("(no weapons)", PAD + 8, y + 4);
    y += 22;
  }
  for (const w of template.weapons) {
    const cnum = weaponCombatNumber(template, w.weaponType);
    const cTag = cnum != null ? `  #${cnum}` : "";
    const left = `${titleCase(w.name || "—")} (ROF${w.rof})${cTag}`;
    notchedBox(ctx, PAD, y, attackNameW, rowH, NOTCH_TR_BL);
    ctx.fillStyle = BLACK;
    ctx.font = `700 14px ${FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(left, PAD + 12, y + rowH / 2 + 1);

    const dx = PAD + attackNameW + 6;
    notchedBox(ctx, dx, y, dmgW, rowH, NOTCH_TR_BL);
    ctx.font = `800 17px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(
      `${w.damage}D6`,
      dx + dmgW / 2,
      y + rowH / 2 + 1,
    );
    y += rowH + 4;
  }
  y += 4;

  // --- ARMOR (HEAD/BODY) ---
  flagBanner(ctx, PAD, y, 170, flagH, "Armor (Head/Body)");
  y += flagH + 4;
  const spW = 70;
  const armorNameW = innerW - spW - 6;
  notchedBox(ctx, PAD, y, armorNameW, rowH, NOTCH_TR_BL);
  ctx.fillStyle = BLACK;
  ctx.font = `700 14px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(
    `${titleCase(template.armor.head.name || "—")} / ${titleCase(template.armor.body.name || "—")}`,
    PAD + 12,
    y + rowH / 2 + 1,
  );
  const sx = PAD + armorNameW + 6;
  notchedBox(ctx, sx, y, spW, rowH, NOTCH_TR_BL);
  ctx.font = `800 17px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(
    `${template.armor.head.sp}/${template.armor.body.sp}`,
    sx + spW / 2,
    y + rowH / 2 + 1,
  );
  y += rowH + 8;

  // --- IMPORTANT GEAR & CYBERWARE ---
  flagBanner(ctx, PAD, y, 240, flagH, "Important Gear & Cyberware");
  y += flagH + 4;
  const gearItems = [...template.gear, ...template.cyberware]
    .map((s) => s.trim())
    .filter(Boolean);
  ctx.font = `400 12px ${FONT}`;
  const gearText = gearItems.length ? gearItems.join(" · ") : "—";
  const gearLines = wrap(ctx, gearText, innerTextW);
  const gearH = Math.max(36, gearLines.length * 16 + 14);
  notchedBox(ctx, PAD, y, innerW, gearH, NOTCH_TR_BL);
  ctx.fillStyle = BLACK;
  drawWrapped(ctx, gearLines, PAD + 12, y + 8, 16);
  y += gearH + PAD;

  return crop(stage.canvas, W, y, dpr);
}

// ---------- Big card ----------

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

  // Compute: NAME(...) | REP(small) | SERIOUSLY WOUNDED(med) | HP(small, tall)
  const repW = 80;
  const swW = 200;
  const nameW = innerW - hpW - swW - repW - 3 * gap;

  // HP block: filled red, tall (spans both rows)
  const hpH = rowH * 2 + gap;
  const hpX = PAD + innerW - hpW;
  notchPath(ctx, hpX, y, hpW, hpH, NOTCH_TR_BL);
  ctx.fillStyle = RED;
  ctx.fill();
  ctx.lineWidth = STROKE;
  ctx.strokeStyle = RED;
  ctx.stroke();
  ctx.fillStyle = WHITE;
  ctx.font = `800 12px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("HP", hpX + 8, y + 6);
  ctx.font = `900 36px ${FONT}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(String(maxHp), hpX + hpW - 10, y + hpH / 2 + 2);

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

  // Row 2 cells (HP continues from row 1)
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

  // --- STATS row (no banner; just labelled tags inline) ---
  const flagH = 22;
  flagBanner(ctx, PAD, y, 80, flagH, "Stats");
  y += flagH + 4;

  const statCellW = (innerW - 8 * gap) / 9;
  const statTagW = Math.min(48, statCellW * 0.45);
  const statH = 28;
  for (let i = 0; i < STAT_KEYS.length; i++) {
    const k = STAT_KEYS[i];
    const cx = PAD + i * (statCellW + gap);
    tagAndValue(
      ctx,
      cx,
      y,
      statTagW,
      statH,
      k.toUpperCase(),
      String(template.stats[k]),
      6,
      22,
    );
  }
  y += statH + 10;

  // --- WEAPONS / ARMOR split ---
  const splitGap = 14;
  const leftW = Math.floor((innerW - splitGap) * 0.62);
  const rightW = innerW - splitGap - leftW;
  flagBanner(ctx, PAD, y, 110, flagH, "Weapons");
  flagBanner(ctx, PAD + leftW + splitGap, y, 100, flagH, "Armor");
  let lY = y + flagH + 4;
  let rY = y + flagH + 4;

  // weapon rows
  const wRowH = 32;
  const wDmgW = 64;
  const wRofW = 64;
  const wNameW = leftW - wDmgW - wRofW - 2 * gap;
  if (template.weapons.length === 0) {
    ctx.fillStyle = FAINT;
    ctx.font = `400 12px ${FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("(no weapons)", PAD + 4, lY + 4);
    lY += 22;
  }
  for (const w of template.weapons) {
    const cnum = weaponCombatNumber(template, w.weaponType);
    const cTag = cnum != null ? ` (C#: ${cnum})` : "";
    const wLabel = `${titleCase(w.name || "—")}${cTag}`;
    notchedBox(ctx, PAD, lY, wNameW, wRowH, NOTCH_TR_BL);
    ctx.fillStyle = BLACK;
    ctx.font = `700 14px ${FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(wLabel, PAD + 12, lY + wRowH / 2 + 1);

    let bx = PAD + wNameW + gap;
    notchedBox(ctx, bx, lY, wRofW, wRowH, NOTCH_TR_BL);
    ctx.textAlign = "center";
    ctx.font = `800 15px ${FONT}`;
    ctx.fillText(`ROF${w.rof}`, bx + wRofW / 2, lY + wRowH / 2 + 1);
    bx += wRofW + gap;
    notchedBox(ctx, bx, lY, wDmgW, wRowH, NOTCH_TR_BL);
    ctx.fillText(`${w.damage}D6`, bx + wDmgW / 2, lY + wRowH / 2 + 1);
    lY += wRowH + 4;
  }

  // armor rows: HEAD then BODY, with small "HEAD"/"BODY" red tag prefix
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
    // small label tag (filled red, white text)
    notchPath(ctx, ax, rY, aTagW, wRowH, NOTCH_TR_BL);
    ctx.fillStyle = RED;
    ctx.fill();
    ctx.lineWidth = STROKE;
    ctx.strokeStyle = RED;
    ctx.stroke();
    ctx.fillStyle = WHITE;
    ctx.font = `800 11px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(a.label, ax + aTagW / 2, rY + wRowH / 2 + 1);

    const nx = ax + aTagW + gap;
    notchedBox(ctx, nx, rY, aNameW, wRowH, NOTCH_TR_BL);
    ctx.fillStyle = BLACK;
    ctx.font = `700 14px ${FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(titleCase(a.name), nx + 12, rY + wRowH / 2 + 1);

    const sx2 = nx + aNameW + gap;
    notchedBox(ctx, sx2, rY, aSpW, wRowH, NOTCH_TR_BL);
    ctx.font = `800 15px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(`SP${a.sp}`, sx2 + aSpW / 2, rY + wRowH / 2 + 1);
    rY += wRowH + 4;
  }

  y = Math.max(lY, rY) + 6;

  // --- SKILL BASES ---
  flagBanner(ctx, PAD, y, 130, flagH, "Skill Bases");
  y += flagH + 4;
  const innerSkillW = innerW - 24;
  const allSkills = template.skills
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  ctx.font = `400 12px ${FONT}`;
  const skillsText = allSkills.length
    ? allSkills
        .map((s) => `${s.name} ${skillTotal(template.stats, s)}`)
        .join(" · ")
    : "—";
  const skillLines = wrap(ctx, skillsText, innerSkillW);
  const skillH = Math.max(36, skillLines.length * 16 + 14);
  notchedBox(ctx, PAD, y, innerW, skillH, NOTCH_TR_BL);
  ctx.fillStyle = BLACK;
  drawWrapped(ctx, skillLines, PAD + 12, y + 8, 16);
  y += skillH + 6;

  // --- GEAR ---
  flagBanner(ctx, PAD, y, 80, flagH, "Gear");
  y += flagH + 4;
  const gear = template.gear.map((s) => s.trim()).filter(Boolean);
  const gearText = gear.length ? gear.join(" · ") : "—";
  ctx.font = `400 12px ${FONT}`;
  const gearLines = wrap(ctx, gearText, innerSkillW);
  const gearH = Math.max(28, gearLines.length * 16 + 14);
  notchedBox(ctx, PAD, y, innerW, gearH, NOTCH_TR_BL);
  ctx.fillStyle = BLACK;
  drawWrapped(ctx, gearLines, PAD + 12, y + 8, 16);
  y += gearH + 6;

  // --- CYBERWARE ---
  flagBanner(ctx, PAD, y, 100, flagH, "Cyberware");
  y += flagH + 4;
  const cyber = template.cyberware.map((s) => s.trim()).filter(Boolean);
  const cyberText = cyber.length ? cyber.join(" · ") : "—";
  ctx.font = `400 12px ${FONT}`;
  const cyberLines = wrap(ctx, cyberText, innerSkillW);
  const cyberH = Math.max(28, cyberLines.length * 16 + 14);
  notchedBox(ctx, PAD, y, innerW, cyberH, NOTCH_TR_BL);
  ctx.fillStyle = BLACK;
  drawWrapped(ctx, cyberLines, PAD + 12, y + 8, 16);
  y += cyberH + PAD;

  return crop(stage.canvas, W, y, dpr);
}

// Small label-prefix cell used in big-card identity rows.
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
  notchedBox(ctx, x, y, w, h, NOTCH_TR_BL);
  // small red filled tag at top-left
  const tagW = Math.max(40, ctx.measureText(label).width + 16);
  notchPath(ctx, x, y, tagW, 16, NOTCH_TR);
  ctx.fillStyle = RED;
  ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.font = `800 9px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + 6, y + 9);
  // value
  ctx.fillStyle = BLACK;
  ctx.font = `800 ${valueSize}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  const valueX = align === "right" ? x + w - 10 : x + 8;
  ctx.fillText(value, valueX, y + 16 + (h - 16) / 2 + 1);
}

// "solo: combat awareness 2" → "Solo: Combat Awareness 2"
// All-caps short tokens like "SMG" or "ROF2" are preserved as-is.
function titleCase(s: string): string {
  return s
    .split(/(\s+|:)/)
    .map((part) => {
      if (!part || part === ":" || /^\s+$/.test(part)) return part;
      // Keep all-caps short tokens (acronyms, abbreviations).
      if (part === part.toUpperCase() && /[A-Z]/.test(part) && part.length <= 5) {
        return part;
      }
      return part[0].toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");
}
