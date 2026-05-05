import type { EnemyStatBlock, EnemyTemplate } from "../types";
import { store, save } from "./state.svelte";

export function createTemplate(data: EnemyStatBlock): EnemyTemplate {
  const template: EnemyTemplate = { id: crypto.randomUUID(), ...cloneStatBlock(data) };
  store.templates.push(template);
  save();
  return template;
}

export function getTemplate(id: string): EnemyTemplate | undefined {
  return store.templates.find((t) => t.id === id);
}

export function updateTemplate(id: string, data: EnemyStatBlock) {
  const template = getTemplate(id);
  if (!template) return;
  Object.assign(template, cloneStatBlock(data));
  save();
}

export function deleteTemplate(id: string) {
  const idx = store.templates.findIndex((t) => t.id === id);
  if (idx === -1) return;
  store.templates.splice(idx, 1);
  save();
}

export function duplicateTemplate(id: string): EnemyTemplate | undefined {
  const template = getTemplate(id);
  if (!template) return;
  const clone = JSON.parse(JSON.stringify(template)) as EnemyTemplate;
  clone.id = crypto.randomUUID();
  clone.name = `${template.name}_dup`;
  for (const w of clone.weapons) w.id = crypto.randomUUID();
  for (const s of clone.skills) s.id = crypto.randomUUID();
  const idx = store.templates.indexOf(template);
  store.templates.splice(idx + 1, 0, clone);
  save();
  return clone;
}

export function cloneStatBlock(data: EnemyStatBlock): EnemyStatBlock {
  return JSON.parse(JSON.stringify(data)) as EnemyStatBlock;
}
