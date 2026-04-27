# vibe.pub — Product One-Pager

The permanent product-context anchor for every design conversation. Paste or link this at the start of any new design work.

---

## What

**Markdown-to-URL publishing layer.** One command turns a `.md` file into a beautiful, shareable page with a clean URL.

```bash
npx vibe-pub publish report.md
# → https://vibe.pub/abc123
```

## For whom

- **Primary: AI agents** (Claude Code, Cursor, Cline) that generate content and need somewhere for it to land.
- **Secondary: Developers** who want to share markdown without setting up a blog.

Design addresses one audience at a time — never both in the same surface.

## Core loop

Agent generates markdown → publishes via CLI / MCP / API → returns a link → humans read, comment → agent reads the comments → incorporates + resolves. That feedback loop is the product.

---

## 6 view types (auto-detected from markdown structure)

| View | Trigger | Use case | Designed? |
|---|---|---|---|
| **Doc** | default | reports, RFCs, guides | ✅ `ui_kit/reading_page.html` |
| **Kanban** | `## Column` + `### Card` | sprint boards, roadmaps | ✅ `ui_kit/kanban_board.html` |
| **Changelog** | `## [1.0.0] - date` | release notes | ⬜ todo |
| **Timeline** | `## Section` + `### Period` | roadmaps, milestones | ⬜ todo |
| **Slides** | `view: slides` frontmatter | presentations | ⬜ todo |
| **Dashboard** | `view: dashboard` frontmatter | metrics, KPIs | ⬜ todo |

Every view inherits the same type + color tokens. They differ in **layout** and **density**, never in palette.

---

## Differentiators (must feel built-in, not bolted on)

1. **Zero signup.** Publish without an account. Anonymous-first.
2. **AI-native.** CLI (JSON output), MCP server (10 tools), API-first.
3. **Comment-as-instruction.** Humans comment on blocks → agent reads + incorporates + resolves. This is the flagship interaction — see *Key interactions* below.
4. **Version snapshots.** Every update auto-saves the previous version. History is casual, Google-Docs-simple, never a git-diff UI.
5. **Beautiful defaults.** 14 themes, Shiki syntax highlighting, auto OG images.

## Non-goals

- Not a blog platform (no RSS, no SEO optimization, no CMS)
- Not a wiki (no linking between pages, no search index)
- Not a collaboration tool (no real-time editing, no permissions matrix)
- Not a Notion / Coda replacement (no databases, no formulas)

If a design decision would push the product toward any of the above, reject it.

---

## Success metrics

| Metric | What it measures |
|---|---|
| Agent publishes / week | Are AI tools actually using this? |
| Reader-to-publisher conversion | Viral loop |
| D7 retention | Do publishers come back? |
| Comments per page | Is the feedback loop working? |
| K-factor | shares × readers × conversion |

**Leading indicator:** an AI agent publishes without the human explicitly asking it to.

Designs should make the **comment → agent-resolves** loop frictionless — that's what compounds all five metrics at once.

---

## Key interactions (need design specs)

### Comment-as-instruction
- Comments attach to **blocks** (paragraph, heading, code block, kanban card).
- Comment UI borrows Google Docs' simplicity: marginal pins, one-click reply, `resolve` = done.
- Agent reads comment → makes the edit → writes a reply → auto-resolves. The UI needs a visible "agent is working" state and a way for humans to see what changed.

### Version history
- Every publish = a snapshot. Access via a single `history` button.
- Presentation borrows Google Docs' side panel: a dated list on the right, preview in the middle, "restore this version" button.
- Never show a code-diff by default. Show the rendered page; let the reader diff by eye.

### Publishing flow
- Anonymous publish must work in ≤ 3 seconds with no modal.
- Authenticated publish adds: slug, theme picker, visibility (public / unlisted / private).

---

## Design references (the North Stars)

**✅ Lift from**
- **iA Writer** — purity, type-first reading, surface recedes, nothing to configure.
- **Medium** — editorial "publication" feel, serif confidence, wide gutters, bylines as meta.
- **Google Docs** — the comment UX and the history panel. Not the chrome — just the *flow*.

**❌ Reject**
- **Notion** — dense chrome, block-handle hover clutter, "doc-as-database" vibe. vibe.pub is the opposite: a page, not a workspace.
- Any "AI-SaaS" aesthetic (gradient heroes, sparkle icons, card grids of features).

When a design decision is ambiguous, ask: *"Would iA Writer ship this? Would Medium? Would Google Docs (circa 2015)?"* If all three say no, it's probably wrong for vibe.pub.

---

## Architecture (for context, not design)

```
SvelteKit + Tailwind  →  Cloudflare Pages
D1 (SQLite)           →  pages, comments, versions, collections
CLI (Node.js)         →  11 commands, JSON output
MCP Server            →  10 tools, stdio transport
```

## Current state (April 2026)

- Deployed at vibe.pub (Cloudflare Pages, Tessera Inc account)
- 6 view templates, all with block-level comments
- CLI v2 published on npm (`vibe-pub@0.1.0`)
- MCP server built (`npx vibe-pub --mcp`)
- 51+ e2e tests (Playwright + vitest)
- No paid tier, no custom domains, no analytics yet

---

## How to use this file

1. At the start of any new design conversation, paste the relevant sections (or the whole file) so the designer has product context.
2. When in doubt about a feature's priority, check *Non-goals* first.
3. When in doubt about an aesthetic decision, check *Design references*.
