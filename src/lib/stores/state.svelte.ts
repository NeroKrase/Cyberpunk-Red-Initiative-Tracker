import type { EnemyTemplate, Session, WeaponTemplate } from "../types";
import { dbReady } from "./db";
import { sqlLoadAll } from "./sql-read";

export type StoreData = {
  sessions: Session[];
  templates: EnemyTemplate[];
  weaponTemplates: WeaponTemplate[];
};

// Boot with empty arrays; hydrate asynchronously from SQLite once the
// connection resolves. UI reads stay synchronous against this $state
// mirror; the brief empty window before hydration is invisible in
// normal use (sub-100ms on cold boot for typical save sizes).
export const store = $state<StoreData>({
  sessions: [],
  templates: [],
  weaponTemplates: [],
});

(async () => {
  const db = await dbReady;
  if (!db) return;
  try {
    const data = await sqlLoadAll(db);
    store.sessions = data.sessions;
    store.templates = data.templates;
    store.weaponTemplates = data.weaponTemplates;
  } catch (err) {
    console.error("Failed to hydrate store from SQLite", err);
  }
})();
