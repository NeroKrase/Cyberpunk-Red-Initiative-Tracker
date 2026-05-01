import type {
  ArmorLocation,
  Combatant,
  Encounter,
  Enemy,
  Session,
} from "../types";
import { isRange, maxHpFromStats } from "../types";
import { dbReady } from "./db";
import { store } from "./state.svelte";
import { cloneStatBlock, getTemplate } from "./templates.svelte";
import {
  runTx,
  sqlApplyDamage,
  sqlDeleteCombatant,
  sqlDeleteEncounter,
  sqlDeleteSession,
  sqlInsertCombatant,
  sqlInsertEncounterDeep,
  sqlInsertSession,
  sqlRenumberCombatants,
  sqlRenumberEncounters,
  sqlUpdateArmorSp,
  sqlUpdateCombatantPatch,
  sqlUpdateEncounterName,
  sqlUpdatePlayerPatch,
  sqlUpdateRangeWeaponAmmo,
  sqlUpdateSessionName,
} from "./sql";

// ---- Sessions ----

export async function createSession(name: string): Promise<Session> {
  const session: Session = { id: crypto.randomUUID(), name, encounters: [] };
  store.sessions.push(session);
  const db = await dbReady;
  if (db) await sqlInsertSession(db, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return store.sessions.find((s) => s.id === id);
}

export async function deleteSession(id: string): Promise<void> {
  const idx = store.sessions.findIndex((s) => s.id === id);
  if (idx === -1) return;
  store.sessions.splice(idx, 1);
  const db = await dbReady;
  if (db) await sqlDeleteSession(db, id);
}

export async function renameSession(id: string, name: string): Promise<void> {
  const session = getSession(id);
  if (!session) return;
  session.name = name;
  const db = await dbReady;
  if (db) await sqlUpdateSessionName(db, id, name);
}

export async function duplicateSession(id: string): Promise<Session | undefined> {
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
  const db = await dbReady;
  // Sessions has no position column at the top level, so a deep insert
  // of the clone (with its fresh encounter/combatant rows) is enough —
  // no sibling renumber needed.
  if (db) await runTx(db, (tx) => sqlInsertSession(tx, clone));
  return clone;
}

function reassignCombatantIds(c: Combatant) {
  c.id = crypto.randomUUID();
  if (c.kind !== "enemy") return;
  for (const w of c.weapons) w.id = crypto.randomUUID();
  for (const s of c.skills) s.id = crypto.randomUUID();
}

// ---- Encounters ----

export async function createEncounter(
  sessionId: string,
  name: string,
): Promise<Encounter | undefined> {
  const session = getSession(sessionId);
  if (!session) return;
  const encounter: Encounter = { id: crypto.randomUUID(), name, combatants: [] };
  session.encounters.push(encounter);
  const position = session.encounters.length - 1;
  const db = await dbReady;
  if (db) await sqlInsertEncounterDeep(db, sessionId, encounter, position);
  return encounter;
}

export function getEncounter(sessionId: string, encounterId: string): Encounter | undefined {
  return getSession(sessionId)?.encounters.find((e) => e.id === encounterId);
}

export async function deleteEncounter(
  sessionId: string,
  encounterId: string,
): Promise<void> {
  const session = getSession(sessionId);
  if (!session) return;
  const idx = session.encounters.findIndex((e) => e.id === encounterId);
  if (idx === -1) return;
  session.encounters.splice(idx, 1);
  const db = await dbReady;
  if (db) {
    await runTx(db, async (tx) => {
      await sqlDeleteEncounter(tx, encounterId);
      await sqlRenumberEncounters(tx, sessionId, session.encounters);
    });
  }
}

export async function renameEncounter(
  sessionId: string,
  encounterId: string,
  name: string,
): Promise<void> {
  const encounter = getEncounter(sessionId, encounterId);
  if (!encounter) return;
  encounter.name = name;
  const db = await dbReady;
  if (db) await sqlUpdateEncounterName(db, encounterId, name);
}

export async function duplicateEncounter(
  sessionId: string,
  encounterId: string,
): Promise<Encounter | undefined> {
  const session = getSession(sessionId);
  const encounter = session?.encounters.find((e) => e.id === encounterId);
  if (!session || !encounter) return;
  const clone = JSON.parse(JSON.stringify(encounter)) as Encounter;
  clone.id = crypto.randomUUID();
  clone.name = `${encounter.name}_dup`;
  for (const c of clone.combatants) reassignCombatantIds(c);
  const idx = session.encounters.indexOf(encounter);
  session.encounters.splice(idx + 1, 0, clone);
  const db = await dbReady;
  if (db) {
    // Insert clone with its in-memory position, then renumber siblings
    // so positions match the spliced order (clone at idx+1 pushes
    // everyone after it down by one).
    await runTx(db, async (tx) => {
      await sqlInsertEncounterDeep(tx, sessionId, clone, idx + 1);
      await sqlRenumberEncounters(tx, sessionId, session.encounters);
    });
  }
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

export async function addCombatant(
  sessionId: string,
  encounterId: string,
  input: NewCombatantInput,
): Promise<Combatant | undefined> {
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
    // Reassign cloned skill/weapon ids so two enemies built from the
    // same template don't collide on PRIMARY KEY in combatant_skills /
    // combatant_*_weapons. (Matches the duplicate paths.)
    for (const w of snapshot.weapons) w.id = crypto.randomUUID();
    for (const s of snapshot.skills) s.id = crypto.randomUUID();
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
  const position = encounter.combatants.length - 1;
  const db = await dbReady;
  if (db) await runTx(db, (tx) => sqlInsertCombatant(tx, encounterId, combatant, position));
  return combatant;
}

export async function removeCombatant(
  sessionId: string,
  encounterId: string,
  combatantId: string,
): Promise<void> {
  const encounter = getEncounter(sessionId, encounterId);
  if (!encounter) return;
  const idx = encounter.combatants.findIndex((c) => c.id === combatantId);
  if (idx === -1) return;
  const removed = encounter.combatants[idx];
  encounter.combatants.splice(idx, 1);
  const db = await dbReady;
  if (db) {
    await runTx(db, async (tx) => {
      await sqlDeleteCombatant(tx, removed.kind, combatantId);
      await sqlRenumberCombatants(tx, encounterId, encounter.combatants);
    });
  }
}

export type CombatantPatch = Partial<{
  name: string;
  initiative: number;
  hp: number;
}>;

export async function updateCombatant(
  sessionId: string,
  encounterId: string,
  combatantId: string,
  patch: CombatantPatch,
): Promise<void> {
  const combatant = getCombatant(sessionId, encounterId, combatantId);
  if (!combatant) return;
  Object.assign(combatant, patch);
  const db = await dbReady;
  if (!db) return;
  if (combatant.kind === "pc") {
    // PCs have no hp column; ignore it if present.
    await sqlUpdatePlayerPatch(db, combatantId, {
      name: patch.name,
      initiative: patch.initiative,
    });
  } else {
    await sqlUpdateCombatantPatch(db, combatantId, patch);
  }
}

export async function updateArmorSp(
  sessionId: string,
  encounterId: string,
  combatantId: string,
  location: ArmorLocation,
  sp: number,
): Promise<void> {
  const combatant = getCombatant(sessionId, encounterId, combatantId);
  if (!combatant || combatant.kind !== "enemy") return;
  combatant.armor[location].sp = sp;
  const db = await dbReady;
  if (db) await sqlUpdateArmorSp(db, combatantId, location, sp);
}

export async function updateWeaponAmmo(
  sessionId: string,
  encounterId: string,
  combatantId: string,
  weaponId: string,
  ammo: number,
): Promise<void> {
  const combatant = getCombatant(sessionId, encounterId, combatantId);
  if (!combatant || combatant.kind !== "enemy") return;
  const weapon = combatant.weapons.find((w) => w.id === weaponId);
  if (!weapon || !isRange(weapon)) return;
  weapon.ammo = ammo;
  const db = await dbReady;
  if (db) await sqlUpdateRangeWeaponAmmo(db, weaponId, ammo);
}

export async function applyDamage(
  sessionId: string,
  encounterId: string,
  combatantId: string,
  damage: number,
  location: ArmorLocation,
): Promise<void> {
  console.log("Отримана шкода у локацію:", location);

  const combatant = getCombatant(sessionId, encounterId, combatantId);
  if (!combatant || combatant.kind !== "enemy" || damage <= 0) return;

  const enemy = combatant as Enemy;
  const sp = enemy.armor[location].sp;
  if (damage <= sp) return;

  if (location === "head") {
    enemy.hp -= (damage - sp) * 2;
  } else {
    enemy.hp -= damage - sp;
  }
  if (sp > 0) enemy.armor[location].sp = sp - 1;
  const db = await dbReady;
  if (db) await sqlApplyDamage(db, combatantId, enemy.hp, location, enemy.armor[location].sp);
}
