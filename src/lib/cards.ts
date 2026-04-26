import type { EnemyStatBlock, EnemyTemplate } from "./types";
import {
  STAT_KEYS,
  maxHpFromStats,
  skillTotal,
  weaponCombatNumber,
} from "./types";

const RED = "#c8102e";
const BLACK = "#000";
const WHITE = "#fff";
const FAINT = "#888";
const FONT = '"Rajdhani", system-ui, sans-serif';

export type CardSize = "small" | "big";

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

function box(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.lineWidth = 2;
  ctx.strokeStyle = RED;
  ctx.strokeRect(x, y, w, h);
}

function banner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
) {
  ctx.fillStyle = RED;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = WHITE;
  ctx.font = `700 11px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + 8, y + h / 2 + 1);
}

function labelBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  opts: { valueAlign?: CanvasTextAlign; valueFont?: string } = {},
) {
  box(ctx, x, y, w, h);
  ctx.fillStyle = RED;
  ctx.fillRect(x + 1, y + 1, w - 2, 16);
  ctx.fillStyle = WHITE;
  ctx.font = `700 9px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + 6, y + 9);
  ctx.fillStyle = BLACK;
  ctx.font = opts.valueFont ?? `700 16px ${FONT}`;
  ctx.textAlign = opts.valueAlign ?? "right";
  ctx.textBaseline = "middle";
  const valueX =
    (opts.valueAlign ?? "right") === "right" ? x + w - 8 : x + 8;
  ctx.fillText(value, valueX, y + 17 + (h - 17) / 2 + 1);
}

function statBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: number,
) {
  labelBox(ctx, x, y, w, h, label, String(value));
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
  const PAD = 12;
  const dpr = 2;
  const stage = makeStage(W, dpr);
  const ctx = stage.ctx;
  let y = PAD;

  // --- Header: NAME | HP(DS) ---
  const headerH = 56;
  const hpW = 110;
  const nameW = W - 2 * PAD - hpW - 6;
  box(ctx, PAD, y, nameW, headerH);
  ctx.fillStyle = BLACK;
  ctx.font = `700 18px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const nameText = (template.name || "(unnamed)").toUpperCase();
  ctx.fillText(nameText, PAD + 12, y + headerH / 2);

  const hpX = PAD + nameW + 6;
  box(ctx, hpX, y, hpW, headerH);
  ctx.fillStyle = RED;
  ctx.fillRect(hpX + 1, y + 1, hpW - 2, 16);
  ctx.fillStyle = WHITE;
  ctx.font = `700 10px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("HP (DS)", hpX + hpW / 2, y + 9);
  ctx.fillStyle = BLACK;
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText(
    `${maxHpFromStats(template.stats)}(${template.stats.body})`,
    hpX + hpW / 2,
    y + 38,
  );
  y += headerH + 6;

  // --- Role row ---
  if (template.role) {
    const roleH = 30;
    box(ctx, PAD, y, W - 2 * PAD, roleH);
    ctx.fillStyle = BLACK;
    ctx.font = `700 14px ${FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(template.role.toUpperCase(), PAD + 12, y + roleH / 2);
    y += roleH + 6;
  }

  // --- STATS banner + REPUTATION ---
  const bannerH = 22;
  banner(ctx, PAD, y, 90, bannerH, "STATS");
  ctx.fillStyle = BLACK;
  ctx.font = `700 11px ${FONT}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(
    `REPUTATION: ${template.reputation}`,
    W - PAD - 4,
    y + bannerH / 2,
  );
  y += bannerH + 6;

  // --- Stats row: INIT / COOL / MOVE ---
  const sRow: { label: string; value: number }[] = [
    { label: "INIT", value: template.stats.ref },
    { label: "COOL", value: template.stats.cool },
    { label: "MOVE", value: template.stats.move },
  ];
  const sBoxW = (W - 2 * PAD - 2 * 6) / 3;
  const sBoxH = 38;
  for (let i = 0; i < sRow.length; i++) {
    statBox(
      ctx,
      PAD + i * (sBoxW + 6),
      y,
      sBoxW,
      sBoxH,
      sRow[i].label,
      sRow[i].value,
    );
  }
  y += sBoxH + 8;

  // --- Skill bases ---
  banner(ctx, PAD, y, W - 2 * PAD, bannerH, "IMPORTANT SKILL BASES");
  y += bannerH;
  const innerW = W - 2 * PAD - 16;
  const skillsActive = template.skills.filter((s) => s.level > 0);
  ctx.font = `400 12px ${FONT}`;
  const skillsText = skillsActive.length
    ? skillsActive
        .map((s) => `${s.name} ${skillTotal(template.stats, s)}`)
        .join(" · ")
    : "—";
  const skillLines = wrap(ctx, skillsText, innerW);
  const skillH = Math.max(36, skillLines.length * 16 + 14);
  box(ctx, PAD, y, W - 2 * PAD, skillH);
  ctx.fillStyle = BLACK;
  drawWrapped(ctx, skillLines, PAD + 8, y + 8, 16);
  y += skillH + 6;

  // --- Attacks ---
  banner(ctx, PAD, y, W - 2 * PAD, bannerH, "ATTACKS");
  y += bannerH + 4;
  const dmgW = 70;
  const rowH = 30;
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
    const left = `${(w.name || "—").toUpperCase()} (ROF${w.rof})${cTag}`;
    const leftW = W - 2 * PAD - dmgW - 6;
    box(ctx, PAD, y, leftW, rowH);
    ctx.fillStyle = BLACK;
    ctx.font = `700 12px ${FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(left, PAD + 10, y + rowH / 2);

    const dx = PAD + leftW + 6;
    box(ctx, dx, y, dmgW, rowH);
    ctx.font = `700 16px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(`${w.damage}D6`, dx + dmgW / 2, y + rowH / 2);
    y += rowH + 4;
  }
  y += 4;

  // --- Armor ---
  banner(ctx, PAD, y, W - 2 * PAD, bannerH, "ARMOR (HEAD/BODY)");
  y += bannerH + 4;
  const spW = 70;
  const armorNameW = W - 2 * PAD - spW - 6;
  box(ctx, PAD, y, armorNameW, rowH);
  ctx.fillStyle = BLACK;
  ctx.font = `700 12px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const armorName = `${template.armor.head.name || "—"} / ${
    template.armor.body.name || "—"
  }`;
  ctx.fillText(armorName.toUpperCase(), PAD + 10, y + rowH / 2);
  const sx = PAD + armorNameW + 6;
  box(ctx, sx, y, spW, rowH);
  ctx.font = `700 16px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(
    `${template.armor.head.sp}/${template.armor.body.sp}`,
    sx + spW / 2,
    y + rowH / 2,
  );
  y += rowH + 8;

  // --- Gear & Cyberware ---
  banner(ctx, PAD, y, W - 2 * PAD, bannerH, "IMPORTANT GEAR & CYBERWARE");
  y += bannerH;
  const gearItems = [...template.gear, ...template.cyberware]
    .map((s) => s.trim())
    .filter(Boolean);
  ctx.font = `400 12px ${FONT}`;
  const gearText = gearItems.length ? gearItems.join(" · ") : "—";
  const gearLines = wrap(ctx, gearText, innerW);
  const gearH = Math.max(36, gearLines.length * 16 + 14);
  box(ctx, PAD, y, W - 2 * PAD, gearH);
  ctx.fillStyle = BLACK;
  drawWrapped(ctx, gearLines, PAD + 8, y + 8, 16);
  y += gearH + PAD;

  return crop(stage.canvas, W, y, dpr);
}

// ---------- Big card ----------

export function drawBigCard(template: EnemyTemplate): HTMLCanvasElement {
  const W = 960;
  const PAD = 14;
  const dpr = 2;
  const stage = makeStage(W, dpr);
  const ctx = stage.ctx;
  let y = PAD;

  const innerW = W - 2 * PAD;
  const maxHp = maxHpFromStats(template.stats);
  const seriouslyWounded = Math.ceil(maxHp / 2);

  // --- Header rows ---
  const idH = 38;
  // Row 1: NAME | REP | SERIOUSLY WOUNDED | HP
  const hpW = 90;
  const swW = 200;
  const repW = 90;
  const nameW = innerW - hpW - swW - repW - 3 * 6;

  labelBox(ctx, PAD, y, nameW, idH, "NAME", template.name.toUpperCase() || "—", {
    valueAlign: "left",
    valueFont: `700 18px ${FONT}`,
  });
  let rx = PAD + nameW + 6;
  labelBox(ctx, rx, y, repW, idH, "REP", String(template.reputation));
  rx += repW + 6;
  labelBox(ctx, rx, y, swW, idH, "SERIOUSLY WOUNDED", String(seriouslyWounded));
  rx += swW + 6;
  // HP box (tall, spans both rows)
  box(ctx, rx, y, hpW, idH * 2 + 6);
  ctx.fillStyle = RED;
  ctx.fillRect(rx + 1, y + 1, hpW - 2, 18);
  ctx.fillStyle = WHITE;
  ctx.font = `700 11px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("HP", rx + hpW / 2, y + 10);
  ctx.fillStyle = BLACK;
  ctx.font = `700 32px ${FONT}`;
  ctx.fillText(String(maxHp), rx + hpW / 2, y + 18 + (idH * 2 + 6 - 18) / 2);

  y += idH + 6;

  // Row 2: ROLE | DEATH SAVE
  const dsW = swW + repW + 6;
  labelBox(ctx, PAD, y, nameW, idH, "ROLE", (template.role || "—").toUpperCase(), {
    valueAlign: "left",
    valueFont: `700 16px ${FONT}`,
  });
  labelBox(
    ctx,
    PAD + nameW + 6,
    y,
    dsW,
    idH,
    "DEATH SAVE",
    String(template.stats.body),
  );
  y += idH + 8;

  // --- Stats row (9 stats) ---
  const stats9Gap = 4;
  const stats9W = (innerW - 8 * stats9Gap) / 9;
  const stats9H = 42;
  for (let i = 0; i < STAT_KEYS.length; i++) {
    const k = STAT_KEYS[i];
    statBox(
      ctx,
      PAD + i * (stats9W + stats9Gap),
      y,
      stats9W,
      stats9H,
      k.toUpperCase(),
      template.stats[k],
    );
  }
  y += stats9H + 10;

  // --- WEAPONS / ARMOR split ---
  const bannerH = 22;
  const splitGap = 14;
  const leftW = Math.floor((innerW - splitGap) * 0.62);
  const rightW = innerW - splitGap - leftW;
  banner(ctx, PAD, y, leftW, bannerH, "WEAPONS");
  banner(ctx, PAD + leftW + splitGap, y, rightW, bannerH, "ARMOR");
  let lY = y + bannerH + 4;
  let rY = y + bannerH + 4;

  // weapons rows
  const wRowH = 30;
  const wDmgW = 70;
  const wRofW = 70;
  const wNameW = leftW - wDmgW - wRofW - 12;
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
    const wLabel = `${(w.name || "—").toUpperCase()}${cTag}`;
    box(ctx, PAD, lY, wNameW, wRowH);
    ctx.fillStyle = BLACK;
    ctx.font = `700 13px ${FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(wLabel, PAD + 10, lY + wRowH / 2);

    let bx = PAD + wNameW + 6;
    box(ctx, bx, lY, wRofW, wRowH);
    ctx.textAlign = "center";
    ctx.font = `700 14px ${FONT}`;
    ctx.fillText(`ROF${w.rof}`, bx + wRofW / 2, lY + wRowH / 2);
    bx += wRofW + 6;
    box(ctx, bx, lY, wDmgW, wRowH);
    ctx.fillText(`${w.damage}D6`, bx + wDmgW / 2, lY + wRowH / 2);
    lY += wRowH + 4;
  }

  // armor rows (Head, then Body)
  const aSpW = 70;
  const aNameW = rightW - aSpW - 6;
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
    box(ctx, ax, rY, aNameW, wRowH);
    // tiny corner label
    ctx.fillStyle = RED;
    ctx.font = `700 9px ${FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(a.label, ax + 6, rY + 4);
    ctx.fillStyle = BLACK;
    ctx.font = `700 13px ${FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(a.name.toUpperCase(), ax + 36, rY + wRowH / 2);

    const sx2 = ax + aNameW + 6;
    box(ctx, sx2, rY, aSpW, wRowH);
    ctx.font = `700 14px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(`SP${a.sp}`, sx2 + aSpW / 2, rY + wRowH / 2);
    rY += wRowH + 4;
  }

  y = Math.max(lY, rY) + 6;

  // --- SKILL BASES ---
  banner(ctx, PAD, y, innerW, bannerH, "SKILL BASES");
  y += bannerH;
  ctx.font = `400 12px ${FONT}`;
  const innerSkillW = innerW - 16;
  const allSkills = template.skills.slice().sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const skillsText = allSkills.length
    ? allSkills
        .map((s) => `${s.name} ${skillTotal(template.stats, s)}`)
        .join(" · ")
    : "—";
  const skillLines = wrap(ctx, skillsText, innerSkillW);
  const skillH = Math.max(36, skillLines.length * 16 + 14);
  box(ctx, PAD, y, innerW, skillH);
  ctx.fillStyle = BLACK;
  drawWrapped(ctx, skillLines, PAD + 8, y + 8, 16);
  y += skillH + 6;

  // --- GEAR ---
  banner(ctx, PAD, y, innerW, bannerH, "GEAR");
  y += bannerH;
  const gear = template.gear.map((s) => s.trim()).filter(Boolean);
  const gearText = gear.length ? gear.join(" · ") : "—";
  ctx.font = `400 12px ${FONT}`;
  const gearLines = wrap(ctx, gearText, innerSkillW);
  const gearH = Math.max(28, gearLines.length * 16 + 14);
  box(ctx, PAD, y, innerW, gearH);
  ctx.fillStyle = BLACK;
  drawWrapped(ctx, gearLines, PAD + 8, y + 8, 16);
  y += gearH + 6;

  // --- CYBERWARE ---
  banner(ctx, PAD, y, innerW, bannerH, "CYBERWARE");
  y += bannerH;
  const cyber = template.cyberware.map((s) => s.trim()).filter(Boolean);
  const cyberText = cyber.length ? cyber.join(" · ") : "—";
  ctx.font = `400 12px ${FONT}`;
  const cyberLines = wrap(ctx, cyberText, innerSkillW);
  const cyberH = Math.max(28, cyberLines.length * 16 + 14);
  box(ctx, PAD, y, innerW, cyberH);
  ctx.fillStyle = BLACK;
  drawWrapped(ctx, cyberLines, PAD + 8, y + 8, 16);
  y += cyberH + PAD;

  return crop(stage.canvas, W, y, dpr);
}

// Re-export helpers used by the unused-tree-shake friendly check
export type { EnemyStatBlock };
