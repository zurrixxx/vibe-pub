// src/lib/templates/index.ts
import type { TemplateSpec, Block } from './types';
import { docSpec } from './doc/spec';
import { kanbanSpec } from './kanban/spec';
import { changelogSpec } from './changelog/spec';
import { timelineSpec } from './timeline/spec';
import { slidesSpec } from './slides/spec';
import { dashboardSpec } from './dashboard/spec';
import { parseDocBlocks } from './doc/parser';
import { parseKanbanBlocks } from './kanban/parser';
import { parseChangelogBlocks } from './changelog/parser';
import { parseTimelineBlocks } from './timeline/parser';
import { parseSlidesBlocks } from './slides/parser';
import { parseDashboardBlocks } from './dashboard/parser';

export type { TemplateSpec, Block };

const templates = new Map<string, TemplateSpec>([
  ['doc', docSpec],
  ['kanban', kanbanSpec],
  ['changelog', changelogSpec],
  ['timeline', timelineSpec],
  ['slides', slidesSpec],
  ['dashboard', dashboardSpec],
]);

const parsers = new Map<string, (markdown: string) => Block[]>([
  ['doc', parseDocBlocks],
  ['kanban', (md: string) => parseKanbanBlocks(md).blocks],
  ['changelog', (md: string) => parseChangelogBlocks(md).blocks],
  ['timeline', (md: string) => parseTimelineBlocks(md).blocks],
  ['slides', (md: string) => parseSlidesBlocks(md).blocks],
  ['dashboard', (md: string) => parseDashboardBlocks(md).blocks],
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
