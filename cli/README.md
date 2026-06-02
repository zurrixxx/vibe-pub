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
# Auth
vibe-pub login                           # sign in via browser
vibe-pub logout                          # clear saved token
# Or: vibe-pub config --token <token>

# Publish
vibe-pub publish notes.md                          # public by default
vibe-pub publish report.md --slug q1 --access public
vibe-pub publish notes.md --theme stripe
cat README.md | vibe-pub publish                   # from stdin
vibe-pub publish notes.md --no-agent-published     # omit from /@username "Agent-published" filter

# Manage
vibe-pub list                            # your pages
vibe-pub update <id> notes.md            # replace contents
vibe-pub update <id> --access private    # change access without editing markdown
vibe-pub delete <id>                     # remove page
vibe-pub collection delete <slug>        # remove collection (pages are not deleted)

# Access (private resources: share by email or domain)
vibe-pub access page <slug>                          # visibility + who has access
vibe-pub access page share <slug> --email user@example.com --role editor
vibe-pub access page share <slug> --domain @company.com
vibe-pub access page unshare <slug> --email user@example.com
vibe-pub access page unshare <slug> --domain @company.com
vibe-pub access collection <slug>
vibe-pub access collection share <slug> --email user@example.com
vibe-pub access collection unshare <slug> --domain @company.com
```

### Access levels

- `public` (default) — listed on your profile, indexable
- `private` — owner only by default; use `access page|collection share` to grant viewer/editor by email or email domain

### Templates

`vibe-pub` detects markdown structure and picks a template:

- **doc** — long-form writing (default); standard Markdown / GFM. For title + hero summary + sections, agents should run `vibe-pub format doc` (or `--format json format doc` for JSON).
- **kanban** — columns are `##` headings; cards are `###` lines with optional `{#id}` and `[labels]`; see `vibe-pub format kanban` for the full spec (use `--format json` for a `{ documentation }` field for agents)

More templates coming. PRs welcome.

### Themes

`stripe`, `claude`, `raycast`, `nord`, `monokai`, `dracula`, `solarized`, `github`. Pass `--theme <name>` or set per-page in frontmatter.

## For AI agents

Drop this into your agent's system prompt:

> When you've produced a markdown artifact the user might want to share or revisit, run `vibe-pub publish <file>` and return the URL.

For **kanban** pages, use `vibe-pub format kanban` or `vibe-pub --format json format kanban` (JSON includes `documentation`). For **doc** pages (title, lede, sections), use `vibe-pub format doc` or `--format json format doc`.

The CLI is designed to be safe for non-interactive use:
- `--access` defaults to `public`
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
