// src/lib/templates/timeline/spec.ts
import type { TemplateSpec } from '../types';

export const timelineSpec: TemplateSpec = {
  name: 'timeline',
  label: 'Timeline',
  description: 'Vertical timeline with sections, periods, and events',
  icon: 'timeline',

  comments: {
    block_type: 'period',
    id_source: 'heading_id',
  },

  schema: {
    frontmatter: {
      view: 'timeline',
      title: 'Timeline title (optional)',
    },
    structure: '## Section headings contain ### Period sub-headings with - list item events.',
    example: `---
view: timeline
title: Product Roadmap
---

## Q2 2026 — Launch

### April 2026
- Changelog template shipped
- OG image generation
- E2e test suite

### March 2026
- Kanban template
- 14 page themes
- Comment system

## Q1 2026 — Foundation

### February 2026
- Core platform — SvelteKit + Cloudflare
- Doc template
- Auth system

### January 2026
- Idea conceived
- First prototype
`,
  },
};
