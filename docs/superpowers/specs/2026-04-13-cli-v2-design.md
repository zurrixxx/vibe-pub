# CLI v2 + MCP Server Design

## Summary

Upgrade vibe-pub CLI from write-only to full read/write/comments/versions, with default JSON output for AI agents. Add MCP server sharing the same API layer.

## Users

Primary: AI agents (Claude Code, Cursor, Cline) calling via Bash or MCP.
Secondary: Developers using CLI manually (opt-in `--format human`).

## Architecture

```
bin/vibe.js      — CLI entry (stdin/stdout, args parsing)
bin/mcp.js       — MCP server entry (stdio JSON-RPC)
lib/api.js       — Shared API client (all HTTP calls)
lib/config.js    — Token/URL storage (~/.config/vibe-pub/config.json)
lib/output.js    — Format switching (json default, human opt-in)
```

Both CLI and MCP call the same `lib/api.js` functions. No duplication.

## Commands

### Read operations (NEW)

```bash
# Get page details by slug (returns id, title, view, markdown, created, updated)
vibe-pub get <slug>

# Get comments on a page
vibe-pub comments <slug>

# Get version history
vibe-pub versions <slug>

# Get a specific version's content
vibe-pub version <slug> <version-number>
```

### Write operations (EXISTING + ENHANCED)

```bash
# Publish — now with --view flag
vibe-pub publish <file.md> [--slug x] [--access unlisted] [--view doc] [--theme default]
vibe-pub publish                      # stdin

# Update — now accepts slug (not just id), auto-snapshots, resolves addressed comments
vibe-pub update <slug> <file.md>
vibe-pub update <slug>                # stdin

# Delete
vibe-pub delete <slug>

# Add comment
vibe-pub comment <slug> "comment body" [--anchor "heading:Security"]

# Resolve comments (mark as addressed after regen)
vibe-pub resolve <slug> [--all] [--ids id1,id2]
```

### Auth

```bash
vibe-pub login <email>           # prints magic link instructions
vibe-pub config --token <token>  # save token
vibe-pub whoami                  # print current user info
```

## Output Format

Default: JSON (for AI agents).

```bash
# Default JSON
vibe-pub get my-report
{"id":"abc123","slug":"my-report","title":"My Report","view":"doc","markdown":"# My Report\n...","created":"2026-04-13T...","updated":"2026-04-13T..."}

# Human-readable
vibe-pub get my-report --format human
Title: My Report
View:  doc
URL:   https://vibe-pub.pages.dev/my-report
---
# My Report
...

# Errors are also JSON
vibe-pub get nonexistent
{"error":"Page not found","status":404}
```

Exit codes: 0 success, 1 error.

## MCP Server

`bin/mcp.js` — stdio transport, JSON-RPC 2.0, standard MCP protocol.

### Tools exposed

| Tool | Description | Maps to |
|------|-------------|---------|
| `publish` | Publish markdown to vibe.pub | `api.publish()` |
| `get_page` | Get page by slug | `api.getBySlug()` |
| `update_page` | Update page content | `api.update()` |
| `delete_page` | Delete page | `api.remove()` |
| `list_pages` | List user's pages | `api.list()` |
| `get_comments` | Get comments on a page | `api.getComments()` |
| `add_comment` | Add comment to a page | `api.addComment()` |
| `resolve_comments` | Mark comments addressed | `api.resolveComments()` |
| `get_versions` | Get version history | `api.getVersions()` |
| `get_version` | Get specific version | `api.getVersion()` |

### Config

MCP server reads token from env `VIBE_PUB_TOKEN` or `~/.config/vibe-pub/config.json`.

```json
{
  "mcpServers": {
    "vibe-pub": {
      "command": "npx",
      "args": ["vibe-pub", "--mcp"],
      "env": { "VIBE_PUB_TOKEN": "..." }
    }
  }
}
```

Alternative entry: `npx vibe-pub --mcp` as a flag on the main binary (avoids separate `bin/mcp.js` for simpler config).

## Version Snapshots

### DB Schema

New table `page_versions`:

```sql
CREATE TABLE page_versions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  markdown TEXT NOT NULL,
  title TEXT,
  created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_page_versions_page ON page_versions(page_id);
CREATE UNIQUE INDEX idx_page_versions_unique ON page_versions(page_id, version);
```

### Behavior

- `PUT /api/pub/[id]` (update) auto-snapshots the CURRENT content as a new version before applying the update
- Version numbers are sequential per page: 1, 2, 3...
- Keep last 20 versions per page (prune oldest on insert)
- No explicit "create version" API — versions are automatic on update

### API Endpoints (NEW)

```
GET /api/pub/[id]/versions          → [{ version, title, created }]
GET /api/pub/[id]/versions/[num]    → { version, markdown, title, created }
```

## Comment-as-Instruction Flow

### Enhanced comment resolution

When a page is updated, the reconciliation already runs (matching old blocks to new blocks). Enhance it:

1. **Before update**: snapshot current version
2. **After update**: run reconcile
3. **Orphaned comments**: keep them, add `orphaned: true` + `version: N` (the version they were relevant to)
4. **Matched comments**: stay anchored to the new block

### New: resolve endpoint

```
POST /api/pub/[id]/resolve
Body: { comment_ids: ["id1","id2"] }   — resolve specific comments
  or: { all: true }                     — resolve all comments on this page
```

Sets `resolved: 1` on comments. Already exists in DB schema.

### Agent workflow

```bash
# 1. Agent reads current content + comments
page=$(vibe-pub get my-report)
comments=$(vibe-pub comments my-report)

# 2. Agent regenerates with comments as context
# (agent incorporates feedback into new markdown)

# 3. Agent updates (auto-snapshots old version)
vibe-pub update my-report new-content.md

# 4. Agent resolves addressed comments
vibe-pub resolve my-report --all
# or: vibe-pub resolve my-report --ids comment1,comment2
```

### Human fallback

Humans can view old versions + their orphaned comments in the web UI:
- "Version history" panel on page view (future UI, not in this spec)
- API: `GET /api/pub/[id]/versions` accessible to page owner

## Slug Resolution

The current API uses page `id` for mutations. CLI should accept `slug` for all commands (more ergonomic for agents who see URLs).

Add a new DB/API helper:
```
GET /api/pub/by-slug/[slug]  → full page object
```

The CLI resolves slug → id internally before calling mutation endpoints.

## File Changes

### New files
- `cli/lib/output.js` — JSON/human format switcher
- `cli/bin/mcp.js` — MCP server entry (or flag-based in vibe.js)
- `migrations/0010_page_versions.sql` — version table
- `src/routes/api/pub/[id]/versions/+server.ts` — list versions
- `src/routes/api/pub/[id]/versions/[num]/+server.ts` — get version
- `src/routes/api/pub/[id]/resolve/+server.ts` — resolve comments
- `src/routes/api/pub/by-slug/[slug]/+server.ts` — slug lookup

### Modified files
- `cli/lib/api.js` — add get, getBySlug, getComments, addComment, resolveComments, getVersions, getVersion
- `cli/bin/vibe.js` — add new commands, default JSON output, --format flag
- `cli/package.json` — add MCP dependency (`@modelcontextprotocol/sdk`)
- `src/routes/api/pub/[id]/+server.ts` — auto-snapshot on PUT before update
- `src/routes/api/comment/[pageId]/+server.ts` — add resolve endpoint or separate route

## Testing

- Unit tests for slug resolution, version numbering, comment resolution logic
- E2e tests for the full agent workflow: publish → comment → get comments → update → verify snapshot → resolve
- CLI integration tests: run CLI commands against dev server, verify JSON output format

## Out of Scope

- Version diff (show what changed between versions) — future
- Web UI for version history — future
- Comment threading/replies — future
- Conflict resolution for concurrent edits — not needed for agent-primary use
