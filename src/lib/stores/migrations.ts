import { MELEE_WEAPON_TYPES, emptyStats } from "../types";

const MELEE_TYPE_NAMES = new Set<string>(MELEE_WEAPON_TYPES);

export type LegacyData = {
  sessions: unknown[];
  templates: unknown[];
  weaponTemplates: unknown[];
};

export function migrate(data: LegacyData) {
  for (const session of data.sessions as Record<string, unknown>[]) {
    for (const encounter of session.encounters as Record<string, unknown>[]) {
      for (const raw of encounter.combatants as unknown[]) {
        migrateCombatant(raw as Record<string, unknown>);
      }
    }
  }
  for (const raw of data.templates) {
    migrateStatBlock(raw as Record<string, unknown>);
  }
  for (const raw of data.weaponTemplates) {
    migrateWeaponTemplate(raw as Record<string, unknown>);
  }
}

export function migrateCombatant(c: Record<string, unknown>) {
  c.kind ??= "enemy";
  if (c.kind !== "enemy") return;
  // Old single `sp` becomes armor.body.sp.
  if (typeof c.sp === "number" && !c.armor) {
    c.armor = { head: { name: "", sp: 0 }, body: { name: "", sp: c.sp } };
    delete c.sp;
  }
  migrateStatBlock(c);
  c.hp ??= 0;
}

export function migrateStatBlock(c: Record<string, unknown>) {
  c.armor ??= { head: { name: "", sp: 0 }, body: { name: "", sp: 0 } };
  c.role ??= "";
  c.reputation ??= 0;
  c.stats ??= emptyStats();
  c.weapons ??= [];
  c.gear ??= [];
  c.cyberware ??= [];
  // maxHp is now derived from BODY+WILL; drop any stored value.
  delete c.maxHp;
  if (Array.isArray(c.weapons)) {
    for (const w of c.weapons as Record<string, unknown>[]) {
      migrateWeapon(w);
    }
  }
  if (Array.isArray(c.skills)) {
    for (const skill of c.skills as Record<string, unknown>[]) {
      skill.mod ??= 0;
    }
  } else {
    c.skills = [];
  }
}

export function migrateWeaponTemplate(t: Record<string, unknown>) {
  migrateWeapon(t);
}

// Single migration path for both NPC weapons and registry templates.
// Derives the new `kind` discriminator from the existing weapon type
// (untyped → range, since pre-refactor weapons all carried ammo) and
// drops/adds ammo + magazine accordingly so each shape matches its
// kind-specific subtype.
export function migrateWeapon(w: Record<string, unknown>) {
  // Damage strings ("4d6") → d6 dice count number.
  if (typeof w.damage === "string") {
    const m = (w.damage as string).match(/(\d+)/);
    w.damage = m ? Number(m[1]) : 0;
  } else if (typeof w.damage !== "number") {
    w.damage = 0;
  }
  w.rof ??= 1;
  w.description ??= "";
  w.weaponType ??= "";
  w.quality ??= "";

  if (w.kind !== "melee" && w.kind !== "range") {
    const t = (w.weaponType as string) || "";
    w.kind = t && MELEE_TYPE_NAMES.has(t) ? "melee" : "range";
  }
  if (w.kind === "melee") {
    delete w.ammo;
    delete w.magazine;
  } else {
    if (typeof w.ammo !== "number") w.ammo = 0;
    if (typeof w.magazine !== "number") w.magazine = 0;
  }
}
