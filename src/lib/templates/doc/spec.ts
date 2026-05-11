// src/lib/templates/doc/spec.ts
import type { TemplateSpec } from '../types';

export const docSpec: TemplateSpec = {
  name: 'doc',
  label: 'Document',
  description: 'Rich markdown document with headings, paragraphs, code, and more',
  icon: 'doc',

  comments: {
    block_type: 'heading',
    id_source: 'heading_id',
  },

  schema: {
    frontmatter: {
      view: 'doc',
      title: 'Page title (optional)',
      theme: 'Theme name (optional)',
    },
    structure:
      'Use frontmatter title (or a single # line) for the page title. Put one short plain paragraph before the first ## — that becomes the hero lede. Use ## / ### for sections (outline + comment anchors). See CLI: vibe-pub format doc.',
    example: `---
view: doc
title: My Document
---

One or two sentences: what this page covers and how to read it.

## Details

More details here.

\`\`\`js
console.log("hello");
\`\`\`
`,
  },
};
