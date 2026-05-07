import type { NetArchitecture } from "../types";
import { dbReady } from "./db";
import { store, storeReady } from "./state.svelte";
import {
  runTx,
  sqlDeleteNetArchitecture,
  sqlInsertNetArchitecture,
  sqlUpdateNetArchitecture,
} from "./sql";

export type NetArchitectureInput = Omit<NetArchitecture, "id">;

export async function createNetArchitecture(
  data: NetArchitectureInput,
): Promise<NetArchitecture> {
  await storeReady;
  const arch: NetArchitecture = {
    id: crypto.randomUUID(),
    ...cloneArchitectureInput(data),
  };
  store.netArchitectures.push(arch);
  const db = await dbReady;
  if (db) await runTx(db, (tx) => sqlInsertNetArchitecture(tx, arch));
  return arch;
}

export function getNetArchitecture(id: string): NetArchitecture | undefined {
  return store.netArchitectures.find((a) => a.id === id);
}

export async function updateNetArchitecture(
  id: string,
  data: NetArchitectureInput,
): Promise<void> {
  await storeReady;
  const arch = getNetArchitecture(id);
  if (!arch) return;
  Object.assign(arch, cloneArchitectureInput(data));
  const db = await dbReady;
  if (db) await runTx(db, (tx) => sqlUpdateNetArchitecture(tx, arch));
}

export async function deleteNetArchitecture(id: string): Promise<void> {
  await storeReady;
  const idx = store.netArchitectures.findIndex((a) => a.id === id);
  if (idx === -1) return;
  store.netArchitectures.splice(idx, 1);
  const db = await dbReady;
  if (db) await sqlDeleteNetArchitecture(db, id);
}

export async function duplicateNetArchitecture(
  id: string,
): Promise<NetArchitecture | undefined> {
  await storeReady;
  const arch = getNetArchitecture(id);
  if (!arch) return;
  const clone = JSON.parse(JSON.stringify(arch)) as NetArchitecture;
  clone.id = crypto.randomUUID();
  clone.name = `${arch.name}_dup`;
  // Child ids must be regenerated so they don't collide with the source
  // architecture (PRIMARY KEY on net_demons.id and net_floors.id).
  for (const d of clone.demons) d.id = crypto.randomUUID();
  for (const f of clone.floors) f.id = crypto.randomUUID();
  const idx = store.netArchitectures.indexOf(arch);
  store.netArchitectures.splice(idx + 1, 0, clone);
  const db = await dbReady;
  if (db) await runTx(db, (tx) => sqlInsertNetArchitecture(tx, clone));
  return clone;
}

function cloneArchitectureInput(data: NetArchitectureInput): NetArchitectureInput {
  return JSON.parse(JSON.stringify(data)) as NetArchitectureInput;
}

// Re-sync the in-memory architecture (already mutated by inline editing)
// to SQLite. Used by the inline editor where bound inputs mutate the
// store object directly via $state proxies — only the DB layer still
// needs an explicit push. No-op when there's no Tauri runtime.
export async function persistNetArchitecture(id: string): Promise<void> {
  await storeReady;
  const arch = getNetArchitecture(id);
  if (!arch) return;
  const db = await dbReady;
  if (db) await runTx(db, (tx) => sqlUpdateNetArchitecture(tx, arch));
}
