import type {
  ArmorLocation,
  Combatant,
  Encounter,
  Enemy,
  EnemyStatBlock,
  EnemyTemplate,
  Session,
  WeaponTemplate,
} from "./types";
import { emptyStats, maxHpFromStats } from "./types";

const STORAGE_KEY = "cpr-initiative-tracker/v1";

type StoreData = {
  sessions: Session[];
  templates: EnemyTemplate[];
  weaponTemplates: WeaponTemplate[];
};

function load(): StoreData {
  const empty: StoreData = { sessions: [], templates: [], weaponTemplates: [] };
  if (typeof localStorage === "undefined") return empty;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw);
    const data: StoreData = Array.isArray(parsed)
      ? { sessions: parsed, templates: [], weaponTemplates: [] }
      : {
          sessions: parsed.sessions ?? [],
          templates: parsed.templates ?? [],
          weaponTemplates: parsed.weaponTemplates ?? [],
        };
    migrate(data);
    return data;
  } catch {
    return empty;
  }
}

function migrate(data: StoreData) {
  for (const session of data.sessions) {
    for (const encounter of session.encounters) {
      for (const raw of encounter.combatants as unknown[]) {
        migrateCombatant(raw as Record<string, unknown>);
      }
    }
  }
  for (const raw of data.templates as unknown[]) {
    migrateStatBlock(raw as Record<string, unknown>);
  }
  for (const raw of data.weaponTemplates as unknown[]) {
    migrateWeaponTemplate(raw as Record<string, unknown>);
  }
}

function migrateCombatant(c: Record<string, unknown>) {
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

function migrateStatBlock(c: Record<string, unknown>) {
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
      // damage was a string like "4d6"; now a d6 dice count number.
      if (typeof w.damage === "string") {
        const m = (w.damage as string).match(/(\d+)/);
        w.damage = m ? Number(m[1]) : 0;
      } else if (typeof w.damage !== "number") {
        w.damage = 0;
      }
      w.ammo ??= 0;
      w.description ??= "";
      w.weaponType ??= "";
      w.quality ??= "";
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

function migrateWeaponTemplate(t: Record<string, unknown>) {
  if (typeof t.damage === "string") {
    const m = (t.damage as string).match(/(\d+)/);
    t.damage = m ? Number(m[1]) : 0;
  } else if (typeof t.damage !== "number") {
    t.damage = 0;
  }
  t.rof ??= 1;
  t.ammo ??= 0;
  t.description ??= "";
  t.weaponType ??= "";
  t.quality ??= "";
}

function save() {
  if (typeof localStorage === "undefined") return;
  const data: StoreData = {
    sessions: store.sessions,
    templates: store.templates,
    weaponTemplates: store.weaponTemplates,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const store = $state<StoreData>(load());

// ---- Sessions ----

export function createSession(name: string): Session {
  const session: Session = { id: crypto.randomUUID(), name, encounters: [] };
  store.sessions.push(session);
  save();
  return session;
}

export function getSession(id: string): Session | undefined {
  return store.sessions.find((s) => s.id === id);
}

export function deleteSession(id: string) {
  const idx = store.sessions.findIndex((s) => s.id === id);
  if (idx === -1) return;
  store.sessions.splice(idx, 1);
  save();
}

export function renameSession(id: string, name: string) {
  const session = getSession(id);
  if (!session) return;
  session.name = name;
  save();
}

export function duplicateSession(id: string): Session | undefined {
  const session = getSession(id);
  if (!session) return;
  const clone = JSON.parse(JSON.stringify(session)) as Session;
  clone.id = crypto.randomUUID();
  clone.name = `${session.name}_dup`;
  for (const enc of clone.encounters) {
    enc.id = crypto.randomUUID();
    for (const c of enc.combatants) reassignCombatantIds(c);
  }
  const idx = store.sessions.indexOf(session);
  store.sessions.splice(idx + 1, 0, clone);
  save();
  return clone;
}

function reassignCombatantIds(c: Combatant) {
  c.id = crypto.randomUUID();
  if (c.kind !== "enemy") return;
  for (const w of c.weapons) w.id = crypto.randomUUID();
  for (const s of c.skills) s.id = crypto.randomUUID();
}

// ---- Encounters ----

export function createEncounter(sessionId: string, name: string): Encounter | undefined {
  const session = getSession(sessionId);
  if (!session) return;
  const encounter: Encounter = { id: crypto.randomUUID(), name, combatants: [] };
  session.encounters.push(encounter);
  save();
  return encounter;
}

export function getEncounter(sessionId: string, encounterId: string): Encounter | undefined {
  return getSession(sessionId)?.encounters.find((e) => e.id === encounterId);
}

export function deleteEncounter(sessionId: string, encounterId: string) {
  const session = getSession(sessionId);
  if (!session) return;
  const idx = session.encounters.findIndex((e) => e.id === encounterId);
  if (idx === -1) return;
  session.encounters.splice(idx, 1);
  save();
}

export function renameEncounter(sessionId: string, encounterId: string, name: string) {
  const encounter = getEncounter(sessionId, encounterId);
  if (!encounter) return;
  encounter.name = name;
  save();
}

export function duplicateEncounter(
  sessionId: string,
  encounterId: string,
): Encounter | undefined {
  const session = getSession(sessionId);
  const encounter = session?.encounters.find((e) => e.id === encounterId);
  if (!session || !encounter) return;
  const clone = JSON.parse(JSON.stringify(encounter)) as Encounter;
  clone.id = crypto.randomUUID();
  clone.name = `${encounter.name}_dup`;
  for (const c of clone.combatants) reassignCombatantIds(c);
  const idx = session.encounters.indexOf(encounter);
  session.encounters.splice(idx + 1, 0, clone);
  save();
  return clone;
}

// ---- Templates ----

export function createTemplate(data: EnemyStatBlock): EnemyTemplate {
  const template: EnemyTemplate = { id: crypto.randomUUID(), ...cloneStatBlock(data) };
  store.templates.push(template);
  save();
  return template;
}

export function getTemplate(id: string): EnemyTemplate | undefined {
  return store.templates.find((t) => t.id === id);
}

export function updateTemplate(id: string, data: EnemyStatBlock) {
  const template = getTemplate(id);
  if (!template) return;
  Object.assign(template, cloneStatBlock(data));
  save();
}

export function deleteTemplate(id: string) {
  const idx = store.templates.findIndex((t) => t.id === id);
  if (idx === -1) return;
  store.templates.splice(idx, 1);
  save();
}

export function duplicateTemplate(id: string): EnemyTemplate | undefined {
  const template = getTemplate(id);
  if (!template) return;
  const clone = JSON.parse(JSON.stringify(template)) as EnemyTemplate;
  clone.id = crypto.randomUUID();
  clone.name = `${template.name}_dup`;
  for (const w of clone.weapons) w.id = crypto.randomUUID();
  for (const s of clone.skills) s.id = crypto.randomUUID();
  const idx = store.templates.indexOf(template);
  store.templates.splice(idx + 1, 0, clone);
  save();
  return clone;
}

function cloneStatBlock(data: EnemyStatBlock): EnemyStatBlock {
  return JSON.parse(JSON.stringify(data)) as EnemyStatBlock;
}

// ---- Weapon templates ----

export type WeaponTemplateInput = Omit<WeaponTemplate, "id">;

export function createWeaponTemplate(data: WeaponTemplateInput): WeaponTemplate {
  const template: WeaponTemplate = { id: crypto.randomUUID(), ...data };
  store.weaponTemplates.push(template);
  save();
  return template;
}

export function getWeaponTemplate(id: string): WeaponTemplate | undefined {
  return store.weaponTemplates.find((t) => t.id === id);
}

export function updateWeaponTemplate(id: string, data: WeaponTemplateInput) {
  const template = getWeaponTemplate(id);
  if (!template) return;
  Object.assign(template, data);
  save();
}

export function deleteWeaponTemplate(id: string) {
  const idx = store.weaponTemplates.findIndex((t) => t.id === id);
  if (idx === -1) return;
  store.weaponTemplates.splice(idx, 1);
  save();
}

export function duplicateWeaponTemplate(id: string): WeaponTemplate | undefined {
  const template = getWeaponTemplate(id);
  if (!template) return;
  const clone: WeaponTemplate = {
    ...template,
    id: crypto.randomUUID(),
    name: `${template.name}_dup`,
  };
  const idx = store.weaponTemplates.indexOf(template);
  store.weaponTemplates.splice(idx + 1, 0, clone);
  save();
  return clone;
}

// ---- Combatants ----

function getCombatant(
  sessionId: string,
  encounterId: string,
  combatantId: string,
): Combatant | undefined {
  return getEncounter(sessionId, encounterId)?.combatants.find(
    (c) => c.id === combatantId,
  );
}

export type NewCombatantInput =
  | { kind: "pc"; name: string; initiative: number }
  | { kind: "enemy"; templateId: string; initiative: number; nameOverride?: string };

export function addCombatant(
  sessionId: string,
  encounterId: string,
  input: NewCombatantInput,
): Combatant | undefined {
  const encounter = getEncounter(sessionId, encounterId);
  if (!encounter) return;

  let combatant: Combatant;
  if (input.kind === "pc") {
    combatant = {
      id: crypto.randomUUID(),
      kind: "pc",
      name: input.name,
      initiative: input.initiative,
    };
  } else {
    const template = getTemplate(input.templateId);
    if (!template) return;
    const { id: _templateId, ...statBlock } = template;
    const snapshot = cloneStatBlock(statBlock);
    const override = input.nameOverride?.trim();
    if (override) snapshot.name = override;
    combatant = {
      id: crypto.randomUUID(),
      kind: "enemy",
      initiative: input.initiative,
      hp: maxHpFromStats(snapshot.stats),
      templateId: template.id,
      ...snapshot,
    };
  }
  encounter.combatants.push(combatant);
  save();
  return combatant;
}

export function removeCombatant(
  sessionId: string,
  encounterId: string,
  combatantId: string,
) {
  const encounter = getEncounter(sessionId, encounterId);
  if (!encounter) return;
  const idx = encounter.combatants.findIndex((c) => c.id === combatantId);
  if (idx === -1) return;
  encounter.combatants.splice(idx, 1);
  save();
}

export type CombatantPatch = Partial<{
  name: string;
  initiative: number;
  hp: number;
}>;

export function updateCombatant(
  sessionId: string,
  encounterId: string,
  combatantId: string,
  patch: CombatantPatch,
) {
  const combatant = getCombatant(sessionId, encounterId, combatantId);
  if (!combatant) return;
  Object.assign(combatant, patch);
  save();
}

export function updateArmorSp(
  sessionId: string,
  encounterId: string,
  combatantId: string,
  location: ArmorLocation,
  sp: number,
) {
  const combatant = getCombatant(sessionId, encounterId, combatantId);
  if (!combatant || combatant.kind !== "enemy") return;
  combatant.armor[location].sp = sp;
  save();
}

export function updateWeaponAmmo(
  sessionId: string,
  encounterId: string,
  combatantId: string,
  weaponId: string,
  ammo: number,
) {
  const combatant = getCombatant(sessionId, encounterId, combatantId);
  if (!combatant || combatant.kind !== "enemy") return;
  const weapon = combatant.weapons.find((w) => w.id === weaponId);
  if (!weapon) return;
  weapon.ammo = ammo;
  save();
}

export function applyDamage(
  sessionId: string,
  encounterId: string,
  combatantId: string,
  damage: number,
  location: ArmorLocation,
) {
  console.log("Отримана шкода у локацію:", location);

  const combatant = getCombatant(sessionId, encounterId, combatantId);
  if (!combatant || combatant.kind !== "enemy" || damage <= 0) return;
  
  const enemy = combatant as Enemy;
  const sp = enemy.armor[location].sp;
  
  if (damage > sp) {
    // Перевіряємо, чи влучання прийшлося в голову
    if (location === "head") {
      enemy.hp -= (damage - sp) * 2;
    } else {
      enemy.hp -= damage - sp;
    }
    
    if (sp > 0) enemy.armor[location].sp = sp - 1;
  }
  save();
}

