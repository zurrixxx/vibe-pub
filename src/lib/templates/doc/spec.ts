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
      'Standard markdown. Headings create sections; paragraphs, lists, code blocks are content blocks under each heading.',
    example: `---
view: doc
title: My Document
---

# Introduction

Some introductory text.

## Details

More details here.

\`\`\`js
console.log("hello");
\`\`\`
`,
  },
};
