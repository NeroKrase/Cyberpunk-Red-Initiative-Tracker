-- Schema v3: promote demons from inline columns on net_architectures
-- to a child table so a single architecture can host many demons.
--
-- Backfill copies any existing single-demon row (v2 stored at most one)
-- into the new table at position 0, then drops the now-unused columns.

PRAGMA foreign_keys = ON;

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

-- Backfill from the v2 inline columns. The id is a 32-hex random string —
-- one-time migrated rows don't need to match the JS-generated UUID format
-- since both store as opaque TEXT.
INSERT INTO net_demons (id, architecture_id, name, rez, interface, net_actions, combat_number, position)
SELECT
  lower(hex(randomblob(16))),
  id,
  COALESCE(demon_name, ''),
  COALESCE(demon_rez, 0),
  COALESCE(demon_interface, 0),
  COALESCE(demon_net_actions, 0),
  COALESCE(demon_combat_number, 0),
  0
FROM net_architectures
WHERE demon_name IS NOT NULL;

-- ALTER TABLE DROP COLUMN: SQLite ≥ 3.35 (March 2021). Tauri's bundled
-- sqlite is well past this. Each DROP triggers an internal table rebuild;
-- net_architectures is tiny so 5 sequential drops are fine.
ALTER TABLE net_architectures DROP COLUMN demon_name;
ALTER TABLE net_architectures DROP COLUMN demon_rez;
ALTER TABLE net_architectures DROP COLUMN demon_interface;
ALTER TABLE net_architectures DROP COLUMN demon_net_actions;
ALTER TABLE net_architectures DROP COLUMN demon_combat_number;
