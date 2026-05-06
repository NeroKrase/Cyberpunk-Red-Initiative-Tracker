import type Database from "@tauri-apps/plugin-sql";
import type {
  Combatant,
  Encounter,
  Enemy,
  EnemyTemplate,
  MeleeWeapon,
  NetArchitecture,
  NetDemon,
  NetFloor,
  NetFloorType,
  PlayerCharacter,
  RangeWeapon,
  Session,
  Skill,
  Stats,
  Weapon,
  WeaponQuality,
  WeaponTemplate,
} from "../types";


export type LoadedStore = {
  sessions: Session[];
  templates: EnemyTemplate[];
  weaponTemplates: WeaponTemplate[];
  netArchitectures: NetArchitecture[];
};

// Read every table, group children by parent id, assemble the in-memory
// shape. One SELECT per table — small data set, simpler than JOINs and
// cheap enough at boot.
export async function sqlLoadAll(db: Database): Promise<LoadedStore> {
  const [
    sessionRows,
    encounterRows,
    playerRows,
    combatantRows,
    combatantSkillRows,
    combatantMeleeRows,
    combatantRangeRows,
    templateRows,
    templateSkillRows,
    templateMeleeRows,
    templateRangeRows,
    meleeRegistryRows,
    rangeRegistryRows,
    netArchRows,
    netFloorRows,
    netDemonRows,
  ] = await Promise.all([
    db.select<SessionRow[]>("SELECT * FROM sessions"),
    db.select<EncounterRow[]>("SELECT * FROM encounters ORDER BY session_id, position"),
    db.select<PlayerRow[]>("SELECT * FROM players ORDER BY encounter_id, position"),
    db.select<CombatantRow[]>("SELECT * FROM combatants ORDER BY encounter_id, position"),
    db.select<CombatantSkillRow[]>(
      "SELECT * FROM combatant_skills ORDER BY combatant_id, position",
    ),
    db.select<CombatantMeleeRow[]>(
      "SELECT * FROM combatant_melee_weapons ORDER BY combatant_id, position",
    ),
    db.select<CombatantRangeRow[]>(
      "SELECT * FROM combatant_range_weapons ORDER BY combatant_id, position",
    ),
    db.select<EnemyTemplateRow[]>("SELECT * FROM enemy_templates"),
    db.select<TemplateSkillRow[]>(
      "SELECT * FROM template_skills ORDER BY template_id, position",
    ),
    db.select<TemplateMeleeRow[]>(
      "SELECT * FROM template_melee_weapons ORDER BY template_id, position",
    ),
    db.select<TemplateRangeRow[]>(
      "SELECT * FROM template_range_weapons ORDER BY template_id, position",
    ),
    db.select<MeleeRegistryRow[]>("SELECT * FROM melee_weapon_templates"),
    db.select<RangeRegistryRow[]>("SELECT * FROM range_weapon_templates"),
    db.select<NetArchitectureRow[]>("SELECT * FROM net_architectures"),
    db.select<NetFloorRow[]>(
      "SELECT * FROM net_floors ORDER BY architecture_id, position",
    ),
    db.select<NetDemonRow[]>(
      "SELECT * FROM net_demons ORDER BY architecture_id, position",
    ),
  ]);

  const encByS = groupBy(encounterRows, (e) => e.session_id);
  const plByE = groupBy(playerRows, (p) => p.encounter_id);
  const enByE = groupBy(combatantRows, (c) => c.encounter_id);
  const skByC = groupBy(combatantSkillRows, (s) => s.combatant_id);
  const meByC = groupBy(combatantMeleeRows, (m) => m.combatant_id);
  const raByC = groupBy(combatantRangeRows, (r) => r.combatant_id);
  const tskByT = groupBy(templateSkillRows, (s) => s.template_id);
  const tmeByT = groupBy(templateMeleeRows, (m) => m.template_id);
  const traByT = groupBy(templateRangeRows, (r) => r.template_id);

  const sessions: Session[] = sessionRows.map((s) => ({
    id: s.id,
    name: s.name,
    encounters: (encByS.get(s.id) ?? []).map((e) =>
      buildEncounter(e, plByE, enByE, skByC, meByC, raByC),
    ),
  }));

  const templates: EnemyTemplate[] = templateRows.map((t) => ({
    id: t.id,
    ...statBlockFromTemplateRow(t, tskByT, tmeByT, traByT),
  }));

  const weaponTemplates: WeaponTemplate[] = [
    ...meleeRegistryRows.map(meleeFromRegistryRow),
    ...rangeRegistryRows.map(rangeFromRegistryRow),
  ];

  const floorsByArch = groupBy(netFloorRows, (f) => f.architecture_id);
  const demonsByArch = groupBy(netDemonRows, (d) => d.architecture_id);
  const netArchitectures: NetArchitecture[] = netArchRows.map((r) =>
    netArchitectureFromRow(r, demonsByArch, floorsByArch),
  );

  return { sessions, templates, weaponTemplates, netArchitectures };
}

function netArchitectureFromRow(
  r: NetArchitectureRow,
  demonsByArch: Map<string, NetDemonRow[]>,
  floorsByArch: Map<string, NetFloorRow[]>,
): NetArchitecture {
  const demons: NetDemon[] = (demonsByArch.get(r.id) ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    rez: d.rez,
    interfaceLevel: d.interface,
    netActions: d.net_actions,
    combatNumber: d.combat_number,
  }));
  const floors: NetFloor[] = (floorsByArch.get(r.id) ?? []).map((f) => ({
    id: f.id,
    type: f.type as NetFloorType,
    description: f.description,
    dv: f.dv,
  }));
  return { id: r.id, name: r.name, demons, floors };
}

// ---- Assembly helpers ----

function buildEncounter(
  e: EncounterRow,
  plByE: Map<string, PlayerRow[]>,
  enByE: Map<string, CombatantRow[]>,
  skByC: Map<string, CombatantSkillRow[]>,
  meByC: Map<string, CombatantMeleeRow[]>,
  raByC: Map<string, CombatantRangeRow[]>,
): Encounter {
  // Players and enemies share a position space within the encounter
  // (sqlInsertCombatant assigned position = combined-array index). Merge
  // them by position to recover the original mixed order.
  const players = plByE.get(e.id) ?? [];
  const enemies = enByE.get(e.id) ?? [];
  const merged: { position: number; combatant: Combatant }[] = [
    ...players.map((p) => ({ position: p.position, combatant: pcFromRow(p) })),
    ...enemies.map((c) => ({
      position: c.position,
      combatant: enemyFromRow(c, skByC, meByC, raByC),
    })),
  ];
  merged.sort((a, b) => a.position - b.position);
  return {
    id: e.id,
    name: e.name,
    combatants: merged.map((m) => m.combatant),
  };
}

function pcFromRow(p: PlayerRow): PlayerCharacter {
  return {
    id: p.id,
    kind: "pc",
    name: p.name,
    initiative: p.initiative,
  };
}

function enemyFromRow(
  c: CombatantRow,
  skByC: Map<string, CombatantSkillRow[]>,
  meByC: Map<string, CombatantMeleeRow[]>,
  raByC: Map<string, CombatantRangeRow[]>,
): Enemy {
  const skills: Skill[] = (skByC.get(c.id) ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    level: s.level,
    mod: s.mod,
  }));
  const weapons = mergeWeaponsByPosition(
    (meByC.get(c.id) ?? []).map(meleeFromCombatantRow),
    (raByC.get(c.id) ?? []).map(rangeFromCombatantRow),
  );
  return {
    id: c.id,
    kind: "enemy",
    initiative: c.initiative,
    hp: c.hp,
    templateId: c.template_id ?? undefined,
    name: c.name,
    role: c.role,
    reputation: c.reputation,
    stats: statsFromRow(c),
    armor: {
      head: { name: c.armor_head_name, sp: c.armor_head_sp },
      body: { name: c.armor_body_name, sp: c.armor_body_sp },
    },
    weapons,
    skills,
    gear: parseJsonArray(c.gear_json),
    cyberware: parseJsonArray(c.cyberware_json),
  };
}

function statBlockFromTemplateRow(
  t: EnemyTemplateRow,
  tskByT: Map<string, TemplateSkillRow[]>,
  tmeByT: Map<string, TemplateMeleeRow[]>,
  traByT: Map<string, TemplateRangeRow[]>,
) {
  const skills: Skill[] = (tskByT.get(t.id) ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    level: s.level,
    mod: s.mod,
  }));
  const weapons = mergeWeaponsByPosition(
    (tmeByT.get(t.id) ?? []).map(meleeFromTemplateRow),
    (traByT.get(t.id) ?? []).map(rangeFromTemplateRow),
  );
  return {
    name: t.name,
    role: t.role,
    reputation: t.reputation,
    stats: statsFromRow(t),
    armor: {
      head: { name: t.armor_head_name, sp: t.armor_head_sp },
      body: { name: t.armor_body_name, sp: t.armor_body_sp },
    },
    weapons,
    skills,
    gear: parseJsonArray(t.gear_json),
    cyberware: parseJsonArray(t.cyberware_json),
  };
}

// Merges melee + range arrays — both already sorted by position within
// their kind — into a single position-ordered list.
function mergeWeaponsByPosition(
  melee: { position: number; weapon: MeleeWeapon }[],
  range: { position: number; weapon: RangeWeapon }[],
): Weapon[] {
  const merged = [...melee, ...range];
  merged.sort((a, b) => a.position - b.position);
  return merged.map((m) => m.weapon);
}

function meleeFromCombatantRow(m: CombatantMeleeRow) {
  return {
    position: m.position,
    weapon: {
      id: m.id,
      kind: "melee",
      name: m.name,
      weaponType: m.weapon_type as MeleeWeapon["weaponType"],
      quality: m.quality as WeaponQuality,
      // melee carries no rof in the schema (always 1 in practice — see
      // emptyMeleeWeapon) but the WeaponBase type still requires it.
      rof: 1,
      damage: m.damage,
      description: m.description,
      templateId: m.template_id ?? undefined,
    } satisfies MeleeWeapon,
  };
}

function rangeFromCombatantRow(r: CombatantRangeRow) {
  return {
    position: r.position,
    weapon: {
      id: r.id,
      kind: "range",
      name: r.name,
      weaponType: r.weapon_type as RangeWeapon["weaponType"],
      quality: r.quality as WeaponQuality,
      rof: r.rof,
      damage: r.damage,
      description: r.description,
      magazine: r.magazine,
      ammo: r.ammo,
      templateId: r.template_id ?? undefined,
    } satisfies RangeWeapon,
  };
}

function meleeFromTemplateRow(m: TemplateMeleeRow) {
  return {
    position: m.position,
    weapon: {
      id: m.id,
      kind: "melee",
      name: m.name,
      weaponType: m.weapon_type as MeleeWeapon["weaponType"],
      quality: m.quality as WeaponQuality,
      rof: 1,
      damage: m.damage,
      description: m.description,
      templateId: m.weapon_template_id ?? undefined,
    } satisfies MeleeWeapon,
  };
}

function rangeFromTemplateRow(r: TemplateRangeRow) {
  return {
    position: r.position,
    weapon: {
      id: r.id,
      kind: "range",
      name: r.name,
      weaponType: r.weapon_type as RangeWeapon["weaponType"],
      quality: r.quality as WeaponQuality,
      rof: r.rof,
      damage: r.damage,
      description: r.description,
      magazine: r.magazine,
      ammo: r.ammo,
      templateId: r.weapon_template_id ?? undefined,
    } satisfies RangeWeapon,
  };
}

function meleeFromRegistryRow(m: MeleeRegistryRow): MeleeWeapon {
  return {
    id: m.id,
    kind: "melee",
    name: m.name,
    weaponType: m.weapon_type as MeleeWeapon["weaponType"],
    quality: m.quality as WeaponQuality,
    rof: 1,
    damage: m.damage,
    description: m.description,
  };
}

function rangeFromRegistryRow(r: RangeRegistryRow): RangeWeapon {
  return {
    id: r.id,
    kind: "range",
    name: r.name,
    weaponType: r.weapon_type as RangeWeapon["weaponType"],
    quality: r.quality as WeaponQuality,
    rof: r.rof,
    damage: r.damage,
    description: r.description,
    magazine: r.magazine,
    ammo: r.ammo,
  };
}

function statsFromRow(r: { [K in `stat_${keyof Stats}`]: number }): Stats {
  return {
    int: r.stat_int,
    ref: r.stat_ref,
    dex: r.stat_dex,
    tech: r.stat_tech,
    cool: r.stat_cool,
    will: r.stat_will,
    move: r.stat_move,
    body: r.stat_body,
    emp: r.stat_emp,
  };
}

function parseJsonArray(s: string | null): string[] {
  if (!s) return [];
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function groupBy<T, K>(items: T[], key: (t: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = out.get(k);
    if (list) list.push(item);
    else out.set(k, [item]);
  }
  return out;
}

// ---- Row types ----

type SessionRow = { id: string; name: string };

type EncounterRow = {
  id: string;
  session_id: string;
  name: string;
  position: number;
};

type PlayerRow = {
  id: string;
  encounter_id: string;
  name: string;
  initiative: number;
  position: number;
};

type CombatantRow = {
  id: string;
  encounter_id: string;
  template_id: string | null;
  name: string;
  initiative: number;
  hp: number;
  role: string;
  reputation: number;
  stat_int: number;
  stat_ref: number;
  stat_dex: number;
  stat_tech: number;
  stat_cool: number;
  stat_will: number;
  stat_move: number;
  stat_body: number;
  stat_emp: number;
  armor_head_name: string;
  armor_head_sp: number;
  armor_body_name: string;
  armor_body_sp: number;
  gear_json: string | null;
  cyberware_json: string | null;
  position: number;
};

type CombatantSkillRow = {
  id: string;
  combatant_id: string;
  name: string;
  level: number;
  mod: number;
  position: number;
};

type CombatantMeleeRow = {
  id: string;
  combatant_id: string;
  template_id: string | null;
  name: string;
  weapon_type: string;
  quality: string;
  damage: number;
  description: string;
  position: number;
};

type CombatantRangeRow = {
  id: string;
  combatant_id: string;
  template_id: string | null;
  name: string;
  weapon_type: string;
  quality: string;
  rof: number;
  damage: number;
  description: string;
  ammo: number;
  magazine: number;
  position: number;
};

type EnemyTemplateRow = {
  id: string;
  name: string;
  role: string;
  reputation: number;
  stat_int: number;
  stat_ref: number;
  stat_dex: number;
  stat_tech: number;
  stat_cool: number;
  stat_will: number;
  stat_move: number;
  stat_body: number;
  stat_emp: number;
  armor_head_name: string;
  armor_head_sp: number;
  armor_body_name: string;
  armor_body_sp: number;
  gear_json: string | null;
  cyberware_json: string | null;
};

type TemplateSkillRow = {
  id: string;
  template_id: string;
  name: string;
  level: number;
  mod: number;
  position: number;
};

type TemplateMeleeRow = {
  id: string;
  template_id: string;
  weapon_template_id: string | null;
  name: string;
  weapon_type: string;
  quality: string;
  damage: number;
  description: string;
  position: number;
};

type TemplateRangeRow = {
  id: string;
  template_id: string;
  weapon_template_id: string | null;
  name: string;
  weapon_type: string;
  quality: string;
  rof: number;
  damage: number;
  description: string;
  ammo: number;
  magazine: number;
  position: number;
};

type MeleeRegistryRow = {
  id: string;
  name: string;
  weapon_type: string;
  quality: string;
  damage: number;
  description: string;
};

type RangeRegistryRow = {
  id: string;
  name: string;
  weapon_type: string;
  quality: string;
  rof: number;
  damage: number;
  description: string;
  ammo: number;
  magazine: number;
};

type NetArchitectureRow = {
  id: string;
  name: string;
};

type NetDemonRow = {
  id: string;
  architecture_id: string;
  name: string;
  rez: number;
  interface: number;
  net_actions: number;
  combat_number: number;
  position: number;
};

type NetFloorRow = {
  id: string;
  architecture_id: string;
  type: string;
  description: string;
  dv: number | null;
  position: number;
};
