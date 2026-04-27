// src/lib/templates/dashboard/spec.ts
import type { TemplateSpec } from '../types';

export const dashboardSpec: TemplateSpec = {
  name: 'dashboard',
  label: 'Dashboard',
  description: 'Metrics dashboard with KPI cards, data tables, and text sections',
  icon: 'dashboard',

  comments: {
    block_type: 'section',
    id_source: 'heading_id',
  },

  schema: {
    frontmatter: {
      view: 'dashboard',
      title: 'Dashboard title (optional)',
    },
    structure:
      '## Section headings contain markdown tables (with headers and rows) or plain text. Tables with Value+Change columns render as KPI cards.',
    example: `---
view: dashboard
title: Weekly Metrics — Apr 7-11
---

## KPIs

| Metric | Value | Change |
|--------|-------|--------|
| Total Publishes | 247 | +30.7% |
| Unique Publishers | 84 | +37.7% |
| Page Views | 2,413 | +33.5% |

## Distribution

| View | Count | Share |
|------|-------|-------|
| Doc | 178 | 72% |
| Kanban | 41 | 17% |
| Changelog | 28 | 11% |

## Notes

- Changelog adoption growing fast
- Peak usage 12-16 UTC
`,
  },
};
