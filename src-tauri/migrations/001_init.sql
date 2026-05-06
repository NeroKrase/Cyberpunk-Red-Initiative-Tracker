-- Schema v1: thirteen tables, top-level entities own their children via
-- FK + ON DELETE CASCADE. Snapshot rows reference their registry source
-- via *_template_id with ON DELETE SET NULL so deleting a registry entry
-- never damages a combatant snapshot.

PRAGMA foreign_keys = ON;

-- ---- Meta ----

CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ---- Top-level ----

CREATE TABLE sessions (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE encounters (
  id         TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  position   INTEGER NOT NULL
);
CREATE INDEX idx_encounters_session ON encounters(session_id, position);

-- ---- Encounter participants ----

CREATE TABLE players (
  id           TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  initiative   INTEGER NOT NULL,
  position     INTEGER NOT NULL
);
CREATE INDEX idx_players_encounter ON players(encounter_id, position);

CREATE TABLE combatants (
  id           TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  template_id  TEXT REFERENCES enemy_templates(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  initiative   INTEGER NOT NULL,
  hp           INTEGER NOT NULL,
  role         TEXT NOT NULL DEFAULT '',
  reputation   INTEGER NOT NULL DEFAULT 0,
  stat_int     INTEGER NOT NULL DEFAULT 0,
  stat_ref     INTEGER NOT NULL DEFAULT 0,
  stat_dex     INTEGER NOT NULL DEFAULT 0,
  stat_tech    INTEGER NOT NULL DEFAULT 0,
  stat_cool    INTEGER NOT NULL DEFAULT 0,
  stat_will    INTEGER NOT NULL DEFAULT 0,
  stat_move    INTEGER NOT NULL DEFAULT 0,
  stat_body    INTEGER NOT NULL DEFAULT 0,
  stat_emp     INTEGER NOT NULL DEFAULT 0,
  armor_head_name TEXT NOT NULL DEFAULT '',
  armor_head_sp   INTEGER NOT NULL DEFAULT 0,
  armor_body_name TEXT NOT NULL DEFAULT '',
  armor_body_sp   INTEGER NOT NULL DEFAULT 0,
  gear_json      TEXT,
  cyberware_json TEXT,
  position     INTEGER NOT NULL
);
CREATE INDEX idx_combatants_encounter ON combatants(encounter_id, position);

-- ---- Combatant children ----

CREATE TABLE combatant_skills (
  id           TEXT PRIMARY KEY,
  combatant_id TEXT NOT NULL REFERENCES combatants(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  level        INTEGER NOT NULL DEFAULT 0,
  mod          INTEGER NOT NULL DEFAULT 0,
  position     INTEGER NOT NULL
);
CREATE INDEX idx_combatant_skills_combatant ON combatant_skills(combatant_id, position);

CREATE TABLE combatant_melee_weapons (
  id           TEXT PRIMARY KEY,
  combatant_id TEXT NOT NULL REFERENCES combatants(id) ON DELETE CASCADE,
  template_id  TEXT REFERENCES melee_weapon_templates(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  weapon_type  TEXT NOT NULL DEFAULT '',
  quality      TEXT NOT NULL DEFAULT '',
  damage       INTEGER NOT NULL DEFAULT 0,
  description  TEXT NOT NULL DEFAULT '',
  position     INTEGER NOT NULL
);
CREATE INDEX idx_combatant_melee_weapons_combatant
  ON combatant_melee_weapons(combatant_id, position);

CREATE TABLE combatant_range_weapons (
  id           TEXT PRIMARY KEY,
  combatant_id TEXT NOT NULL REFERENCES combatants(id) ON DELETE CASCADE,
  template_id  TEXT REFERENCES range_weapon_templates(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  weapon_type  TEXT NOT NULL DEFAULT '',
  quality      TEXT NOT NULL DEFAULT '',
  rof          INTEGER NOT NULL DEFAULT 1,
  damage       INTEGER NOT NULL DEFAULT 0,
  description  TEXT NOT NULL DEFAULT '',
  ammo         INTEGER NOT NULL DEFAULT 0,
  magazine     INTEGER NOT NULL DEFAULT 0,
  position     INTEGER NOT NULL
);
CREATE INDEX idx_combatant_range_weapons_combatant
  ON combatant_range_weapons(combatant_id, position);

-- ---- Bestiary NPCs ----

CREATE TABLE enemy_templates (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT '',
  reputation  INTEGER NOT NULL DEFAULT 0,
  stat_int    INTEGER NOT NULL DEFAULT 0,
  stat_ref    INTEGER NOT NULL DEFAULT 0,
  stat_dex    INTEGER NOT NULL DEFAULT 0,
  stat_tech   INTEGER NOT NULL DEFAULT 0,
  stat_cool   INTEGER NOT NULL DEFAULT 0,
  stat_will   INTEGER NOT NULL DEFAULT 0,
  stat_move   INTEGER NOT NULL DEFAULT 0,
  stat_body   INTEGER NOT NULL DEFAULT 0,
  stat_emp    INTEGER NOT NULL DEFAULT 0,
  armor_head_name TEXT NOT NULL DEFAULT '',
  armor_head_sp   INTEGER NOT NULL DEFAULT 0,
  armor_body_name TEXT NOT NULL DEFAULT '',
  armor_body_sp   INTEGER NOT NULL DEFAULT 0,
  gear_json      TEXT,
  cyberware_json TEXT
);

CREATE TABLE template_skills (
  id          TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES enemy_templates(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  level       INTEGER NOT NULL DEFAULT 0,
  mod         INTEGER NOT NULL DEFAULT 0,
  position    INTEGER NOT NULL
);
CREATE INDEX idx_template_skills_template ON template_skills(template_id, position);

CREATE TABLE template_melee_weapons (
  id                 TEXT PRIMARY KEY,
  template_id        TEXT NOT NULL REFERENCES enemy_templates(id) ON DELETE CASCADE,
  weapon_template_id TEXT REFERENCES melee_weapon_templates(id) ON DELETE SET NULL,
  name               TEXT NOT NULL,
  weapon_type        TEXT NOT NULL DEFAULT '',
  quality            TEXT NOT NULL DEFAULT '',
  damage             INTEGER NOT NULL DEFAULT 0,
  description        TEXT NOT NULL DEFAULT '',
  position           INTEGER NOT NULL
);
CREATE INDEX idx_template_melee_weapons_template
  ON template_melee_weapons(template_id, position);

CREATE TABLE template_range_weapons (
  id                 TEXT PRIMARY KEY,
  template_id        TEXT NOT NULL REFERENCES enemy_templates(id) ON DELETE CASCADE,
  weapon_template_id TEXT REFERENCES range_weapon_templates(id) ON DELETE SET NULL,
  name               TEXT NOT NULL,
  weapon_type        TEXT NOT NULL DEFAULT '',
  quality            TEXT NOT NULL DEFAULT '',
  rof                INTEGER NOT NULL DEFAULT 1,
  damage             INTEGER NOT NULL DEFAULT 0,
  description        TEXT NOT NULL DEFAULT '',
  ammo               INTEGER NOT NULL DEFAULT 0,
  magazine           INTEGER NOT NULL DEFAULT 0,
  position           INTEGER NOT NULL
);
CREATE INDEX idx_template_range_weapons_template
  ON template_range_weapons(template_id, position);

-- ---- Weapon registry ----

CREATE TABLE melee_weapon_templates (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  weapon_type TEXT NOT NULL DEFAULT '',
  quality     TEXT NOT NULL DEFAULT '',
  damage      INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE range_weapon_templates (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  weapon_type TEXT NOT NULL DEFAULT '',
  quality     TEXT NOT NULL DEFAULT '',
  rof         INTEGER NOT NULL DEFAULT 1,
  damage      INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  ammo        INTEGER NOT NULL DEFAULT 0,
  magazine    INTEGER NOT NULL DEFAULT 0
);
