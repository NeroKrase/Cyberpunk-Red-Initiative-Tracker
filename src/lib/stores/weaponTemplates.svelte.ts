import type { WeaponTemplate } from "../types";
import { dbWriteReady, store, save } from "./state.svelte";
import {
  runTx,
  sqlDeleteWeaponTemplate,
  sqlInsertWeaponTemplate,
  sqlReplaceWeaponTemplate,
} from "./sql";

// Distribute Omit across the discriminated union so the resulting type
// preserves kind narrowing (Omit<A | B, "id"> on its own collapses to a
// non-discriminated shape).
type DistributiveOmit<T, K extends keyof any> = T extends unknown
  ? Omit<T, K>
  : never;

export type WeaponTemplateInput = DistributiveOmit<WeaponTemplate, "id">;

export async function createWeaponTemplate(
  data: WeaponTemplateInput,
): Promise<WeaponTemplate> {
  const id = crypto.randomUUID();
  // Spread + id over a discriminated-union input loses narrowing in TS, so
  // assert the resulting shape — the caller already chose a kind in `data`.
  const template = { id, ...data } as WeaponTemplate;
  store.weaponTemplates.push(template);
  save();
  const db = await dbWriteReady;
  if (db) await sqlInsertWeaponTemplate(db, template);
  return template;
}

export function getWeaponTemplate(id: string): WeaponTemplate | undefined {
  return store.weaponTemplates.find((t) => t.id === id);
}

export async function updateWeaponTemplate(
  id: string,
  data: WeaponTemplateInput,
): Promise<void> {
  const template = getWeaponTemplate(id);
  if (!template) return;
  Object.assign(template, data);
  save();
  const db = await dbWriteReady;
  // Kind may have changed; sqlReplaceWeaponTemplate clears both kind
  // tables before inserting into the right one.
  if (db) await runTx(db, (tx) => sqlReplaceWeaponTemplate(tx, template));
}

export async function deleteWeaponTemplate(id: string): Promise<void> {
  const idx = store.weaponTemplates.findIndex((t) => t.id === id);
  if (idx === -1) return;
  store.weaponTemplates.splice(idx, 1);
  save();
  const db = await dbWriteReady;
  if (db) await runTx(db, (tx) => sqlDeleteWeaponTemplate(tx, id));
}

export async function duplicateWeaponTemplate(
  id: string,
): Promise<WeaponTemplate | undefined> {
  const template = getWeaponTemplate(id);
  if (!template) return;
  const clone: WeaponTemplate = {
    ...template,
    id: crypto.randomUUID(),
    name: `${template.name}_dup`,
  };
  const idx = store.weaponTemplates.indexOf(template);
  store.weaponTemplates.splice(idx + 1, 0, clone);
  save();
  const db = await dbWriteReady;
  if (db) await sqlInsertWeaponTemplate(db, clone);
  return clone;
}
