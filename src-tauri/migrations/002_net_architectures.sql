PRAGMA foreign_keys = ON;

CREATE TABLE net_architectures (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  demon_name          TEXT,
  demon_rez           INTEGER,
  demon_interface     INTEGER,
  demon_net_actions   INTEGER,
  demon_combat_number INTEGER
  -- demon_* all-or-nothing: NULL ⇒ no demon installed
);

CREATE TABLE net_floors (
  id              TEXT PRIMARY KEY,
  architecture_id TEXT NOT NULL REFERENCES net_architectures(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  dv              INTEGER,
  position        INTEGER NOT NULL
);
CREATE INDEX idx_net_floors_arch ON net_floors(architecture_id, position);
