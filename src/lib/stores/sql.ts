import type Database from "@tauri-apps/plugin-sql";
import type {
  ArmorLocation,
  Combatant,
  Encounter,
  Enemy,
  EnemyTemplate,
  Session,
  Weapon,
  WeaponTemplate,
} from "../types";
import { isMelee, isRange } from "../types";

// Wrap a sequence of writes in a single SQLite transaction. Throws on
// any inner failure with ROLLBACK already issued, so callers see a
// rejected promise without leaving the DB in a half-written state.
export async function runTx<T>(
  db: Database,
  fn: () => Promise<T>,
): Promise<T> {
  await db.execute("BEGIN");
  try {
    const result = await fn();
    await db.execute("COMMIT");
    return result;
  } catch (err) {
    await db.execute("ROLLBACK");
    throw err;
  }
}

// ---- Sessions ----

// Caller wraps in runTx for atomicity; inner helpers stay tx-free so
// they can be composed without nesting (SQLite has no nested txs).
export async function sqlInsertSession(db: Database, s: Session): Promise<void> {
  await db.execute("INSERT INTO sessions (id, name) VALUES ($1, $2)", [s.id, s.name]);
  for (let i = 0; i < s.encounters.length; i++) {
    await sqlInsertEncounterDeep(db, s.id, s.encounters[i], i);
  }
}

export async function sqlUpdateSessionName(
  db: Database,
  id: string,
  name: string,
): Promise<void> {
  await db.execute("UPDATE sessions SET name = $1 WHERE id = $2", [name, id]);
}

// Cascades clean up encounters / players / combatants / their children.
export async function sqlDeleteSession(db: Database, id: string): Promise<void> {
  await db.execute("DELETE FROM sessions WHERE id = $1", [id]);
}

// ---- Encounters ----

export async function sqlInsertEncounterDeep(
  db: Database,
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
  db: Database,
  id: string,
  name: string,
): Promise<void> {
  await db.execute("UPDATE encounters SET name = $1 WHERE id = $2", [name, id]);
}

export async function sqlDeleteEncounter(db: Database, id: string): Promise<void> {
  await db.execute("DELETE FROM encounters WHERE id = $1", [id]);
}

// Sync encounter positions to match the in-memory order. Used after a
// splice / delete that shifted siblings.
export async function sqlRenumberEncounters(
  db: Database,
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
  db: Database,
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
  db: Database,
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
  db: Database,
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
  db: Database,
  kind: "pc" | "enemy",
  id: string,
): Promise<void> {
  const table = kind === "pc" ? "players" : "combatants";
  await db.execute(`DELETE FROM ${table} WHERE id = $1`, [id]);
}

export async function sqlRenumberCombatants(
  db: Database,
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
  db: Database,
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
  db: Database,
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
  db: Database,
  combatantId: string,
  location: ArmorLocation,
  sp: number,
): Promise<void> {
  const col = location === "head" ? "armor_head_sp" : "armor_body_sp";
  await db.execute(`UPDATE combatants SET ${col} = $1 WHERE id = $2`, [sp, combatantId]);
}

export async function sqlUpdateRangeWeaponAmmo(
  db: Database,
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
  db: Database,
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
  db: Database,
  t: EnemyTemplate,
): Promise<void> {
  await sqlInsertTemplateRow(db, t);
  await sqlInsertTemplateChildren(db, t);
}

async function sqlInsertTemplateRow(db: Database, t: EnemyTemplate): Promise<void> {
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
  db: Database,
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
  db: Database,
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

export async function sqlDeleteTemplate(db: Database, id: string): Promise<void> {
  await db.execute("DELETE FROM enemy_templates WHERE id = $1", [id]);
}

// ---- Weapon templates (registry) ----

export async function sqlInsertWeaponTemplate(
  db: Database,
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
  db: Database,
  w: WeaponTemplate,
): Promise<void> {
  await db.execute("DELETE FROM melee_weapon_templates WHERE id = $1", [w.id]);
  await db.execute("DELETE FROM range_weapon_templates WHERE id = $1", [w.id]);
  await sqlInsertWeaponTemplate(db, w);
}

// We don't know which kind a registry entry is without looking it up,
// so DELETE from both tables. At most one row matches. Caller wraps.
export async function sqlDeleteWeaponTemplate(db: Database, id: string): Promise<void> {
  await db.execute("DELETE FROM melee_weapon_templates WHERE id = $1", [id]);
  await db.execute("DELETE FROM range_weapon_templates WHERE id = $1", [id]);
}
