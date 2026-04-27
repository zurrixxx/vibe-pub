# vibe.pub Design System

> Editorial meets developer tool. Warm paper background, italic display serifs, mono for the work, sans for the chrome.

## North Stars

**Lift from:** iA Writer (purity, type-first reading), Medium (editorial publication feel), Google Docs (comment + history UX simplicity).

**Reject:** Notion (dense chrome, doc-as-database), any AI-SaaS aesthetic (gradients, sparkles, feature-card grids).

Ask: *would iA Writer ship this? would Medium? would 2015-Google-Docs?* If all three say no, it's wrong for vibe.pub.

---

## CSS Tokens

Source of truth: `src/app.css` `:root` block. All values use CSS custom properties. Never hardcode a hex or font-family.

### Palette

| Token | Light | Dark |
|-------|-------|------|
| `--bg` | `#edeae5` (warm paper) | `#1a1917` |
| `--surface` | `#ffffff` | `#252422` |
| `--surface-hover` | `#f7f6f3` | `#2e2d2a` |
| `--text-primary` | `#1a1917` | `#edeae5` |
| `--text-secondary` | `#6b6963` | `#9e9b95` |
| `--text-tertiary` | `#9e9b95` | `#6b6963` |
| `--accent` | `#1a1917` | `#edeae5` |
| `--border` | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.06)` |

Semantic: `--success` `#22c55e`, `--error` `#ef4444`, `--info` `#3b82f6`, `--warning` `#f59e0b`, `--purple` `#8b5cf6`.

Kanban labels: `--label-bug` `#ef4444`, `--label-feature` `#3b82f6`, `--label-urgent` `#f59e0b`, `--label-design` `#8b5cf6`, `--label-default` `#6b7280`.

### Type Families

Five families, each with exactly one role:

| Family | Token | Role |
|--------|-------|------|
| Playfair Display italic | `--font-display` | Hero headlines + wordmark |
| Instrument Serif | `--font-serif` | Page titles, prose H1-H3 |
| Source Serif 4 | `--font-prose` | Long-form rendered markdown |
| Inter | `--font-sans` | UI chrome (buttons, inputs, nav, meta) |
| JetBrains Mono | `--font-mono` | CLI, URLs, slugs, mono labels |

### Radii

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-button` | `9999px` | Buttons are always pills |
| `--radius-card` | `16px` | Surfaces |
| `--radius-input` | `12px` | Text fields |
| `--radius-sm` | `6px` | Toolbar buttons, kbd |

### Elevation

Shadow-as-border. Cards use `--shadow-card`. Modals use `--shadow-elevated`. No heavy drop shadows.

---

## The 7 Rules

1. **Italic the pivot noun.** "Publish from your *terminal.*" Display italic, exactly once per headline.
2. **Pill buttons, always.** `border-radius: 9999px`. Primary = ink fill. Ghost = hairline + secondary text.
3. **CLI pill is the only dark element on a light page.** Use it. It's the signature.
4. **Lowercase wordmark, lowercase nav, lowercase slugs.** Sentence case for prose.
5. **No icons.** Use type, white space, and the section-number system. Unicode arrows OK.
6. **Shadow-as-border, never 1px lines.** Cards use `var(--shadow-card)`.
7. **Color appears only on kanban labels and semantic states.** Everything else is monochrome.

---

## Wordmark

The wordmark is the logo. It is Playfair Display 400, all lowercase, with `.pub` set in italic. In HTML: `vibe.<em>pub</em>`. Never bold, never uppercase. Tracking `-0.02em`.

---

## Voice

- Declarative, not breathless. "Markdown into shareable pages." Not "Revolutionize your workflow."
- Lowercase by default. Sentence case for prose.
- Use: publish, page, share, auto-detect, reading page, kanban, changelog, from your terminal.
- Don't use: post, blog, deploy, smart, AI-powered, view types, one-click, no-code.

---

## Don'ts

- No gradient backgrounds.
- No icon sets (Lucide, Feather, etc).
- No emoji in UI chrome.
- No square buttons. No bold wordmark. No uppercase wordmark.
- No invented colors. If you need one, it's already a token.
- Don't put the italic gesture twice in one headline.

---

## Page Themes

14 reader-selectable themes. Each overrides CSS variables. Default is the warm paper palette.

| Theme | Mood |
|-------|------|
| default | Warm editorial |
| paper | Antique parchment (Georgia prose) |
| terminal | Green-on-black (monospace) |
| midnight | Deep navy (indigo accent) |
| claude | Anthropic cream (terracotta accent) |
| stripe | Business blue |
| raycast | Dark launcher |
| nord | Arctic frost |
| monokai | Code editor (monospace) |
| dracula | Purple/pink |
| solarized | Blue/teal |
| github | Clean white/dark |
| rose | Soft pink |
| ocean | Sky blue |
