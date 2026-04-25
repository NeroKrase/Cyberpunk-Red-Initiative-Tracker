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

export type Weapon = {
  id: string;
  name: string;
  rof: number;
  damage: string;
};

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
  stats: Stats;
  weapons: Weapon[];
  armor: { head: ArmorPiece; body: ArmorPiece };
  skills: Skill[];
  gear: string[];
  cyberware: string[];
};

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
    stats: emptyStats(),
    weapons: [],
    armor: { head: { name: "", sp: 0 }, body: { name: "", sp: 0 } },
    skills: defaultCombatSkills(),
    gear: [],
    cyberware: [],
  };
}
