// src/lib/templates/changelog/spec.ts
import type { TemplateSpec } from '../types';

export const changelogSpec: TemplateSpec = {
  name: 'changelog',
  label: 'Changelog',
  description: 'Version-based changelog with categorized changes (keepachangelog.com style)',
  icon: 'changelog',

  comments: {
    block_type: 'release',
    id_source: 'heading_id',
  },

  schema: {
    frontmatter: {
      view: 'changelog',
      title: 'Changelog title (optional)',
    },
    structure:
      '## [version] - date headings contain ### Category sub-headings (Added, Changed, Fixed, Removed, etc.) with - list items.',
    example: `---
view: changelog
title: Product Changelog
---

## [1.2.0] - 2024-03-15

### Added
- New dashboard with real-time metrics
- Export to CSV functionality

### Fixed
- Login timeout on slow connections
- Chart rendering on mobile Safari

## [1.1.0] - 2024-03-01

### Changed
- Upgraded to React 19
- Improved search performance by 3x

### Removed
- Legacy API v1 endpoints
`,
  },
};
