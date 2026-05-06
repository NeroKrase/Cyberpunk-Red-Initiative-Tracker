import type {
  EnemyTemplate,
  NetArchitecture,
  Session,
  WeaponTemplate,
} from "../types";
import { dbReady } from "./db";
import { sqlLoadAll } from "./sql-read";

export type StoreData = {
  sessions: Session[];
  templates: EnemyTemplate[];
  weaponTemplates: WeaponTemplate[];
  netArchitectures: NetArchitecture[];
};

// Boot with empty arrays; hydrate asynchronously from SQLite once the
// connection resolves. UI reads stay synchronous against this $state
// mirror; the brief empty window before hydration is invisible in
// normal use (sub-100ms on cold boot for typical save sizes).
export const store = $state<StoreData>({
  sessions: [],
  templates: [],
  weaponTemplates: [],
  netArchitectures: [],
});

// Resolves once the hydration pass is done — success, failure, or
// no-db path all unblock it. Mutators await this before any in-memory
// push/splice so a fast click on cold boot can't be overwritten by the
// IIFE's array assignments below.
let resolveStoreReady!: () => void;
export const storeReady: Promise<void> = new Promise((r) => {
  resolveStoreReady = r;
});

(async () => {
  const db = await dbReady;
  if (!db) {
    resolveStoreReady();
    return;
  }
  try {
    const data = await sqlLoadAll(db);
    store.sessions = data.sessions;
    store.templates = data.templates;
    store.weaponTemplates = data.weaponTemplates;
    store.netArchitectures = data.netArchitectures;
  } catch (err) {
    console.error("Failed to hydrate store from SQLite", err);
  } finally {
    resolveStoreReady();
  }
})();
