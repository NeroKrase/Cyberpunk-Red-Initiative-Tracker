# Migration to SQLite — Plan

A staged migration from localStorage to a normalized SQLite schema using `tauri-plugin-sql`. Each stage is independently shippable and reversible.

**Status: shipped.** All three stages landed on chained branches (`feat/sqlite-stage-a-split-stores` → `…stage-b-dual-write` → `…stage-c-cutover`). The Stage B branch was tested manually before the Stage C cutover.

## 1. Delivery process

Three stages, in order. Each is a separate branch chained off the previous one. Stage D was considered and dropped — see "Why no Stage D" below.

### Stage A — Split the store file (pure refactor) — ✅ shipped

Refactor `src/lib/store.svelte.ts` into per-entity files. Same `$state` shape, same single localStorage key, same sync API, same call sites unchanged. No persistence-format changes — that work all moves into Stage B's importer, which can read the existing combined key directly.

- `src/lib/stores/persist.ts` — pure localStorage IO: `load()` / `save(data)` against the existing combined `cpr-initiative-tracker/v1` key.
- `src/lib/stores/migrations.ts` — data-shape migrations lifted from the current store (`migrateStatBlock`, `migrateCombatant`, `migrateWeapon`, `migrateWeaponTemplate`). Used by `persist.load()` only; gets removed in Stage C once the legacy reader is gone.
- `src/lib/stores/state.svelte.ts` — owns the single shared `$state` `store` object; runs `persist.load()` + migrations at module init.
- `src/lib/stores/sessions.svelte.ts` — sessions + encounters + combatants + players mutators.
- `src/lib/stores/templates.svelte.ts` — enemy template mutators.
- `src/lib/stores/weaponTemplates.svelte.ts` — weapon template mutators.
- `src/lib/store.svelte.ts` — becomes a barrel re-exporting from per-entity stores; `store` itself is re-exported from `state.svelte.ts` so existing UI access (`store.sessions[i]`, etc.) keeps working unchanged.

### Stage B — Add SQLite, dual-write (API becomes async) — ✅ shipped

Populate SQLite in parallel. Reads continue from the in-memory `$state`; writes hit **both** localStorage and SQLite so the DB stays current as the app is used.

- Add `@tauri-apps/plugin-sql` (JS) and the Rust crate (`tauri-plugin-sql` with the `sqlite` feature).
- Register the plugin in `src-tauri/src/lib.rs` and allow the capability in `src-tauri/capabilities/`.
- Define the schema as a Tauri SQL migration (`src-tauri/migrations/001_init.sql`).
- `src/lib/stores/db.ts` — open the connection at boot, run migrations. Guards: `tauri-plugin-sql` only works in the Tauri webview, so SSR/prerender paths must short-circuit (mirror the existing `typeof localStorage === "undefined"` guard in `persist.ts`).
- `src/lib/stores/import-legacy.ts` — one-shot importer that reads the combined localStorage key, inserts into SQLite (translating denormalized JSON into the 13-table layout), and writes a sentinel to a `meta` table so it never re-runs. The localStorage key stays in place after import so the dual-write has a target until Stage C.
- **API change in this stage (intentional):** mutators become `async` because SQLite writes are async and we will not fire-and-forget them (race conditions, lost writes on crash). Every call site of `$lib/store.svelte` (10 files) gets `await` added. Treating dual-write as the API break — instead of deferring the break to Stage C — means Stage C is purely "delete the localStorage half," with no call-site churn.

### Stage C — Switch persistence to SQLite (deletion only) — ✅ shipped

- Drop `save()` calls to localStorage in every mutator; drop the initial `persist.load()` at boot.
- Delete `persist.ts`, `migrations.ts`, and `import-legacy.ts` (the importer's source data is gone now that persist is, and Stage B's run already populated the DB and set the sentinel).
- Drop the dual-write branch in each mutator; the SQLite write becomes the only write.
- New module `src/lib/stores/sql-read.ts` — `sqlLoadAll(db)` reads all 13 tables in parallel and assembles the in-memory shape; `state.svelte.ts` boots with empty arrays and async-hydrates the `$state` mirror from this single call.
- Heavy-transaction mutators (each wraps writes in a single transaction via `runTx`):
  - `addCombatant({kind:"enemy"})` — inserts `combatants` + N `combatant_skills` + M `combatant_melee_weapons` / `combatant_range_weapons` (cloned from the chosen template, with reassigned ids so two enemies from the same template don't collide on PK).
  - `duplicateSession` — recursive: encounters → combatants → skills + weapons. Heaviest single mutator.
  - `duplicateEncounter` — same recursion below the encounter, plus a `sqlRenumberEncounters` after the splice insert.
  - `duplicateTemplate` — template + its skills + its melee + its range weapons.
  - Reorder mutators (`deleteEncounter`, `removeCombatant`) — renumber `position` on the surviving siblings via `sqlRenumberEncounters` / `sqlRenumberCombatants` (dense positions; sparse would defer this but complicate inserts).
- Reads stay synchronous because they're served from the in-memory `$state` mirror, which is hydrated once at boot. UI shows empty lists for the brief pre-hydration window — invisible in normal use (sub-100ms on cold boot for typical save sizes).
- The accumulated localStorage entry under `cpr-initiative-tracker/v1` is left in place — harmless, and a useful belt-and-braces backup if the SQLite file ever needs recovery.

### Why no Stage D

The original draft included a "drop the in-memory mirror" stage. Dropping `$state` would make every reactive read async — `{#each store.sessions as s}` and every derived computation would need rework. That's not an optional follow-up; it's a UI rewrite. Skip until measured perf pain justifies it, and treat it as its own project.

---

## 2. Tables

Thirteen tables, grouped by purpose. Top-level entities own their children via FK + `ON DELETE CASCADE`.

| Group | Table | Owns / Notes |
| --- | --- | --- |
| Top-level | `sessions` | id, name, created_at |
|  | `encounters` | scoped to a session |
| Encounter participants (PC/enemy split) | `players` | PCs in an encounter — minimal shape |
|  | `combatants` | enemy instances in an encounter |
| Combatant children | `combatant_skills` | skills carried by an enemy combatant |
|  | `combatant_melee_weapons` | melee weapon instances |
|  | `combatant_range_weapons` | range weapon instances |
| Bestiary NPCs | `enemy_templates` | name + role + stats + JSON blobs |
|  | `template_skills` | skills attached to a template |
|  | `template_melee_weapons` | melee weapons attached to a template |
|  | `template_range_weapons` | range weapons attached to a template |
| Weapon registry | `melee_weapon_templates` | bestiary melee registry |
|  | `range_weapon_templates` | bestiary range registry |

### Schema sketch

```sql
-- ---- Top-level ----

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE encounters (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL
);
CREATE INDEX idx_encounters_session ON encounters(session_id, position);

-- ---- Encounter participants ----

CREATE TABLE players (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  initiative INTEGER NOT NULL,
  position INTEGER NOT NULL
);
CREATE INDEX idx_players_encounter ON players(encounter_id, position);

CREATE TABLE combatants (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  template_id TEXT REFERENCES enemy_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  initiative INTEGER NOT NULL,
  hp INTEGER NOT NULL,
  role TEXT,
  reputation INTEGER NOT NULL DEFAULT 0,
  stat_int  INTEGER NOT NULL DEFAULT 0,
  stat_ref  INTEGER NOT NULL DEFAULT 0,
  stat_dex  INTEGER NOT NULL DEFAULT 0,
  stat_tech INTEGER NOT NULL DEFAULT 0,
  stat_cool INTEGER NOT NULL DEFAULT 0,
  stat_will INTEGER NOT NULL DEFAULT 0,
  stat_move INTEGER NOT NULL DEFAULT 0,
  stat_body INTEGER NOT NULL DEFAULT 0,
  stat_emp  INTEGER NOT NULL DEFAULT 0,
  armor_head_name TEXT NOT NULL DEFAULT '',
  armor_head_sp   INTEGER NOT NULL DEFAULT 0,
  armor_body_name TEXT NOT NULL DEFAULT '',
  armor_body_sp   INTEGER NOT NULL DEFAULT 0,
  gear_json      TEXT,
  cyberware_json TEXT,
  position INTEGER NOT NULL
);
CREATE INDEX idx_combatants_encounter ON combatants(encounter_id, position);

-- ---- Combatant children ----

CREATE TABLE combatant_skills (
  id TEXT PRIMARY KEY,
  combatant_id TEXT NOT NULL REFERENCES combatants(id) ON DELETE CASCADE,
  name  TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  mod   INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL
);
CREATE INDEX idx_combatant_skills_combatant ON combatant_skills(combatant_id, position);

CREATE TABLE combatant_melee_weapons (
  id TEXT PRIMARY KEY,
  combatant_id TEXT NOT NULL REFERENCES combatants(id) ON DELETE CASCADE,
  template_id  TEXT REFERENCES melee_weapon_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  weapon_type TEXT,
  quality TEXT,
  damage INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  position INTEGER NOT NULL
);
CREATE INDEX idx_combatant_melee_weapons_combatant
  ON combatant_melee_weapons(combatant_id, position);

CREATE TABLE combatant_range_weapons (
  id TEXT PRIMARY KEY,
  combatant_id TEXT NOT NULL REFERENCES combatants(id) ON DELETE CASCADE,
  template_id  TEXT REFERENCES range_weapon_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  weapon_type TEXT,
  quality TEXT,
  rof INTEGER NOT NULL DEFAULT 1,
  damage INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  ammo     INTEGER NOT NULL DEFAULT 0,
  magazine INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL
);
CREATE INDEX idx_combatant_range_weapons_combatant
  ON combatant_range_weapons(combatant_id, position);

-- ---- Bestiary NPCs ----

CREATE TABLE enemy_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  reputation INTEGER NOT NULL DEFAULT 0,
  stat_int  INTEGER NOT NULL DEFAULT 0,
  stat_ref  INTEGER NOT NULL DEFAULT 0,
  stat_dex  INTEGER NOT NULL DEFAULT 0,
  stat_tech INTEGER NOT NULL DEFAULT 0,
  stat_cool INTEGER NOT NULL DEFAULT 0,
  stat_will INTEGER NOT NULL DEFAULT 0,
  stat_move INTEGER NOT NULL DEFAULT 0,
  stat_body INTEGER NOT NULL DEFAULT 0,
  stat_emp  INTEGER NOT NULL DEFAULT 0,
  armor_head_name TEXT NOT NULL DEFAULT '',
  armor_head_sp   INTEGER NOT NULL DEFAULT 0,
  armor_body_name TEXT NOT NULL DEFAULT '',
  armor_body_sp   INTEGER NOT NULL DEFAULT 0,
  gear_json      TEXT,
  cyberware_json TEXT
);

CREATE TABLE template_skills (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES enemy_templates(id) ON DELETE CASCADE,
  name  TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  mod   INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL
);
CREATE INDEX idx_template_skills_template ON template_skills(template_id, position);

CREATE TABLE template_melee_weapons (
  id TEXT PRIMARY KEY,
  template_id        TEXT NOT NULL REFERENCES enemy_templates(id)        ON DELETE CASCADE,
  weapon_template_id TEXT REFERENCES melee_weapon_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  weapon_type TEXT,
  quality TEXT,
  damage INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  position INTEGER NOT NULL
);
CREATE INDEX idx_template_melee_weapons_template
  ON template_melee_weapons(template_id, position);

CREATE TABLE template_range_weapons (
  id TEXT PRIMARY KEY,
  template_id        TEXT NOT NULL REFERENCES enemy_templates(id)        ON DELETE CASCADE,
  weapon_template_id TEXT REFERENCES range_weapon_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  weapon_type TEXT,
  quality TEXT,
  rof INTEGER NOT NULL DEFAULT 1,
  damage INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  ammo     INTEGER NOT NULL DEFAULT 0,
  magazine INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL
);
CREATE INDEX idx_template_range_weapons_template
  ON template_range_weapons(template_id, position);

-- ---- Weapon registry ----

CREATE TABLE melee_weapon_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  weapon_type TEXT,
  quality TEXT,
  damage INTEGER NOT NULL DEFAULT 0,
  description TEXT
);

CREATE TABLE range_weapon_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  weapon_type TEXT,
  quality TEXT,
  rof INTEGER NOT NULL DEFAULT 1,
  damage INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  ammo     INTEGER NOT NULL DEFAULT 0,
  magazine INTEGER NOT NULL DEFAULT 0
);
```

### Schema decisions worth calling out

- **No polymorphic ownership.** Every child row points to exactly one parent table via a single FK. The cost is two parallel sets of weapon/skill tables (combatant-side, template-side); the benefit is real referential integrity.
- **Weapons split by kind (melee / range).** Melee and range carry different mechanics today (range has `rof`, `ammo`, `magazine`; melee doesn't), and weapon attachments / tech upgrades planned for later are also kind-specific. The split lays the foundation for those.
- **Stats inlined as nine columns** (`stat_int`, `stat_ref`, …, `stat_emp`). They're always co-fetched, fixed-shape, never queried independently. Unrolling avoids one join per row read.
- **Max HP is not stored** — it stays a derived `maxHpFromStats(stats)` call at the display site. Pure function of `body + will`; storing it would mean keeping it in sync on every stat edit. If a manual override ever becomes a CP Red rule, add a nullable `max_hp_override` later and coalesce.
- **Armor inlined as four columns** (`armor_head_name`, `armor_head_sp`, `armor_body_name`, `armor_body_sp`). Shape is fixed (always head + body), and SP is mutated on every damage tick by `applyDamage`. Inlining lets the hot path be a single-column UPDATE instead of read-parse-mutate-serialize-write on a JSON blob.
- **`gear_json` / `cyberware_json` are JSON strings on the parent for now.** Both are `string[]` today with no per-element queries. Planned to graduate into proper child tables in a later migration if entries grow structure.
- **PCs and enemies in separate tables.** Saves a pile of NULL-padded enemy columns on PC rows; encounter view becomes two queries merged in app code by initiative.
- **Snapshot weapons reference their registry source via `template_id` / `weapon_template_id`.** `ON DELETE SET NULL` so deleting a registry entry doesn't damage existing combatants — they keep their current shape, just lose the lineage pointer.
- **Position columns** on every child table, dense (0, 1, 2, …). SQLite doesn't guarantee insertion order; explicit positions also let us reorder without rewriting parent rows. Trade-off of dense over sparse: a reorder renumbers N siblings instead of one row, but inserts stay simple and the row counts here are small (skills/weapons per combatant in the single digits).
- **`ON DELETE CASCADE`** on parent → child everywhere except the registry/lineage refs above. Deleting a session cleans up everything under it in one transaction.

---

## 3. Proposed changes

### New files (across stages)

| File | Stage | Purpose |
| --- | --- | --- |
| `src/lib/stores/persist.ts` | A | localStorage IO (single combined key) |
| `src/lib/stores/migrations.ts` | A | data-shape migrations (lifted from current store) |
| `src/lib/stores/state.svelte.ts` | A | owns the shared `$state` `store` object |
| `src/lib/stores/sessions.svelte.ts` | A | sessions + encounters + players + combatants mutators |
| `src/lib/stores/templates.svelte.ts` | A | enemy template mutators |
| `src/lib/stores/weaponTemplates.svelte.ts` | A | weapon template mutators |
| `src/lib/stores/db.ts` | B | open SQLite connection, run migrations |
| `src/lib/stores/import-legacy.ts` | B | one-shot localStorage → SQLite import |
| `src-tauri/migrations/001_init.sql` | B | the 13-table schema above |

### Modified files

| File | Stage | Change |
| --- | --- | --- |
| `src/lib/store.svelte.ts` | A | becomes a barrel re-exporting per-entity stores + `store` |
| `src-tauri/Cargo.toml` | B | add `tauri-plugin-sql` dep |
| `src-tauri/src/lib.rs` | B | register the plugin |
| `src-tauri/capabilities/*.json` | B | allow `sql:default` |
| `package.json` | B | add `@tauri-apps/plugin-sql` |
| All call sites of `$lib/store.svelte` (10 files) | B | add `await` to mutator calls |
| Per-entity store files | C | drop localStorage `save()` calls; drop legacy load |
| `src/lib/stores/persist.ts`, `migrations.ts` | C | deleted |

### API changes

- **Stage A:** none. Same exports, same signatures, same call sites.
- **Stage B:** every write mutator returns `Promise<…>` (dual-write requires `await`-ing the SQLite call). Reads stay synchronous — served from in-memory `$state`. All 10 call sites get `await` added in this stage.
- **Stage C:** no further API changes. Just deletion of the localStorage half.

### Out of scope

- Export / import UX
- Search across templates
- Sync / cloud
- Schema versioning beyond v1
- Weapon attachments and tech upgrades (kind-specific tables already laid out to receive them later)
- Normalizing `armor_json` / `gear_json` / `cyberware_json` into proper child tables (planned follow-up)
