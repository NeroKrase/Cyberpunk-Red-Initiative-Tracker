-- Adds a `loaded` column to template_range_weapons so NPC bestiary
-- templates can carry "currently loaded in magazine" separately from
-- `ammo` (which now represents spare rounds in inventory). Existing
-- rows backfill loaded = magazine (assume fully loaded).

ALTER TABLE template_range_weapons
  ADD COLUMN loaded INTEGER NOT NULL DEFAULT 0;

UPDATE template_range_weapons SET loaded = magazine;
