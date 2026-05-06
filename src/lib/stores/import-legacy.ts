import type Database from "@tauri-apps/plugin-sql";
import type { StoreData } from "./persist";
import {
  runTx,
  sqlInsertSession,
  sqlInsertTemplate,
  sqlInsertWeaponTemplate,
} from "./sql";

const SENTINEL_KEY = "legacy_imported";

// One-shot: copies the in-memory snapshot (already loaded from
// localStorage by persist.load) into SQLite, then writes a sentinel so
// it never re-runs. The whole import is one transaction so a partial
// failure leaves the DB empty and the sentinel unset, letting the next
// boot retry cleanly.
export async function importLegacyIfNeeded(
  db: Database,
  snapshot: StoreData,
): Promise<void> {
  const existing = await db.select<{ value: string }[]>(
    "SELECT value FROM meta WHERE key = $1",
    [SENTINEL_KEY],
  );
  if (existing.length > 0) return;

  await runTx(db, async (tx) => {
    for (const s of snapshot.sessions) {
      await sqlInsertSession(tx, s);
    }
    for (const t of snapshot.templates) {
      await sqlInsertTemplate(tx, t);
    }
    for (const w of snapshot.weaponTemplates) {
      await sqlInsertWeaponTemplate(tx, w);
    }
    await tx.execute("INSERT INTO meta (key, value) VALUES ($1, $2)", [
      SENTINEL_KEY,
      "true",
    ]);
  });
}
