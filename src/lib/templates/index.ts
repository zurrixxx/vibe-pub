// src/lib/templates/index.ts
import type { TemplateSpec, Block } from './types';
import { docSpec } from './doc/spec';
import { kanbanSpec } from './kanban/spec';
import { parseDocBlocks } from './doc/parser';
import { parseKanbanBlocks } from './kanban/parser';

export type { TemplateSpec, Block };

const templates = new Map<string, TemplateSpec>([
  ['doc', docSpec],
  ['kanban', kanbanSpec],
]);

const parsers = new Map<string, (markdown: string) => Block[]>([
  ['doc', parseDocBlocks],
  ['kanban', (md: string) => parseKanbanBlocks(md).blocks],
]);

export function getTemplate(name: string): TemplateSpec | undefined {
  return templates.get(name);
}

export function listTemplates(): TemplateSpec[] {
  return Array.from(templates.values());
}

export function parseBlocks(templateName: string, markdown: string): Block[] {
  const parser = parsers.get(templateName);
  if (!parser) return [];
  return parser(markdown);
}
