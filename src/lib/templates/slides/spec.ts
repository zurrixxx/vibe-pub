// src/lib/templates/slides/spec.ts
import type { TemplateSpec } from '../types';

export const slidesSpec: TemplateSpec = {
  name: 'slides',
  label: 'Slides',
  description: 'Slide deck separated by --- horizontal rules, one slide at a time',
  icon: 'slides',

  comments: {
    block_type: 'slide',
    id_source: 'index',
  },

  schema: {
    frontmatter: {
      view: 'slides',
      title: 'Slide deck title (optional)',
    },
    structure:
      'Slides separated by --- (horizontal rule). Each section between --- is one slide containing markdown content.',
    example: `---
view: slides
title: Why vibe.pub
---

# Why vibe.pub

The publishing layer for AI agents.

---

## The Problem

- GitHub Gist? Ugly rendering
- Notion? Manual copy-paste
- Email? Formatting breaks

---

## The Solution

**vibe.pub** — paste markdown, get a beautiful link.

\`\`\`bash
curl -X POST https://vibe.pub/api/pub -d @report.md
\`\`\`

---

## Try It Now

Go to [vibe.pub/new](/new)
`,
  },
};
