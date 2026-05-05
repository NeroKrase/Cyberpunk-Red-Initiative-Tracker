import type { WeaponTemplate } from "../types";
import { store, save } from "./state.svelte";

// Distribute Omit across the discriminated union so the resulting type
// preserves kind narrowing (Omit<A | B, "id"> on its own collapses to a
// non-discriminated shape).
type DistributiveOmit<T, K extends keyof any> = T extends unknown
  ? Omit<T, K>
  : never;

export type WeaponTemplateInput = DistributiveOmit<WeaponTemplate, "id">;

export function createWeaponTemplate(data: WeaponTemplateInput): WeaponTemplate {
  const id = crypto.randomUUID();
  // Spread + id over a discriminated-union input loses narrowing in TS, so
  // assert the resulting shape — the caller already chose a kind in `data`.
  const template = { id, ...data } as WeaponTemplate;
  store.weaponTemplates.push(template);
  save();
  return template;
}

export function getWeaponTemplate(id: string): WeaponTemplate | undefined {
  return store.weaponTemplates.find((t) => t.id === id);
}

export function updateWeaponTemplate(id: string, data: WeaponTemplateInput) {
  const template = getWeaponTemplate(id);
  if (!template) return;
  Object.assign(template, data);
  save();
}

export function deleteWeaponTemplate(id: string) {
  const idx = store.weaponTemplates.findIndex((t) => t.id === id);
  if (idx === -1) return;
  store.weaponTemplates.splice(idx, 1);
  save();
}

export function duplicateWeaponTemplate(id: string): WeaponTemplate | undefined {
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
  return clone;
}
