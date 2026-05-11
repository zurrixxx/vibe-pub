/**
 * Doc markdown reference for vibe.pub — aligned with server title extraction
 * (src/routes/api/pub/+server.ts) and reader hero/lede (PublishedPage.svelte).
 */
export const DOC_FORMAT_DOC = `vibe.pub Document (doc) markdown format
=====================================

Use this so the reader shows a clean title, a readable one-line summary (lede),
and body content that does not duplicate the hero title.

PAGE TITLE (large H1 in the reader header)
-------------------------------------------
The stored title (hero) is chosen in this order:
1. frontmatter \`title: ...\`
2. else the first markdown line matching \`# <heading>\` in the body (after frontmatter)

Prefer \`title:\` in frontmatter when you can, so the body does not need a leading \`#\`.

HERO LEDE — the short “summary” under the title
-------------------------------------------------
The reader extracts the lede from **rendered HTML**: it is the **first \`<p>...</p>\`**
block in the article body (plain text after stripping inner tags).

- Put **one short paragraph** (1–3 sentences) immediately after your title material
  and **before** the first \`##\` section heading. That paragraph becomes the lede.
- Write **normal prose** only: what the page is for, who it is for, or how to use it.
- Do **not** put cheat sheets, command dumps, long bullet lists, or “everything in one
  paragraph” in that first paragraph — those belong under \`##\` sections below.
- Do **not** use \`#\` at the start of lines inside a paragraph to fake headings; use
  real \`##\` / \`###\` headings for structure (they also drive the outline rail).

DUPLICATE TITLE IN THE ARTICLE
------------------------------
If you set \`title:\` in frontmatter **and** repeat the same text as \`# Title\` at the
top of the body, readers see the title twice (hero + in-article H1). Prefer either:
- \`title:\` in frontmatter, then start the body with the lede paragraph and \`##\`
  sections, **without** a leading \`#\` duplicate; or
- a single \`# Title\` in the body and **no** conflicting \`title:\`, then still follow
  it with a short lede paragraph before \`##\`.

SECTIONS & OUTLINE
--------------------
- \`##\` and \`###\` form the outline (left rail) and get stable anchor ids for comments.
- Main sections should use \`##\`; use \`###\` for subsections.

MINIMAL EXAMPLE (recommended shape)
-----------------------------------
---
view: doc
title: Development quick reference
---

This page collects everyday Git, Docker, and HTTP snippets for our team. Skim the
outline on the left; each section is self-contained.

## Git commands

\`\`\`bash
git branch -a
\`\`\`

## Docker

…

VIEW SELECTION
--------------
- Default template is doc when the file is not detected as another view.
- Force doc: \`view: doc\` in frontmatter, or \`vibe-pub publish notes.md --view doc\`.
`;
