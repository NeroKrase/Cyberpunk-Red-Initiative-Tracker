// Barrel: re-exports the per-entity stores so existing
// `import { … } from "$lib/store.svelte"` call sites keep working.

export { store } from "./stores/state.svelte";

export {
  createSession,
  getSession,
  deleteSession,
  renameSession,
  duplicateSession,
  createEncounter,
  getEncounter,
  deleteEncounter,
  renameEncounter,
  duplicateEncounter,
  addCombatant,
  removeCombatant,
  updateCombatant,
  updateArmorSp,
  updateWeaponAmmo,
  applyDamage,
  type NewCombatantInput,
  type CombatantPatch,
} from "./stores/sessions.svelte";

export {
  createTemplate,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
} from "./stores/templates.svelte";

export {
  createWeaponTemplate,
  getWeaponTemplate,
  updateWeaponTemplate,
  deleteWeaponTemplate,
  duplicateWeaponTemplate,
  type WeaponTemplateInput,
} from "./stores/weaponTemplates.svelte";

export {
  createNetArchitecture,
  getNetArchitecture,
  updateNetArchitecture,
  deleteNetArchitecture,
  duplicateNetArchitecture,
  type NetArchitectureInput,
} from "./stores/netArchitectures.svelte";
