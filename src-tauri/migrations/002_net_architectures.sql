PRAGMA foreign_keys = ON;

CREATE TABLE net_architectures (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL
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

CREATE TABLE net_demons (
  id              TEXT PRIMARY KEY,
  architecture_id TEXT NOT NULL REFERENCES net_architectures(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT '',
  rez             INTEGER NOT NULL DEFAULT 0,
  interface       INTEGER NOT NULL DEFAULT 0,
  net_actions     INTEGER NOT NULL DEFAULT 0,
  combat_number   INTEGER NOT NULL DEFAULT 0,
  position        INTEGER NOT NULL
);
CREATE INDEX idx_net_demons_arch ON net_demons(architecture_id, position);
