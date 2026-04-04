# vibe.pub Design System

## Visual Theme & Atmosphere

**Mood:** Developer tool meets editorial publishing. Clean, precise, unhurried.
**Density:** Generous whitespace. Content breathes. Every element earns its space.
**Philosophy:** The content IS the interface. UI recedes, markdown shines.

Inspired by: Linear (dark mode depth), Vercel (typographic precision), iA Writer (reading experience).

---

## Color Palette

### Light Mode
| Role | Value | Usage |
|------|-------|-------|
| Background | `#fafafa` | Page canvas |
| Surface | `#ffffff` | Cards, inputs, elevated |
| Surface Hover | `#f5f5f5` | Hover states |
| Border | `rgba(0,0,0,0.08)` | Default borders |
| Border Hover | `rgba(0,0,0,0.15)` | Interactive borders |
| Text Primary | `#0a0a0a` | Headings, body |
| Text Secondary | `#525252` | Descriptions, meta |
| Text Tertiary | `#a3a3a3` | Placeholders, timestamps |
| Accent | `#18181b` | Primary buttons, links |
| Accent Hover | `#27272a` | Button hover |

### Dark Mode
| Role | Value | Usage |
|------|-------|-------|
| Background | `#09090b` | Page canvas |
| Surface | `rgba(255,255,255,0.03)` | Cards, inputs |
| Surface Hover | `rgba(255,255,255,0.06)` | Hover states |
| Border | `rgba(255,255,255,0.08)` | Default borders |
| Border Hover | `rgba(255,255,255,0.15)` | Interactive borders |
| Text Primary | `#fafafa` | Headings, body |
| Text Secondary | `#a1a1aa` | Descriptions, meta |
| Text Tertiary | `#52525b` | Placeholders, timestamps |
| Accent | `#fafafa` | Primary buttons |
| Accent Hover | `#e4e4e7` | Button hover |

### Semantic
| Role | Value | Usage |
|------|-------|-------|
| Success | `#22c55e` | Published, active |
| Error | `#ef4444` | Errors, private badge |
| Info | `#3b82f6` | Links, doc badge |
| Purple | `#8b5cf6` | Kanban badge |

---

## Typography

### Font Stack
- **Brand/UI**: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **Monospace**: `"JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace`
- **Prose/Reading**: `"Inter", -apple-system, sans-serif` (same as UI but with optimized line-height)

Load Inter from Google Fonts with weights 400, 500, 600.
Load JetBrains Mono with weight 400, 500.

### Type Scale

| Role | Size | Weight | Line Height | Letter Spacing | Font |
|------|------|--------|-------------|----------------|------|
| Display | 32px | 600 | 1.1 | -0.64px | Inter |
| Heading 1 | 24px | 600 | 1.25 | -0.48px | Inter |
| Heading 2 | 20px | 600 | 1.3 | -0.3px | Inter |
| Heading 3 | 16px | 600 | 1.4 | -0.16px | Inter |
| Body Large | 18px | 400 | 1.7 | -0.01em | Inter |
| Body | 15px | 400 | 1.65 | 0 | Inter |
| Body Medium | 15px | 500 | 1.65 | 0 | Inter |
| Small | 13px | 400 | 1.5 | 0 | Inter |
| Small Medium | 13px | 500 | 1.5 | 0 | Inter |
| Caption | 12px | 500 | 1.4 | 0.01em | Inter |
| Mono Body | 14px | 400 | 1.6 | 0 | JetBrains Mono |
| Mono Small | 13px | 400 | 1.5 | 0 | JetBrains Mono |
| Mono Caption | 12px | 500 | 1.4 | 0 | JetBrains Mono |
| Brand | 18px | 600 | 1 | -0.36px | JetBrains Mono |

### Prose (rendered markdown)
- Body: 16px/1.75, Inter, weight 400
- Headings: Inter weight 600, tight letter-spacing
- Code inline: JetBrains Mono 14px, background `rgba(0,0,0,0.04)` / `rgba(255,255,255,0.06)`, padding 2px 6px, radius 4px
- Code blocks: JetBrains Mono 14px/1.6, radius 8px, padding 20px 24px
- Blockquote: left border 2px, text secondary color, italic

---

## Spacing

**Base unit:** 4px

| Token | Value | Usage |
|-------|-------|-------|
| space-1 | 4px | Inline gaps |
| space-2 | 8px | Tight padding |
| space-3 | 12px | Input padding |
| space-4 | 16px | Component padding |
| space-5 | 20px | Card padding |
| space-6 | 24px | Section gaps |
| space-8 | 32px | Large gaps |
| space-10 | 40px | Section padding |
| space-16 | 64px | Page vertical rhythm |
| space-20 | 80px | Hero spacing |

**Page max-width:** 680px (prose), 1080px (workspace list)
**Content padding:** 24px (mobile), 32px (desktop)

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| radius-sm | 4px | Inline code, small badges |
| radius-md | 6px | Buttons, inputs |
| radius-lg | 8px | Cards, code blocks |
| radius-xl | 12px | Featured cards, panels |
| radius-full | 9999px | Pills, avatars |

---

## Shadows & Elevation

Use shadow-as-border pattern (like Vercel). No heavy drop shadows.

| Level | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| Border | `0 0 0 1px rgba(0,0,0,0.08)` | `0 0 0 1px rgba(255,255,255,0.08)` | Default containers |
| Subtle | Border + `0 1px 2px rgba(0,0,0,0.04)` | Border + `0 1px 2px rgba(0,0,0,0.2)` | Cards |
| Elevated | Border + `0 4px 12px rgba(0,0,0,0.06)` | Border + `0 4px 12px rgba(0,0,0,0.3)` | Dropdowns, menus |
| Focus | `0 0 0 2px var(--accent), 0 0 0 4px rgba(59,130,246,0.3)` | Same | Keyboard focus |

---

## Components

### Buttons

**Primary**
- Light: bg `#18181b`, text `#ffffff`, hover bg `#27272a`
- Dark: bg `#fafafa`, text `#09090b`, hover bg `#e4e4e7`
- Padding: 8px 16px
- Radius: 6px
- Font: 14px, weight 500
- Transition: background-color 150ms

**Ghost**
- Light: bg transparent, text `#525252`, hover bg `rgba(0,0,0,0.04)`
- Dark: bg transparent, text `#a1a1aa`, hover bg `rgba(255,255,255,0.06)`
- Border: 1px solid `rgba(0,0,0,0.08)` / `rgba(255,255,255,0.08)`
- Padding: 8px 16px
- Radius: 6px

**Text/Link**
- No background, no border
- Text secondary color, hover text primary
- Underline on hover (underline-offset-4)

### Inputs

**Text Input / Textarea**
- Light: bg `#ffffff`, border `rgba(0,0,0,0.08)`
- Dark: bg `rgba(255,255,255,0.03)`, border `rgba(255,255,255,0.08)`
- Padding: 10px 14px
- Radius: 6px
- Font: 15px Inter (text inputs), 14px JetBrains Mono (textarea/code)
- Focus: border accent color + focus ring
- Placeholder: tertiary text color

### Cards

- Light: bg `#ffffff`, shadow border
- Dark: bg `rgba(255,255,255,0.03)`, shadow border
- Padding: 16px–20px
- Radius: 8px
- Hover: border becomes border-hover color
- Transition: border-color 150ms, box-shadow 150ms

### Badges

- Font: 12px, weight 500
- Padding: 2px 8px
- Radius: 9999px
- Variants: ghost (border only), filled (semantic colors at 10% opacity)

### Navigation Header

- Height: 56px
- Border bottom: 1px solid border color
- Brand: JetBrains Mono 18px weight 600
- Nav links: 14px weight 500, secondary text, hover primary text
- Max-width: same as content (680px for homepage)

---

## Layout Principles

- **Single column, centered.** Max-width 680px for content pages, 1080px for lists.
- **Vertical rhythm.** Sections separated by 64–80px. Components within sections separated by 16–24px.
- **Borders over backgrounds.** Use subtle borders (shadow-as-border) to separate content, not background color changes.
- **Full-bleed code blocks.** Code blocks extend to container edge with their own background.

---

## Do's and Don'ts

### Do
- Use generous line-height (1.65+) for reading content
- Use negative letter-spacing on headings (-0.3px to -0.64px)
- Let the textarea dominate the homepage — it IS the product
- Keep transitions subtle and fast (150ms)
- Use monospace for the brand, slugs, URLs, and code
- Use Inter for everything else

### Don't
- Add decorative elements, gradients, or illustrations
- Use more than 2 font weights in a single component
- Add color for color's sake — the palette is intentionally monochrome
- Use borders heavier than 1px
- Add hover animations that move elements (only color/opacity changes)
- Use rounded-full on anything except avatars and pills

---

## Responsive

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | <640px | Stack everything, 16px padding, textarea 10 rows |
| Tablet | 640–768px | 24px padding |
| Desktop | >768px | 32px padding, max-width containers |

Touch targets: minimum 44px height on mobile.

---

## Agent Prompt Guide

When building new components or pages:

**Colors:** Use CSS custom properties. Light: bg `#fafafa`, surface `#ffffff`, text `#0a0a0a`. Dark: bg `#09090b`, surface `rgba(255,255,255,0.03)`, text `#fafafa`.

**Quick reference Tailwind classes:**
- Background: `bg-[#fafafa] dark:bg-[#09090b]`
- Surface: `bg-white dark:bg-white/[0.03]`
- Text primary: `text-[#0a0a0a] dark:text-[#fafafa]`
- Text secondary: `text-[#525252] dark:text-[#a1a1aa]`
- Text tertiary: `text-[#a3a3a3] dark:text-[#52525b]`
- Border: `border-black/[0.08] dark:border-white/[0.08]`
- Primary button: `bg-[#18181b] text-white dark:bg-[#fafafa] dark:text-[#09090b]`
