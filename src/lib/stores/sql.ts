import { invoke } from "@tauri-apps/api/core";
import type Database from "@tauri-apps/plugin-sql";
import type {
  ArmorLocation,
  Combatant,
  Encounter,
  Enemy,
  EnemyTemplate,
  NetArchitecture,
  NetDemon,
  NetFloor,
  Session,
  Weapon,
  WeaponTemplate,
} from "../types";
import { isMelee, isRange } from "../types";

// Helpers accept anything with `execute` so they work with both the real
// Database (outside a tx) and the runTx collector (inside one).
export type TxLike = Pick<Database, "execute">;

// Run a sequence of writes inside one real SQLite transaction. The JS
// plugin acquires a fresh pool connection per execute(), so issuing
// BEGIN/COMMIT from JS does not bind the inner work — the transaction
// must happen on the Rust side. We collect statements into a buffer
// here, then ship the whole batch to the db_tx_execute command, which
// runs them on a single sqlx Transaction (rollback-on-error via Drop).
export async function runTx<T>(
  db: Database,
  fn: (tx: TxLike) => Promise<T>,
): Promise<T> {
  const statements: { sql: string; params: unknown[] }[] = [];
  const tx: TxLike = {
    execute: async (sql, bindValues) => {
      statements.push({ sql, params: bindValues ?? [] });
      return { rowsAffected: 0 };
    },
  };
  const result = await fn(tx);
  await invoke("db_tx_execute", { db: db.path, statements });
  return result;
}

// ---- Sessions ----

// Caller wraps in runTx for atomicity; inner helpers stay tx-free so
// they can be composed without nesting (SQLite has no nested txs).
export async function sqlInsertSession(db: TxLike, s: Session): Promise<void> {
  await db.execute("INSERT INTO sessions (id, name) VALUES ($1, $2)", [s.id, s.name]);
  for (let i = 0; i < s.encounters.length; i++) {
    await sqlInsertEncounterDeep(db, s.id, s.encounters[i], i);
  }
}

export async function sqlUpdateSessionName(
  db: TxLike,
  id: string,
  name: string,
): Promise<void> {
  await db.execute("UPDATE sessions SET name = $1 WHERE id = $2", [name, id]);
}

// Cascades clean up encounters / players / combatants / their children.
export async function sqlDeleteSession(db: TxLike, id: string): Promise<void> {
  await db.execute("DELETE FROM sessions WHERE id = $1", [id]);
}

// ---- Encounters ----

export async function sqlInsertEncounterDeep(
  db: TxLike,
  sessionId: string,
  enc: Encounter,
  position: number,
): Promise<void> {
  await db.execute(
    "INSERT INTO encounters (id, session_id, name, position) VALUES ($1, $2, $3, $4)",
    [enc.id, sessionId, enc.name, position],
  );
  for (let i = 0; i < enc.combatants.length; i++) {
    await sqlInsertCombatant(db, enc.id, enc.combatants[i], i);
  }
}

export async function sqlUpdateEncounterName(
  db: TxLike,
  id: string,
  name: string,
): Promise<void> {
  await db.execute("UPDATE encounters SET name = $1 WHERE id = $2", [name, id]);
}

export async function sqlDeleteEncounter(db: TxLike, id: string): Promise<void> {
  await db.execute("DELETE FROM encounters WHERE id = $1", [id]);
}

// Sync encounter positions to match the in-memory order. Used after a
// splice / delete that shifted siblings.
export async function sqlRenumberEncounters(
  db: TxLike,
  sessionId: string,
  encounters: Encounter[],
): Promise<void> {
  for (let i = 0; i < encounters.length; i++) {
    await db.execute("UPDATE encounters SET position = $1 WHERE id = $2", [
      i,
      encounters[i].id,
    ]);
  }
}

// ---- Combatants ----

export async function sqlInsertCombatant(
  db: TxLike,
  encounterId: string,
  c: Combatant,
  position: number,
): Promise<void> {
  if (c.kind === "pc") {
    await db.execute(
      `INSERT INTO players (id, encounter_id, name, initiative, position)
       VALUES ($1, $2, $3, $4, $5)`,
      [c.id, encounterId, c.name, c.initiative, position],
    );
    return;
  }
  await sqlInsertEnemy(db, encounterId, c, position);
}

async function sqlInsertEnemy(
  db: TxLike,
  encounterId: string,
  e: Enemy,
  position: number,
): Promise<void> {
  await db.execute(
    `INSERT INTO combatants (
       id, encounter_id, template_id, name, initiative, hp,
       role, reputation,
       stat_int, stat_ref, stat_dex, stat_tech, stat_cool,
       stat_will, stat_move, stat_body, stat_emp,
       armor_head_name, armor_head_sp, armor_body_name, armor_body_sp,
       gear_json, cyberware_json, position
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
    [
      e.id,
      encounterId,
      e.templateId ?? null,
      e.name,
      e.initiative,
      e.hp,
      e.role,
      e.reputation,
      e.stats.int,
      e.stats.ref,
      e.stats.dex,
      e.stats.tech,
      e.stats.cool,
      e.stats.will,
      e.stats.move,
      e.stats.body,
      e.stats.emp,
      e.armor.head.name,
      e.armor.head.sp,
      e.armor.body.name,
      e.armor.body.sp,
      JSON.stringify(e.gear),
      JSON.stringify(e.cyberware),
      position,
    ],
  );
  for (let i = 0; i < e.skills.length; i++) {
    const s = e.skills[i];
    await db.execute(
      `INSERT INTO combatant_skills (id, combatant_id, name, level, mod, position)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [s.id, e.id, s.name, s.level, s.mod, i],
    );
  }
  for (let i = 0; i < e.weapons.length; i++) {
    await sqlInsertCombatantWeapon(db, e.id, e.weapons[i], i);
  }
}

async function sqlInsertCombatantWeapon(
  db: TxLike,
  combatantId: string,
  w: Weapon,
  position: number,
): Promise<void> {
  if (isMelee(w)) {
    await db.execute(
      `INSERT INTO combatant_melee_weapons (
         id, combatant_id, template_id, name, weapon_type, quality,
         damage, description, position
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        w.id,
        combatantId,
        w.templateId ?? null,
        w.name,
        w.weaponType,
        w.quality,
        w.damage,
        w.description,
        position,
      ],
    );
    return;
  }
  if (isRange(w)) {
    await db.execute(
      `INSERT INTO combatant_range_weapons (
         id, combatant_id, template_id, name, weapon_type, quality,
         rof, damage, description, ammo, magazine, position
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        w.id,
        combatantId,
        w.templateId ?? null,
        w.name,
        w.weaponType,
        w.quality,
        w.rof,
        w.damage,
        w.description,
        w.ammo,
        w.magazine,
        position,
      ],
    );
  }
}

// PCs and enemies live in different tables; the caller knows which.
export async function sqlDeleteCombatant(
  db: TxLike,
  kind: "pc" | "enemy",
  id: string,
): Promise<void> {
  const table = kind === "pc" ? "players" : "combatants";
  await db.execute(`DELETE FROM ${table} WHERE id = $1`, [id]);
}

export async function sqlRenumberCombatants(
  db: TxLike,
  encounterId: string,
  combatants: Combatant[],
): Promise<void> {
  for (let i = 0; i < combatants.length; i++) {
    const c = combatants[i];
    const table = c.kind === "pc" ? "players" : "combatants";
    await db.execute(`UPDATE ${table} SET position = $1 WHERE id = $2`, [i, c.id]);
  }
}

export async function sqlUpdatePlayerPatch(
  db: TxLike,
  id: string,
  patch: { name?: string; initiative?: number },
): Promise<void> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (patch.name !== undefined) {
    vals.push(patch.name);
    sets.push(`name = $${vals.length}`);
  }
  if (patch.initiative !== undefined) {
    vals.push(patch.initiative);
    sets.push(`initiative = $${vals.length}`);
  }
  if (sets.length === 0) return;
  vals.push(id);
  await db.execute(
    `UPDATE players SET ${sets.join(", ")} WHERE id = $${vals.length}`,
    vals,
  );
}

export async function sqlUpdateCombatantPatch(
  db: TxLike,
  id: string,
  patch: { name?: string; initiative?: number; hp?: number },
): Promise<void> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (patch.name !== undefined) {
    vals.push(patch.name);
    sets.push(`name = $${vals.length}`);
  }
  if (patch.initiative !== undefined) {
    vals.push(patch.initiative);
    sets.push(`initiative = $${vals.length}`);
  }
  if (patch.hp !== undefined) {
    vals.push(patch.hp);
    sets.push(`hp = $${vals.length}`);
  }
  if (sets.length === 0) return;
  vals.push(id);
  await db.execute(
    `UPDATE combatants SET ${sets.join(", ")} WHERE id = $${vals.length}`,
    vals,
  );
}

export async function sqlUpdateArmorSp(
  db: TxLike,
  combatantId: string,
  location: ArmorLocation,
  sp: number,
): Promise<void> {
  const col = location === "head" ? "armor_head_sp" : "armor_body_sp";
  await db.execute(`UPDATE combatants SET ${col} = $1 WHERE id = $2`, [sp, combatantId]);
}

export async function sqlUpdateRangeWeaponAmmo(
  db: TxLike,
  weaponId: string,
  ammo: number,
): Promise<void> {
  await db.execute("UPDATE combatant_range_weapons SET ammo = $1 WHERE id = $2", [
    ammo,
    weaponId,
  ]);
}

// applyDamage updates both hp and the matching armor SP atomically.
export async function sqlApplyDamage(
  db: TxLike,
  combatantId: string,
  hp: number,
  location: ArmorLocation,
  sp: number,
): Promise<void> {
  const armorCol = location === "head" ? "armor_head_sp" : "armor_body_sp";
  await db.execute(
    `UPDATE combatants SET hp = $1, ${armorCol} = $2 WHERE id = $3`,
    [hp, sp, combatantId],
  );
}

// ---- Enemy templates ----

export async function sqlInsertTemplate(
  db: TxLike,
  t: EnemyTemplate,
): Promise<void> {
  await sqlInsertTemplateRow(db, t);
  await sqlInsertTemplateChildren(db, t);
}

async function sqlInsertTemplateRow(db: TxLike, t: EnemyTemplate): Promise<void> {
  await db.execute(
    `INSERT INTO enemy_templates (
       id, name, role, reputation,
       stat_int, stat_ref, stat_dex, stat_tech, stat_cool,
       stat_will, stat_move, stat_body, stat_emp,
       armor_head_name, armor_head_sp, armor_body_name, armor_body_sp,
       gear_json, cyberware_json
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
    [
      t.id,
      t.name,
      t.role,
      t.reputation,
      t.stats.int,
      t.stats.ref,
      t.stats.dex,
      t.stats.tech,
      t.stats.cool,
      t.stats.will,
      t.stats.move,
      t.stats.body,
      t.stats.emp,
      t.armor.head.name,
      t.armor.head.sp,
      t.armor.body.name,
      t.armor.body.sp,
      JSON.stringify(t.gear),
      JSON.stringify(t.cyberware),
    ],
  );
}

async function sqlInsertTemplateChildren(
  db: TxLike,
  t: EnemyTemplate,
): Promise<void> {
  for (let i = 0; i < t.skills.length; i++) {
    const s = t.skills[i];
    await db.execute(
      `INSERT INTO template_skills (id, template_id, name, level, mod, position)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [s.id, t.id, s.name, s.level, s.mod, i],
    );
  }
  for (let i = 0; i < t.weapons.length; i++) {
    const w = t.weapons[i];
    if (isMelee(w)) {
      await db.execute(
        `INSERT INTO template_melee_weapons (
           id, template_id, weapon_template_id, name, weapon_type, quality,
           damage, description, position
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          w.id,
          t.id,
          w.templateId ?? null,
          w.name,
          w.weaponType,
          w.quality,
          w.damage,
          w.description,
          i,
        ],
      );
    } else if (isRange(w)) {
      await db.execute(
        `INSERT INTO template_range_weapons (
           id, template_id, weapon_template_id, name, weapon_type, quality,
           rof, damage, description, ammo, magazine, position
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          w.id,
          t.id,
          w.templateId ?? null,
          w.name,
          w.weaponType,
          w.quality,
          w.rof,
          w.damage,
          w.description,
          w.ammo,
          w.magazine,
          i,
        ],
      );
    }
  }
}

// updateTemplate replaces the entire stat block — simplest correct
// SQL is UPDATE the parent + DELETE children + re-INSERT children.
// Caller wraps in runTx.
export async function sqlUpdateTemplate(
  db: TxLike,
  t: EnemyTemplate,
): Promise<void> {
  await db.execute(
    `UPDATE enemy_templates SET
       name=$1, role=$2, reputation=$3,
       stat_int=$4, stat_ref=$5, stat_dex=$6, stat_tech=$7, stat_cool=$8,
       stat_will=$9, stat_move=$10, stat_body=$11, stat_emp=$12,
       armor_head_name=$13, armor_head_sp=$14, armor_body_name=$15, armor_body_sp=$16,
       gear_json=$17, cyberware_json=$18
     WHERE id=$19`,
    [
      t.name,
      t.role,
      t.reputation,
      t.stats.int,
      t.stats.ref,
      t.stats.dex,
      t.stats.tech,
      t.stats.cool,
      t.stats.will,
      t.stats.move,
      t.stats.body,
      t.stats.emp,
      t.armor.head.name,
      t.armor.head.sp,
      t.armor.body.name,
      t.armor.body.sp,
      JSON.stringify(t.gear),
      JSON.stringify(t.cyberware),
      t.id,
    ],
  );
  await db.execute("DELETE FROM template_skills WHERE template_id = $1", [t.id]);
  await db.execute("DELETE FROM template_melee_weapons WHERE template_id = $1", [t.id]);
  await db.execute("DELETE FROM template_range_weapons WHERE template_id = $1", [t.id]);
  await sqlInsertTemplateChildren(db, t);
}

export async function sqlDeleteTemplate(db: TxLike, id: string): Promise<void> {
  await db.execute("DELETE FROM enemy_templates WHERE id = $1", [id]);
}

// ---- Weapon templates (registry) ----

export async function sqlInsertWeaponTemplate(
  db: TxLike,
  w: WeaponTemplate,
): Promise<void> {
  if (isMelee(w)) {
    await db.execute(
      `INSERT INTO melee_weapon_templates
         (id, name, weapon_type, quality, damage, description)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [w.id, w.name, w.weaponType, w.quality, w.damage, w.description],
    );
    return;
  }
  await db.execute(
    `INSERT INTO range_weapon_templates
       (id, name, weapon_type, quality, rof, damage, description, ammo, magazine)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      w.id,
      w.name,
      w.weaponType,
      w.quality,
      w.rof,
      w.damage,
      w.description,
      w.ammo,
      w.magazine,
    ],
  );
}

// updateWeaponTemplate may change kind (UI exposes a kind toggle), so
// always clear both kind tables before re-inserting into the right one.
// Cheap: each table holds at most one row per id and the registry is
// small. Caller wraps in runTx for atomicity.
export async function sqlReplaceWeaponTemplate(
  db: TxLike,
  w: WeaponTemplate,
): Promise<void> {
  await db.execute("DELETE FROM melee_weapon_templates WHERE id = $1", [w.id]);
  await db.execute("DELETE FROM range_weapon_templates WHERE id = $1", [w.id]);
  await sqlInsertWeaponTemplate(db, w);
}

// We don't know which kind a registry entry is without looking it up,
// so DELETE from both tables. At most one row matches. Caller wraps.
export async function sqlDeleteWeaponTemplate(db: TxLike, id: string): Promise<void> {
  await db.execute("DELETE FROM melee_weapon_templates WHERE id = $1", [id]);
  await db.execute("DELETE FROM range_weapon_templates WHERE id = $1", [id]);
}

// ---- NET architectures ----

export async function sqlInsertNetArchitecture(
  db: TxLike,
  a: NetArchitecture,
): Promise<void> {
  await db.execute("INSERT INTO net_architectures (id, name) VALUES ($1, $2)", [
    a.id,
    a.name,
  ]);
  await sqlInsertNetDemons(db, a.id, a.demons);
  await sqlInsertNetFloors(db, a.id, a.floors);
}

async function sqlInsertNetDemons(
  db: TxLike,
  archId: string,
  demons: NetDemon[],
): Promise<void> {
  for (let i = 0; i < demons.length; i++) {
    const d = demons[i];
    await db.execute(
      `INSERT INTO net_demons
         (id, architecture_id, name, rez, interface, net_actions, combat_number, position)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [d.id, archId, d.name, d.rez, d.interfaceLevel, d.netActions, d.combatNumber, i],
    );
  }
}

async function sqlInsertNetFloors(
  db: TxLike,
  archId: string,
  floors: NetFloor[],
): Promise<void> {
  for (let i = 0; i < floors.length; i++) {
    const f = floors[i];
    await db.execute(
      `INSERT INTO net_floors (id, architecture_id, type, description, dv, position)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [f.id, archId, f.type, f.description, f.dv, i],
    );
  }
}

// Replace-all-children pattern mirrors sqlUpdateTemplate: simplest
// correct shape is UPDATE parent + DELETE children + re-INSERT children.
// Caller wraps in runTx.
export async function sqlUpdateNetArchitecture(
  db: TxLike,
  a: NetArchitecture,
): Promise<void> {
  await db.execute("UPDATE net_architectures SET name=$1 WHERE id=$2", [a.name, a.id]);
  await db.execute("DELETE FROM net_demons WHERE architecture_id = $1", [a.id]);
  await db.execute("DELETE FROM net_floors WHERE architecture_id = $1", [a.id]);
  await sqlInsertNetDemons(db, a.id, a.demons);
  await sqlInsertNetFloors(db, a.id, a.floors);
}

export async function sqlDeleteNetArchitecture(
  db: TxLike,
  id: string,
): Promise<void> {
  await db.execute("DELETE FROM net_architectures WHERE id = $1", [id]);
}
