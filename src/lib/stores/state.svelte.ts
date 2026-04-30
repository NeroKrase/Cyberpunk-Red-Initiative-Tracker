import type Database from "@tauri-apps/plugin-sql";
import { dbReady } from "./db";
import { importLegacyIfNeeded } from "./import-legacy";
import { load as persistLoad, save as persistSave, type StoreData } from "./persist";

export const store = $state<StoreData>(persistLoad());

export function save() {
  persistSave({
    sessions: store.sessions,
    templates: store.templates,
    weaponTemplates: store.weaponTemplates,
  });
}

// Resolves with the live Database (or null in SSR / non-Tauri / failed
// import) once the one-shot legacy import has settled. Mutator
// dual-writes await this so they don't race the importer's insert
// loop on first boot.
export const dbWriteReady: Promise<Database | null> = (async () => {
  const db = await dbReady;
  if (!db) return null;
  try {
    // Shallow array copies so mutations during the import don't shift
    // the iteration set out from under the importer; new rows added
    // after this snapshot are persisted by the mutator's own dual-write
    // after dbWriteReady resolves.
    await importLegacyIfNeeded(db, {
      sessions: [...store.sessions],
      templates: [...store.templates],
      weaponTemplates: [...store.weaponTemplates],
    });
    return db;
  } catch (err) {
    console.error("Legacy import failed; SQLite writes disabled this session", err);
    return null;
  }
})();
