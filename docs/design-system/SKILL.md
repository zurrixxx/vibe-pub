# SKILL — designing for vibe.pub

A short guide for an agent (or designer) about to make something for vibe.pub.

## Always do this first

1. **Read `PRODUCT.md`** — product context, non-goals, the 6 view types, key interactions (comment-as-instruction, version history), and the design references (iA Writer / Medium / Google Docs · not Notion).
2. `<link rel="stylesheet" href="colors_and_type.css">` — pulls fonts + tokens. Never inline a Google Fonts import or a hex code; everything you need is a CSS variable.
3. Use the **type utility classes** (`.t-display`, `.t-title`, `.t-prose`, `.t-body`, `.t-meta`, `.t-mono`, `.t-mono-label`). Don't reinvent sizes.
4. Background is `--bg` (warm paper). Cards are `--surface`. Text is `--text-primary` / `secondary` / `tertiary`. That's the whole palette for 95% of cases.

## North stars

- ✅ iA Writer (purity) · Medium (editorial) · Google Docs (comments + history flow)
- ❌ Notion (dense chrome, doc-as-database) · AI-SaaS (gradients, sparkles)

## The 7 rules that make it look like vibe.pub

1. **Italic the pivot noun.** "Publish from your *terminal.*" — display italic, exactly once per headline.
2. **Pill buttons, always.** `border-radius: 9999px`. Primary = ink fill. Ghost = hairline + secondary text.
3. **CLI pill is the only dark element on a light page.** Use it. It's the signature.
4. **Lowercase wordmark, lowercase nav, lowercase slugs.** Sentence case for prose.
5. **No icons.** Use type, white space, and the section-number system (`01 ·`, `02 ·`). Unicode arrows OK.
6. **Shadow-as-border, never 1px lines.** Cards use `var(--shadow-card)`.
7. **Color appears only on kanban labels and semantic states.** Everything else is monochrome.

## Don'ts

- ❌ No gradient backgrounds, ever.
- ❌ No Lucide/Feather/Phosphor icon sets.
- ❌ No emoji in UI chrome.
- ❌ No square buttons. No bold wordmark. No uppercase wordmark.
- ❌ No invented colors — if you need one, it's already a token.
- ❌ Don't put the italic gesture twice in one headline.

## Files to crib from

| Building this | Open this |
|---|---|
| Marketing / landing surface | `ui_kit/landing_page.html` |
| Rendered markdown ("doc" view) | `ui_kit/reading_page.html` |
| Kanban view | `ui_kit/kanban_board.html` |
| Buttons / inputs / badges / CLI | `ui_kit/components.html` |
| Type pairings & scale | `preview/type.html` |
| Tokens & swatches | `preview/colors.html`, `preview/spacing.html` |
| Logo lockups & favicon | `preview/brand.html`, `Brand.html` |

## Tone cheat-sheet

> ✅ "Markdown into *shareable* pages."
> ✅ "Built so an AI agent can publish as easily as a developer can."
> ✅ "auto-detects docs, kanban, changelogs"
>
> ❌ "Lightning-fast AI-powered publishing platform."
> ❌ "Revolutionize the way your team ships docs."
> ❌ "Smart" / "intelligent" / "no-code" / "one-click"

## When you're stuck

Open `Brand.html`. It's the editorial poster — every brand decision is shown applied at the size you'd actually use it.
