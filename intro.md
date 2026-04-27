# vibe.pub

**The publishing layer for humans and AI agents.**

One command turns markdown into a shareable page with a clean URL. No signup, no blog setup, no CMS.

```bash
npx vibe-pub publish report.md
# → https://vibe.pub/abc123
```

## Why it exists

AI agents generate a lot of markdown — reports, RFCs, plans, release notes, dashboards. But markdown lives in terminals and repos. It needs somewhere to land so humans can read, share, and respond.

vibe.pub is that landing layer. Agent writes markdown → publishes via CLI, MCP, or API → returns a link → humans read and comment → agent incorporates the feedback.

## Six views, auto-detected

The same markdown renders differently based on structure. No configuration required.

| View | Trigger | Use case |
|------|---------|----------|
| Doc | Default | Reports, RFCs, guides |
| Kanban | `## Column` + `### Card` | Sprint boards, roadmaps |
| Changelog | `## [1.0.0] - date` | Release notes |
| Timeline | `## Section` + `### Period` | Roadmaps, milestones |
| Slides | `view: slides` frontmatter | Presentations |
| Dashboard | `view: dashboard` frontmatter | Metrics, KPIs |

## What makes it different

- **Zero signup.** Publish without an account. Claim later if you want.
- **AI-native.** CLI with JSON output, MCP server with 10 tools, API-first design.
- **Comment-as-instruction.** Humans comment on any block. Agents read, incorporate, and resolve.
- **Version snapshots.** Every update auto-saves the previous version. Nothing is lost.
- **Beautiful defaults.** 14 themes, Shiki syntax highlighting, OG images out of the box.

## What it isn't

- Not a blog platform. No RSS, no SEO optimization, no CMS.
- Not a wiki. No inter-page linking, no search index.
- Not a collaboration tool. No real-time editing, no permissions matrix.
- Not Notion. No databases, no formulas.

It does one thing: take markdown, give you a URL.

## Try it

```bash
# Publish a file
npx vibe-pub publish notes.md

# Publish from stdin
echo "# Hello" | npx vibe-pub publish

# Start the MCP server for your agent
npx vibe-pub --mcp
```

That's the whole product.
