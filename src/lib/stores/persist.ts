import type { EnemyTemplate, Session, WeaponTemplate } from "../types";
import { migrate } from "./migrations";

const STORAGE_KEY = "cpr-initiative-tracker/v1";

export type StoreData = {
  sessions: Session[];
  templates: EnemyTemplate[];
  weaponTemplates: WeaponTemplate[];
};

export function load(): StoreData {
  const empty: StoreData = { sessions: [], templates: [], weaponTemplates: [] };
  if (typeof localStorage === "undefined") return empty;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw);
    const data: StoreData = Array.isArray(parsed)
      ? { sessions: parsed, templates: [], weaponTemplates: [] }
      : {
          sessions: parsed.sessions ?? [],
          templates: parsed.templates ?? [],
          weaponTemplates: parsed.weaponTemplates ?? [],
        };
    migrate(data);
    return data;
  } catch {
    return empty;
  }
}

export function save(data: StoreData) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
