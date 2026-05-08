export type Stats = {
  int: number;
  ref: number;
  dex: number;
  tech: number;
  cool: number;
  will: number;
  move: number;
  body: number;
  emp: number;
};

export const STAT_KEYS = [
  "int",
  "ref",
  "dex",
  "tech",
  "cool",
  "will",
  "move",
  "body",
  "emp",
] as const satisfies readonly (keyof Stats)[];

export type SkillStat = "int" | "ref" | "dex" | "tech" | "cool" | "will" | "emp";

export type SkillCategory =
  | "Awareness"
  | "Body"
  | "Control"
  | "Education"
  | "Fighting"
  | "Performance"
  | "Ranged Weapon"
  | "Social"
  | "Technique";

export const SKILL_CATEGORIES = [
  "Awareness",
  "Body",
  "Control",
  "Education",
  "Fighting",
  "Performance",
  "Ranged Weapon",
  "Social",
  "Technique",
] as const satisfies readonly SkillCategory[];

export type SkillCatalogEntry = {
  name: string;
  stat: SkillStat;
  category: SkillCategory;
};

export const SKILL_CATALOG: readonly SkillCatalogEntry[] = [
  // Awareness
  { name: "Concentration", stat: "will", category: "Awareness" },
  { name: "Conceal/Reveal Object", stat: "int", category: "Awareness" },
  { name: "Lip Reading", stat: "int", category: "Awareness" },
  { name: "Perception", stat: "int", category: "Awareness" },
  { name: "Tracking", stat: "int", category: "Awareness" },
  // Body
  { name: "Athletics", stat: "dex", category: "Body" },
  { name: "Contortionist", stat: "dex", category: "Body" },
  { name: "Dance", stat: "dex", category: "Body" },
  { name: "Endurance", stat: "will", category: "Body" },
  { name: "Resist Torture/Drugs", stat: "will", category: "Body" },
  { name: "Stealth", stat: "dex", category: "Body" },
  // Control
  { name: "Drive Land Vehicle", stat: "ref", category: "Control" },
  { name: "Pilot Air Vehicle", stat: "ref", category: "Control" },
  { name: "Pilot Sea Vehicle", stat: "ref", category: "Control" },
  { name: "Riding", stat: "ref", category: "Control" },
  // Education
  { name: "Accounting", stat: "int", category: "Education" },
  { name: "Animal Handling", stat: "int", category: "Education" },
  { name: "Bureaucracy", stat: "int", category: "Education" },
  { name: "Business", stat: "int", category: "Education" },
  { name: "Composition", stat: "int", category: "Education" },
  { name: "Criminology", stat: "int", category: "Education" },
  { name: "Cryptography", stat: "int", category: "Education" },
  { name: "Deduction", stat: "int", category: "Education" },
  { name: "Education", stat: "int", category: "Education" },
  { name: "Gamble", stat: "int", category: "Education" },
  { name: "Language", stat: "int", category: "Education" },
  { name: "Library Search", stat: "int", category: "Education" },
  { name: "Local Expert", stat: "int", category: "Education" },
  { name: "Science", stat: "int", category: "Education" },
  { name: "Tactics", stat: "int", category: "Education" },
  { name: "Wilderness Survival", stat: "int", category: "Education" },
  // Fighting (Martial Arts deferred — multi-style support)
  { name: "Brawling", stat: "dex", category: "Fighting" },
  { name: "Evasion", stat: "dex", category: "Fighting" },
  { name: "Melee Weapon", stat: "dex", category: "Fighting" },
  // Performance
  { name: "Acting", stat: "cool", category: "Performance" },
  { name: "Play Instrument", stat: "tech", category: "Performance" },
  // Ranged Weapon
  { name: "Archery", stat: "ref", category: "Ranged Weapon" },
  { name: "Autofire", stat: "ref", category: "Ranged Weapon" },
  { name: "Handgun", stat: "ref", category: "Ranged Weapon" },
  { name: "Heavy Weapons", stat: "ref", category: "Ranged Weapon" },
  { name: "Shoulder Arms", stat: "ref", category: "Ranged Weapon" },
  // Social
  { name: "Bribery", stat: "cool", category: "Social" },
  { name: "Conversation", stat: "emp", category: "Social" },
  { name: "Human Perception", stat: "emp", category: "Social" },
  { name: "Interrogation", stat: "cool", category: "Social" },
  { name: "Persuasion", stat: "cool", category: "Social" },
  { name: "Personal Grooming", stat: "cool", category: "Social" },
  { name: "Streetwise", stat: "cool", category: "Social" },
  { name: "Trading", stat: "cool", category: "Social" },
  { name: "Wardrobe & Style", stat: "cool", category: "Social" },
  // Technique
  { name: "Air Vehicle Tech", stat: "tech", category: "Technique" },
  { name: "Basic Tech", stat: "tech", category: "Technique" },
  { name: "Cybertech", stat: "tech", category: "Technique" },
  { name: "Demolitions", stat: "tech", category: "Technique" },
  { name: "Electronics/Security Tech", stat: "tech", category: "Technique" },
  { name: "First Aid", stat: "tech", category: "Technique" },
  { name: "Forgery", stat: "tech", category: "Technique" },
  { name: "Land Vehicle Tech", stat: "tech", category: "Technique" },
  { name: "Paint/Draw/Sculpt", stat: "tech", category: "Technique" },
  { name: "Paramedic", stat: "tech", category: "Technique" },
  { name: "Photography & Film", stat: "tech", category: "Technique" },
  { name: "Pick Lock", stat: "tech", category: "Technique" },
  { name: "Pick Pocket", stat: "tech", category: "Technique" },
  { name: "Sea Vehicle Tech", stat: "tech", category: "Technique" },
  { name: "Weaponstech", stat: "tech", category: "Technique" },
];

const SKILL_STAT_BY_NAME = new Map(
  SKILL_CATALOG.map((s) => [s.name, s.stat] as const),
);

export function getSkillStat(name: string): SkillStat | undefined {
  return SKILL_STAT_BY_NAME.get(name);
}

// Weapon kind. Melee and range weapons share most fields (name, quality,
// rof, damage, description) but differ in:
//   - melee weapons have no ammo and no magazine
//   - range weapons have ammo (current rounds carried) and magazine
//     (capacity per magazine, static), and a wider set of associated
//     skills.
export type WeaponKind = "melee" | "range";

export const MELEE_WEAPON_TYPES = [
  "L Melee",
  "M Melee",
  "H Melee",
  "VH Melee",
] as const;

export const RANGE_WEAPON_TYPES = [
  "M Pistol",
  "H Pistol",
  "VH Pistol",
  "SMG",
  "H SMG",
  "Shotgun",
  "Assault Rifle",
  "Sniper Rifle",
  "Bow",
  "Crossbow",
  "Grenade Launcher",
  "Rocket Launcher",
] as const;

export type MeleeWeaponType = (typeof MELEE_WEAPON_TYPES)[number];
export type RangeWeaponType = (typeof RANGE_WEAPON_TYPES)[number];

export const WEAPON_TYPES = [
  ...MELEE_WEAPON_TYPES,
  ...RANGE_WEAPON_TYPES,
] as const;

export type WeaponType = (typeof WEAPON_TYPES)[number];

const MELEE_TYPE_SET = new Set<string>(MELEE_WEAPON_TYPES);

// All melee variants share the Melee Weapon skill; range variants spread
// across Handgun / Shoulder Arms / Archery / Heavy Weapons.
export const WEAPON_TYPE_SKILL: Record<WeaponType, string> = {
  "L Melee": "Melee Weapon",
  "M Melee": "Melee Weapon",
  "H Melee": "Melee Weapon",
  "VH Melee": "Melee Weapon",
  "M Pistol": "Handgun",
  "H Pistol": "Handgun",
  "VH Pistol": "Handgun",
  SMG: "Handgun",
  "H SMG": "Handgun",
  Shotgun: "Shoulder Arms",
  "Assault Rifle": "Shoulder Arms",
  "Sniper Rifle": "Shoulder Arms",
  Bow: "Archery",
  Crossbow: "Archery",
  "Grenade Launcher": "Heavy Weapons",
  "Rocket Launcher": "Heavy Weapons",
};

export function kindOfWeaponType(t: WeaponType): WeaponKind {
  return MELEE_TYPE_SET.has(t) ? "melee" : "range";
}

// Weapon quality. "" = normal, "excellent" gives +1 to combat number.
export type WeaponQuality = "" | "excellent" | "poor";

// Card-side prefix label used for the quality. Per spec the displayed
// abbreviations on cards are "EQ" for excellent, "PR" for poor, none for
// normal.
export const QUALITY_CARD_PREFIX: Record<WeaponQuality, string> = {
  "": "",
  excellent: "EQ",
  poor: "PR",
};

// Form-side dropdown option labels (shown next to the colour swatch).
export const QUALITY_FORM_LABEL: Record<WeaponQuality, string> = {
  "": "Normal",
  excellent: "EQ — Excellent",
  poor: "PQ — Poor",
};

// Excellent-quality weapons add +1 to their combat number / skill total.
export function qualityCombatBonus(quality: WeaponQuality): number {
  return quality === "excellent" ? 1 : 0;
}

// Common shape for every weapon — both melee and range carry these.
type WeaponBase = {
  id: string;
  name: string;
  quality: WeaponQuality;
  rof: number;
  damage: number;
  description: string;
  templateId?: string;
};

// Melee weapons only ever use the Melee Weapon skill. They have no ammo
// and no magazine.
export type MeleeWeapon = WeaponBase & {
  kind: "melee";
  weaponType: MeleeWeaponType | "";
};

// Range weapons add `magazine` (capacity per magazine, fixed by the
// weapon model) and `ammo` (rounds the wielder is currently carrying).
export type RangeWeapon = WeaponBase & {
  kind: "range";
  weaponType: RangeWeaponType | "";
  magazine: number;
  ammo: number;
};

export type Weapon = MeleeWeapon | RangeWeapon;

// Templates and NPC weapons share the same shape; the NPC simply has
// its own ammo count for range weapons.
export type WeaponTemplate = Weapon;
export type MeleeWeaponTemplate = MeleeWeapon;
export type RangeWeaponTemplate = RangeWeapon;

export function isMelee(w: Weapon): w is MeleeWeapon {
  return w.kind === "melee";
}

export function isRange(w: Weapon): w is RangeWeapon {
  return w.kind === "range";
}

export function emptyMeleeWeapon(): MeleeWeapon {
  return {
    id: crypto.randomUUID(),
    kind: "melee",
    name: "",
    weaponType: "",
    quality: "",
    rof: 1,
    damage: 0,
    description: "",
  };
}

export function emptyRangeWeapon(): RangeWeapon {
  return {
    id: crypto.randomUUID(),
    kind: "range",
    name: "",
    weaponType: "",
    quality: "",
    rof: 1,
    magazine: 0,
    ammo: 0,
    damage: 0,
    description: "",
  };
}

export function emptyWeapon(kind: WeaponKind = "range"): Weapon {
  return kind === "melee" ? emptyMeleeWeapon() : emptyRangeWeapon();
}

export type Skill = {
  id: string;
  name: string;
  level: number;
  mod: number;
};

export type ArmorPiece = {
  name: string;
  sp: number;
};

export type ArmorLocation = "head" | "body";

export type EnemyStatBlock = {
  name: string;
  role: string;
  reputation: number;
  stats: Stats;
  weapons: Weapon[];
  armor: { head: ArmorPiece; body: ArmorPiece };
  skills: Skill[];
  gear: string[];
  cyberware: string[];
};

export const MAX_REPUTATION = 10;

export function clampReputation(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_REPUTATION, Math.floor(value)));
}

export function skillTotal(stats: Stats, skill: Skill): number {
  const stat = getSkillStat(skill.name);
  const statValue = stat ? stats[stat] : 0;
  return statValue + skill.level + skill.mod;
}

// Combat number for a weapon — the associated skill total for the NPC.
// Returns null when the weapon has no type (untyped).
// If quality is "excellent", adds the +1 EQ bonus.
export function weaponCombatNumber(
  block: EnemyStatBlock,
  weaponType: WeaponType | "",
  quality: WeaponQuality = "",
): number | null {
  if (!weaponType) return null;
  const skillName = WEAPON_TYPE_SKILL[weaponType];
  const skill = block.skills.find((s) => s.name === skillName);
  const base = skill
    ? skillTotal(block.stats, skill)
    : (() => {
        const stat = getSkillStat(skillName);
        return stat ? block.stats[stat] : null;
      })();
  if (base == null) return null;
  return base + qualityCombatBonus(quality);
}

export type EnemyTemplate = { id: string } & EnemyStatBlock;

export type PlayerCharacter = {
  id: string;
  kind: "pc";
  name: string;
  initiative: number;
};

export type Enemy = {
  id: string;
  kind: "enemy";
  initiative: number;
  hp: number;
  templateId?: string;
} & EnemyStatBlock;

export type Combatant = PlayerCharacter | Enemy;

export type Encounter = {
  id: string;
  name: string;
  combatants: Combatant[];
};

export type Session = {
  id: string;
  name: string;
  encounters: Encounter[];
};

export type WoundState = "none" | "serious" | "mortal";

export function woundState(hp: number, maxHp: number): WoundState {
  if (hp <= 0) return "mortal";
  if (maxHp > 0 && hp <= maxHp / 2) return "serious";
  return "none";
}

export function maxHpFromStats(stats: Stats): number {
  return 10 + 5 * Math.ceil((stats.body + stats.will) / 2);
}

export function emptyStats(): Stats {
  return { int: 0, ref: 0, dex: 0, tech: 0, cool: 0, will: 0, move: 0, body: 0, emp: 0 };
}

const DEFAULT_COMBAT_SKILL_NAMES = [
  "Athletics",
  "Autofire",
  "Brawling",
  "Concentration",
  "Evasion",
  "Handgun",
  "Heavy Weapons",
  "Melee Weapon",
  "Resist Torture/Drugs",
  "Shoulder Arms",
] as const;

export function defaultCombatSkills(): Skill[] {
  return DEFAULT_COMBAT_SKILL_NAMES.map((name) => ({
    id: crypto.randomUUID(),
    name,
    level: 0,
    mod: 0,
  }));
}

export function emptyStatBlock(): EnemyStatBlock {
  return {
    name: "",
    role: "",
    reputation: 0,
    stats: emptyStats(),
    weapons: [],
    armor: { head: { name: "", sp: 0 }, body: { name: "", sp: 0 } },
    skills: defaultCombatSkills(),
    gear: [],
    cyberware: [],
  };
}

// ---- NET architectures ----

export const NET_FLOOR_TYPES = [
  "Password",
  "Black ICE",
  "Control Node",
  "File",
] as const;
export type NetFloorType = (typeof NET_FLOOR_TYPES)[number];

export type NetFloor = {
  id: string;
  type: NetFloorType;
  description: string; // ignored by render when type === "Password"
  dv: number | null; // null for Black ICE; render as "—"
};

export type NetDemon = {
  id: string;
  name: string;
  rez: number;
  interfaceLevel: number; // `interface` is reserved
  netActions: number;
  combatNumber: number;
};

export type NetArchitecture = {
  id: string;
  name: string;
  demons: NetDemon[]; // empty array ⇒ no demons installed
  floors: NetFloor[]; // index 0 = Floor 1 (top)
};

export function floorNeedsDescription(t: NetFloorType): boolean {
  return t !== "Password";
}

export function floorHasDv(t: NetFloorType): boolean {
  return t !== "Black ICE";
}

export function emptyNetFloor(): NetFloor {
  return {
    id: crypto.randomUUID(),
    type: "Password",
    description: "",
    dv: 10,
  };
}

export function emptyNetDemon(): NetDemon {
  return {
    id: crypto.randomUUID(),
    name: "",
    rez: 0,
    interfaceLevel: 0,
    netActions: 0,
    combatNumber: 0,
  };
}

export function emptyNetArchitecture(): NetArchitecture {
  return {
    id: crypto.randomUUID(),
    name: "",
    demons: [],
    floors: [],
  };
}
