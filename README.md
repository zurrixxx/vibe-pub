# vibe-pub

Publish markdown to the web — built for humans and AI agents.

> ⚠️ **Private beta.** This repo is open for transparency, but the hosted service at [vibe.pub](https://vibe.pub) is invite-only. Email <zurrix@gmail.com> for access.

## What it is

`vibe-pub` is a lightweight publishing layer: write markdown, get a clean URL. The CLI is designed so AI agents can publish as easily as a human can.

- **CLI** — `vibe-pub publish notes.md` → live URL
- **Web app** — SvelteKit on Cloudflare Pages + D1
- **Auth** — magic link, Google, GitHub
- **Access levels** — public, unlisted (default), private

## Install (coming to npm soon)

```bash
# Currently: install from source
git clone https://github.com/zurrixxx/vibe-pub
cd vibe-pub/cli && npm link
```

## Usage

```bash
vibe-pub login you@example.com           # get magic link
vibe-pub config --token <token>          # paste token from email
vibe-pub publish notes.md                # publish a file
vibe-pub publish report.md --slug q1 --access public
cat README.md | vibe-pub publish          # from stdin
vibe-pub list                            # your pages
vibe-pub update <id> notes.md            # edit
vibe-pub delete <id>                     # remove
```

## Project layout

```
vibe-pub/
├── cli/            # npm package (vibe-pub CLI)
├── src/            # SvelteKit app (routes, components, server)
├── migrations/     # D1 SQL migrations
├── static/         # Static assets
└── wrangler.toml   # Cloudflare config
```

## Status

Early development. APIs and CLI flags may change. Not recommended for production use.

## License

MIT © Charles Yang
