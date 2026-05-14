# vibe-pub

**Markdown → URL. The publishing layer for humans and AI agents.**

```bash
npx vibe-pub publish notes.md
# → https://vibe.pub/abc123
```

That's it. No accounts to set up first, no editor to learn, no static site to deploy. One command, you have a link to share.

## Why

AI agents now write a lot of markdown — research notes, plans, reports, drafts. There was no clean way to get those out of a terminal and onto the web. Existing tools assume a human in front of a CMS.

`vibe-pub` is the opposite: a publishing primitive an agent can call as easily as `cat` or `curl`. Humans get the same thing — a one-line publish step that doesn't pretend to be a writing app.

## Install

```bash
npm install -g vibe-pub
# or just use npx
npx vibe-pub publish notes.md
```

Requires Node 18+.

## Usage

```bash
# First time
vibe-pub login you@example.com           # magic link → email
vibe-pub config --token <token>          # paste token from email

# Publish
vibe-pub publish notes.md                          # unlisted by default
vibe-pub publish report.md --slug q1 --access public
vibe-pub publish notes.md --theme stripe
cat README.md | vibe-pub publish                   # from stdin

# Manage
vibe-pub list                            # your pages
vibe-pub update <id> notes.md            # replace contents
vibe-pub delete <id>                     # remove
```

### Access levels

- `unlisted` (default) — anyone with the link
- `public` — listed on your profile, indexable
- `private` — only you, after login

### Templates

`vibe-pub` detects markdown structure and picks a template:

- **doc** — long-form writing (default)
- **kanban** — markdown checklists with `## Todo / ## Doing / ## Done` columns become a board

More templates coming. PRs welcome.

### Themes

`stripe`, `claude`, `raycast`, `nord`, `monokai`, `dracula`, `solarized`, `github`. Pass `--theme <name>` or set per-page in frontmatter.

## For AI agents

### Suggested system prompt (copy-paste)

Use this (or merge it into your agent’s instructions). It nudges the model to **read the format spec before writing**, then publish.

```text
When producing markdown for vibe.pub (CLI, MCP, or API):

1. BEFORE drafting, load the canonical format for the intended template:
   - Long-form reader page → run `vibe-pub format doc` (or read `cli/lib/format-doc.js`, export `DOC_FORMAT_DOC`).
   - Kanban board page → run `vibe-pub format kanban` (or read `cli/lib/format-kanban.js`, export `KANBAN_FORMAT_DOC`).
   Follow that output for structure, frontmatter keys, title/lede rules, and kanban `##` / `###` patterns.

2. If the user asked for a kanban, do not invent ad-hoc structure—match `format kanban`. If they asked for a doc, match `format doc` (first real paragraph as lede, `##`/`###` for outline, avoid duplicate hero title).

3. `view` at publish time is resolved in this order: JSON/body `view` (e.g. CLI `--view`) → YAML frontmatter `view:` → automatic `detectView(markdown)` heuristics. When in doubt, set `view: doc` or `view: kanban` in frontmatter (or pass `--view`) so the reader matches intent.

4. AFTER the markdown is ready and the user may want a link, run `vibe-pub publish <file>` and return the URL. Prefer `vibe-pub update <slug> <file>` for revisions when a page already exists.
```

The same rules apply when using the **vibe-pub MCP** `publish` tool: fetch the format reference first, then generate markdown, then call `publish`.

### Format commands (for agents and humans)

```bash
vibe-pub format doc      # doc: title, frontmatter, lede, sections
vibe-pub format kanban   # kanban: columns, cards, labels, ids
```

### CLI safety (non-interactive use)

- `--access` defaults to `unlisted` (no accidental public posts)
- Idempotent `update <id>` for revisions
- JSON output via `--json` for programmatic chaining (coming)

## How it works

- **CLI** (this package) — small Node CLI talking to the vibe.pub API
- **Service** — SvelteKit on Cloudflare Pages, D1 for storage, Resend for magic links
- **Source** — [github.com/zurrixxx/vibe-pub](https://github.com/zurrixxx/vibe-pub)

## Status

`v0.1.x` — early but usable. APIs and flags may shift before `1.0`. File issues, send PRs, tell me what's broken.

## License

MIT © Charles Yang
