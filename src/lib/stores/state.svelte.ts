import { load as persistLoad, save as persistSave, type StoreData } from "./persist";

export const store = $state<StoreData>(persistLoad());

export function save() {
  persistSave({
    sessions: store.sessions,
    templates: store.templates,
    weaponTemplates: store.weaponTemplates,
  });
}
