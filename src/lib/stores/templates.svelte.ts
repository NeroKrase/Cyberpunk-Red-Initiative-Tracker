import type { EnemyStatBlock, EnemyTemplate } from "../types";
import { dbReady } from "./db";
import { store } from "./state.svelte";
import {
  runTx,
  sqlDeleteTemplate,
  sqlInsertTemplate,
  sqlUpdateTemplate,
} from "./sql";

export async function createTemplate(data: EnemyStatBlock): Promise<EnemyTemplate> {
  const template: EnemyTemplate = { id: crypto.randomUUID(), ...cloneStatBlock(data) };
  store.templates.push(template);
  const db = await dbReady;
  if (db) await runTx(db, (tx) => sqlInsertTemplate(tx, template));
  return template;
}

export function getTemplate(id: string): EnemyTemplate | undefined {
  return store.templates.find((t) => t.id === id);
}

export async function updateTemplate(id: string, data: EnemyStatBlock): Promise<void> {
  const template = getTemplate(id);
  if (!template) return;
  Object.assign(template, cloneStatBlock(data));
  const db = await dbReady;
  if (db) await runTx(db, (tx) => sqlUpdateTemplate(tx, template));
}

export async function deleteTemplate(id: string): Promise<void> {
  const idx = store.templates.findIndex((t) => t.id === id);
  if (idx === -1) return;
  store.templates.splice(idx, 1);
  const db = await dbReady;
  if (db) await sqlDeleteTemplate(db, id);
}

export async function duplicateTemplate(id: string): Promise<EnemyTemplate | undefined> {
  const template = getTemplate(id);
  if (!template) return;
  const clone = JSON.parse(JSON.stringify(template)) as EnemyTemplate;
  clone.id = crypto.randomUUID();
  clone.name = `${template.name}_dup`;
  for (const w of clone.weapons) w.id = crypto.randomUUID();
  for (const s of clone.skills) s.id = crypto.randomUUID();
  const idx = store.templates.indexOf(template);
  store.templates.splice(idx + 1, 0, clone);
  const db = await dbReady;
  if (db) await runTx(db, (tx) => sqlInsertTemplate(tx, clone));
  return clone;
}

export function cloneStatBlock(data: EnemyStatBlock): EnemyStatBlock {
  return JSON.parse(JSON.stringify(data)) as EnemyStatBlock;
}
