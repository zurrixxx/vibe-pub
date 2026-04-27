// src/lib/templates/kanban/spec.ts
import type { TemplateSpec } from '../types';

export const kanbanSpec: TemplateSpec = {
  name: 'kanban',
  label: 'Kanban Board',
  description: 'Drag-and-drop kanban board with cards, labels, and checklists',
  icon: 'kanban',

  comments: {
    block_type: 'card',
    id_source: 'heading_id',
  },

  schema: {
    frontmatter: {
      view: 'kanban',
      title: 'Board title',
      labels: 'Map of label name to hex color (e.g. bug: "#ef4444")',
    },
    structure:
      '## columns contain ### cards. Cards have optional {#id} and [labels]. Card body is free markdown.',
    example: `---
view: kanban
title: Q2 Roadmap
labels:
  bug: "#ef4444"
  feature: "#3b82f6"
---

## Backlog

### SEO optimization {#c1} [feature]
Research keywords, update meta tags.

- [ ] Keyword research
- [ ] Meta tag updates

## In Progress

### Fix login bug {#c2} [bug]
Token expires on redirect.

## Done

### Docs {#c3} [feature]
Published.
`,
  },
};
