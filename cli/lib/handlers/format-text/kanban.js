/**
 * Kanban markdown reference for vibe.pub — kept in sync with
 * src/lib/templates/kanban/parser.ts and spec.ts
 */
export const KANBAN_FORMAT_DOC = `vibe.pub Kanban markdown format
================================

Use this structure so the board parses columns, cards, labels, and stable IDs.

FRONTMATTER (YAML between --- lines)
------------------------------------
- view: kanban           # required for explicit kanban pages
- title: <string>        # optional board title
- labels:                 # optional map of label name → CSS color for pills
    bug: "#ef4444"
    feature: "#3b82f6"

STRUCTURE
---------
- ## Column title        → starts a column (must be exactly "## ", not "### ")
- ### Card line          → starts a card inside the **current** column
- Lines after ### until the next ### or ## → card body (any Markdown)

COLUMN ORDER
------------
If a column title starts with digits (e.g. "0 Backlog", "1 Doing"), columns are
sorted by that number. Otherwise order follows appearance in the file.

CARD TITLE LINE
---------------
Pattern:

  ### <title> {#<id>} [<label1>, <label2>]

- {#id}        Optional stable ID for the card (comments anchor to this).
               If omitted, the server assigns one like cxxxxxx when publishing.
- [a, b]       Optional labels (comma-separated). Names should match keys under
               frontmatter \`labels:\` if you want custom colors.

Examples:

  ### Fix login {#card-login} [bug]
  ### Draft roadmap [feature]

BODY
----
Everything after the ### line until the next ### or ## belongs to that card.
Lists, checkboxes, code blocks, etc. are rendered as normal Markdown in the
card detail view.

OPTIONAL DUE DATE (BOARD CARD FOOT — CALENDAR CHIP)
---------------------------------------------------
The reader shows a small calendar icon on each card. The text next to it is the
**due date** parsed from that card's body (not the page created time).

**Precedence:** an HTML comment is read first; if missing, a \`due:\` line in
the body is used. If neither matches, the chip shows an em dash (—).

1) **HTML comment** (recommended — hidden from rendered markdown):

  <!-- due: 2025-06-15 -->

- Put it anywhere in the card body. The value is the date token after \`due:\`
  (digits and hyphens, e.g. \`YYYY-MM-DD\`). Invalid dates are ignored.

2) **Body line** (visible in prose unless you hide it):

  due: 2025-06-15
  **Due:** 2025-06-20

- A line starting (after optional whitespace / list indent) with \`due\`
  optionally wrapped in \`**\`, then \`:\`, then the rest of the line.
- If the rest starts with \`YYYY-MM-DD\`, that date is shown in short form
  (e.g. \`Jun 15\`) like the HTML form.
- Otherwise the raw text is shown (up to 14 chars, or 12 chars + "…").

VIEW SELECTION
--------------
- Force kanban: set \`view: kanban\` in frontmatter, or publish with
    vibe-pub publish board.md --view kanban
- Auto-detect: the service may treat the page as kanban if there are at least
  two "##" headings and each is immediately followed (after blank lines) by a
  checkbox list line like "- [ ]" or "- [x]". When in doubt, set view explicitly.

MINIMAL EXAMPLE
---------------
---
view: kanban
title: Q2 Roadmap
labels:
  bug: "#ef4444"
  feature: "#3b82f6"
---

## Backlog

### SEO work {#c1} [feature]
<!-- due: 2025-06-30 -->
- [ ] Keyword research

## Done

### Ship docs {#c2} [feature]
Published.
`;
