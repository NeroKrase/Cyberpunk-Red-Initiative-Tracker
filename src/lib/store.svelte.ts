import type {
  ArmorLocation,
  Combatant,
  Encounter,
  Enemy,
  Session,
} from "./types";
import { isRange, maxHpFromStats } from "./types";
import { store, save } from "./stores/state.svelte";
import {
  cloneStatBlock,
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  getTemplate,
  updateTemplate,
} from "./stores/templates.svelte";
import {
  createWeaponTemplate,
  deleteWeaponTemplate,
  duplicateWeaponTemplate,
  getWeaponTemplate,
  updateWeaponTemplate,
  type WeaponTemplateInput,
} from "./stores/weaponTemplates.svelte";

export {
  store,
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  getTemplate,
  updateTemplate,
  createWeaponTemplate,
  deleteWeaponTemplate,
  duplicateWeaponTemplate,
  getWeaponTemplate,
  updateWeaponTemplate,
};
export type { WeaponTemplateInput };

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
  if (!weapon || !isRange(weapon)) return;
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

