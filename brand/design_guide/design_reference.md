# Design Reference — yuryprimakov.com

**Extracted:** 2026-03-17
**Target:** Personal portfolio of Yury Primakov (Principal Full Stack Engineer)

---

## Site Overview

A Next.js 13+ App Router portfolio built on Tailwind CSS v3.4.13, shadcn/ui, and custom JSX-styled components. The defining visual feature is an **ambient gradient background system** — three large blurred orbs positioned behind all content create a soft, diffused light environment that shifts dramatically between light and dark modes. Cards are glassmorphic (semi-transparent with `backdrop-filter: blur`), allowing the ambient light to bleed through.

**Overall aesthetic:** Warm and atmospheric. The background orbs (blue/sky + orange/yellow + purple/indigo) make the page feel like it's lit from multiple soft sources. Cards float above this gradient as frosted glass panels. The accent color — `blue-500` (#3b82f6) — appears on the name "Primakov", the primary CTA button gradient, and badge gradients, providing a clear brand throughline without overwhelming the layout.

**Bento grid layout:** Content is arranged in a resizable dashboard grid (React Grid Layout) rather than a linear scroll. Cards snap to a grid with rounded-3xl (24px) corners throughout.

---

## Color Palette

### Brand Accent

`blue-500` — `#3b82f6` — used on: name "Primakov", primary button, skill badge gradients, card edge hover glow, "ALL SKILLS ↗" link.

### Design Token System (shadcn/ui default → Tailwind Slate)

All colors are CSS custom properties at `:root` and `.dark`, expressed in HSL channel values (used as `hsl(var(--token))`).

#### Light Mode

| Token | HSL | Hex | Tailwind Equivalent | Role |
|---|---|---|---|---|
| `--background` | 0 0% 100% | `#ffffff` | white | Page background |
| `--foreground` | 222.2 84% 4.9% | `#020817` | slate-950 | Primary text |
| `--primary` | 222.2 47.4% 11.2% | `#0f172a` | slate-900 | Primary interactive |
| `--primary-foreground` | 210 40% 98% | `#f8fafc` | slate-50 | Text on primary |
| `--secondary` | 210 40% 96.1% | `#f1f5f9` | slate-100 | Secondary backgrounds |
| `--secondary-foreground` | 222.2 47.4% 11.2% | `#0f172a` | slate-900 | Text on secondary |
| `--muted` | 210 40% 96.1% | `#f1f5f9` | slate-100 | Muted backgrounds |
| `--muted-foreground` | 215.4 16.3% 46.9% | `#64748b` | slate-500 | Muted/secondary text |
| `--accent` | 210 40% 96.1% | `#f1f5f9` | slate-100 | Accent backgrounds |
| `--accent-foreground` | 222.2 47.4% 11.2% | `#0f172a` | slate-900 | Text on accent |
| `--border` | 214.3 31.8% 91.4% | `#e2e8f0` | slate-200 | Borders, dividers |
| `--input` | 214.3 31.8% 91.4% | `#e2e8f0` | slate-200 | Input borders |
| `--ring` | 222.2 84% 4.9% | `#020817` | slate-950 | Focus rings |
| `--destructive` | 0 84.2% 60.2% | `#ef4444` | red-500 | Error/destructive |

#### Dark Mode

| Token | HSL | Hex | Tailwind Equivalent | Role |
|---|---|---|---|---|
| `--background` | 222.2 84% 4.9% | `#020817` | slate-950 | Page background |
| `--foreground` | 210 40% 98% | `#f8fafc` | slate-50 | Primary text |
| `--primary` | 210 40% 98% | `#f8fafc` | slate-50 | Primary interactive |
| `--primary-foreground` | 222.2 47.4% 11.2% | `#0f172a` | slate-900 | Text on primary |
| `--secondary` | 217.2 32.6% 17.5% | `#1e293b` | slate-800 | Secondary backgrounds |
| `--secondary-foreground` | 210 40% 98% | `#f8fafc` | slate-50 | Text on secondary |
| `--muted` | 217.2 32.6% 17.5% | `#1e293b` | slate-800 | Muted backgrounds |
| `--muted-foreground` | 215 20.2% 65.1% | `#94a3b8` | slate-400 | Muted/secondary text |
| `--accent` | 217.2 32.6% 17.5% | `#1e293b` | slate-800 | Accent backgrounds |
| `--accent-foreground` | 210 40% 98% | `#f8fafc` | slate-50 | Text on accent |
| `--border` | 217.2 32.6% 17.5% | `#1e293b` | slate-800 | Borders, dividers |
| `--input` | 217.2 32.6% 17.5% | `#1e293b` | slate-800 | Input borders |
| `--ring` | 212.7 26.8% 83.9% | `#cbd5e1` | slate-300 | Focus rings |
| `--destructive` | 0 62.8% 30.6% | `#7f1d1d` | red-900 | Error/destructive dark |

### Ambient Background Orbs (verified via Playwright computed styles)

Three absolutely-positioned `rounded-full blur-[60-80px]` divs are fixed behind all content. They shift color between light and dark mode.

#### Light Mode Orbs

| Orb | Size | Position | Gradient | Opacity |
|---|---|---|---|---|
| 1 — Blue/Sky | `40vw × 40vw` | Top-left | `rgb(147,197,253) → rgba(186,230,253,0.6)` (blue-300 → sky-200) | ~0.92 |
| 2 — Orange/Yellow | `45vw × 45vw` | Right | `rgba(254,214,169,0.8) → rgb(252,211,77)` (orange-200 → yellow-400) | ~0.75 |
| 3 — Purple/Blue | `30vw × 30vw` | Center-left | `rgb(216,180,254) → rgb(147,197,253)` (purple-300 → blue-300) | ~0.80 |

#### Dark Mode Orbs

| Orb | Size | Gradient | Opacity |
|---|---|---|---|
| 1 — Purple/Slate | `40vw × 40vw` | `rgb(168,85,247) → rgba(15,23,42,0.4)` (purple-500 → slate-900) | ~0.95 |
| 2 — Amber/Orange | `45vw × 45vw` | `rgba(245,158,11,0.8) → rgb(217,119,6)` (amber-500 → amber-600) | ~0.76 |
| 3 — Violet/Indigo | `30vw × 30vw` | `rgb(109,40,217) → rgb(99,102,241)` (violet-700 → indigo-500) | ~0.80 |

**Grid overlay** on top of orbs: `repeating-linear-gradient` 96px grid, `rgba(0,0,0,0.03)` lines — barely perceptible texture.

### Primary Button Gradient

`linear-gradient(to right, #60a5fa, #3b82f6, #2563eb)` — `from-blue-400 via-blue-500 to-blue-600`

### Skill Badge Gradients

Used on pill-shaped tags throughout the skills marquee and tech section:

**Cool/Tech:** `blue-500 (#3b82f6)` → `cyan-500 (#06b6d4)`
**Indigo:** `indigo-500 (#6366f1)` → `blue-500 (#3b82f6)`
**Creative/AI:** `purple-500 (#a855f7)` → `pink-500 (#ec4899)`
**Sky/Indigo:** `sky-400 (#38bdf8)` → `indigo-500 (#6366f1)`
**Green/Teal:** `green-500 (#22c55e)` → `teal-500 (#14b8a6)`
**Warm:** `orange-400 (#fb923c)` → `yellow-400 (#facc15)`
**Pink/Purple:** `pink-400 (#f472b6)` → `purple-400 (#c084fc)`
**Teal:** `teal-400 (#2dd4bf)` → `teal-600 (#0d9488)`

---

## Typography System

### Font Stack

No custom web fonts (no Google Fonts detected). The site uses the native system font stack:

```
system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'
```

This renders as:
- **Windows:** Segoe UI
- **macOS:** San Francisco (SF Pro)
- **Android:** Roboto
- **Linux:** Ubuntu / Noto Sans

### Type Scale (Tailwind defaults)

| Class | Size | Line Height | Use |
|---|---|---|---|
| `text-xs` | 0.75rem (12px) | 1rem | Labels, captions |
| `text-sm` | 0.875rem (14px) | 1.25rem | Secondary text, metadata |
| `text-base` | 1rem (16px) | 1.5rem | Body text |
| `text-lg` | 1.125rem (18px) | 1.75rem | Subheadings, lead text |
| `text-xl` | 1.25rem (20px) | 1.75rem | Section subheadings |
| `text-2xl` | 1.5rem (24px) | 2rem | Section headings |
| `text-3xl` | 1.875rem (30px) | 2.25rem | Page section titles |
| `text-4xl` | 2.25rem (36px) | 2.5rem | Hero heading |
| `text-6xl` | 3.75rem (60px) | 1 | Display / large hero |

### Font Weights

| Class | Weight | Use |
|---|---|---|
| `font-light` | 300 | Light decorative text |
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Labels, nav items |
| `font-semibold` | 600 | Card titles, section headings |
| `font-bold` | 700 | Primary headings, CTAs |
| `font-black` | 900 | Display headings (if used) |

---

## Spacing & Layout System

### Base Unit

Tailwind default 4px base (1 unit = 0.25rem).

### Common Spacing Values

| Class | Value | Pixels |
|---|---|---|
| `p-1` / `m-1` | 0.25rem | 4px |
| `p-2` / `m-2` | 0.5rem | 8px |
| `p-3` / `m-3` | 0.75rem | 12px |
| `p-4` / `m-4` | 1rem | 16px |
| `p-6` / `m-6` | 1.5rem | 24px |
| `p-8` / `m-8` | 2rem | 32px |
| `p-12` / `m-12` | 3rem | 48px |
| `p-20` / `m-20` | 5rem | 80px |
| `p-24` / `m-24` | 6rem | 96px |

### Responsive Breakpoints

| Prefix | Breakpoint | Notes |
|---|---|---|
| (none) | 0px | Mobile-first base |
| `xs:` | 475px | Small phones |
| `sm:` | 640px | Large phones |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Desktops |
| `xl:` | 1280px | Large desktops |
| `2xl:` | 1536px | Wide screens |

---

## Border & Shape System

### Border Radius

| Token | Value | Notes |
|---|---|---|
| `--radius` | 0.5rem (8px) | Base radius |
| `rounded-sm` | `calc(var(--radius) - 4px)` = 4px | Small elements |
| `rounded-md` | `calc(var(--radius) - 2px)` = 6px | Medium elements |
| `rounded-lg` | `var(--radius)` = 8px | Cards, panels |
| `rounded-xl` | 0.75rem (12px) | Larger cards |
| `rounded-2xl` | 1rem (16px) | Feature cards |
| `rounded-full` | 9999px | Pills, avatars |

### Shadow Scale

| Class | Value |
|---|---|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` |
| `shadow` | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)` |
| `shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)` |
| `shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)` |
| `shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)` |
| `shadow-2xl` | `0 25px 50px -12px rgba(0,0,0,0.25)` |

---

## Motion & Animation

### Custom Animations

| Name | Effect | Timing |
|---|---|---|
| `animate-scroll` | `translateX(0) → translateX(-100%)` | 20s linear infinite |

**Used for:** Horizontal skills/tech marquee — a continuous scrolling strip of skill badges.

### Spotlight / Mouse-Follow Glow Effect

> Full implementation brief: see [`SPOTLIGHT_EFFECT.md`](./SPOTLIGHT_EFFECT.md)

The signature interactive effect: every card has a glowing orb that follows the mouse cursor. It is **JavaScript-driven**, not CSS-only. Three layers work together:

1. **`useMousePosition` hook** — global `window.mousemove` listener stores `clientX`/`clientY` in state
2. **`<Spotlight>` container** — throttled `useEffect` (~100ms) calls `getBoundingClientRect()` per card, writes `--mouse-x` / `--mouse-y` as CSS custom properties onto each card element
3. **`<SpotlightCard>`** — two large blurred circles (`::before` / `::after`) that `translate()` to the cursor position and blur into a soft diffused glow

#### Component hierarchy
```
<Spotlight>                          ← sets --mouse-x/--mouse-y per card
  <SpotlightCard>                    ← ::before (white orb) + ::after (violet orb)
    <div z-20>                       ← actual card content, semi-transparent + backdrop-blur
      {children}
    </div>
  </SpotlightCard>
</Spotlight>
```

#### Key numbers

| Property | Value |
|---|---|
| `::before` orb size | 320×320px |
| `::after` orb size | 384×384px |
| `::before` offset | `left: -160px; top: -160px` |
| `::after` offset | `left: -192px; top: -192px` |
| Blur radius | `100px` on both |
| `::before` color | `rgba(248, 250, 252, 1)` — white/slate |
| `::after` color (dark) | `rgb(139, 92, 246)` — violet-500 |
| `::after` color (light) | `rgb(237, 233, 254)` — violet-100 |
| `::before` opacity | 20% always-on |
| `::after` opacity | 20% light / 10% dark |
| Opacity transition | 500ms |
| Mouse update throttle | 100ms |
| Outer wrapper padding | `1px` — glow bleeds through as a rim light on the card edge |

#### The detail that makes it feel special

The `1px` padding on the outer `<Spotlight>` wrapper creates a hairline gap between wrapper and card. The glow orbs sit in that gap, making a faint colored rim light appear on the card edge nearest the cursor — the detail most viewers feel but can't identify.

#### Source files (in this project)
- `src/components/Spotlight.tsx` — `Spotlight` wrapper + `SpotlightCard`
- `src/components/common/Card.tsx` — wraps `SpotlightCard` with hover/scale/active state
- `src/lib/utils/useMousePosition.ts` — global mouse position hook

### Standard Tailwind Animations

| Name | Effect |
|---|---|
| `animate-bounce` | Vertical bounce (translateY -25%) |
| `animate-pulse` | Opacity fade to 0.5 |
| `animate-spin` | Full rotation (360°) |

### Transition System

**Default easing functions:**
- `ease-in`: `cubic-bezier(0.4, 0, 1, 1)` — accelerating
- `ease-out`: `cubic-bezier(0, 0, 0.2, 1)` — decelerating (most natural for UI)
- `ease-in-out`: `cubic-bezier(0.4, 0, 0.2, 1)` — standard interactive

**Common durations:** 100ms, 150ms, 200ms, 300ms, 500ms

### Backdrop Blur

Available for frosted-glass effects (likely nav bar on scroll):
- `backdrop-blur-sm`: blur(4px)
- `backdrop-blur-md`: blur(12px)
- `backdrop-blur-xl`: blur(24px)

---

## Component Inventory

### Navigation
- Centered **pill nav** — `rounded-full` container with `backdrop-blur-md` + `bg-card/60`
- Active tab has `bg-background shadow-sm` inside the pill
- Items: About, Skills, Portfolio
- Top-right: theme toggle (sun/moon icons) + login icon

### Glass Card System (verified)

Every content panel uses a two-layer wrapper:

**Outer wrapper** (`SpotlightCard`):
```
rounded-3xl  p-px  backdrop-blur-md
box-shadow: rgba(107,33,168,0.3) 0px 25px 50px -12px   ← purple outer glow
background: border-color (1px gap = rim light channel)
```

**Inner surface**:
```
rounded-[inherit]  z-20
background (light): rgba(241,245,249,0.6)   ← slate-100 @ 60%
background (dark):  rgba(2,6,23,0.7)         ← slate-950 @ 70%
box-shadow: inset 0px 1px 0px rgba(255,255,255,0.1)   ← top-edge highlight
```

### Animated Card Border (hover)
Blue gradient lines appear on card edges on hover:
- Vertical: `linear-gradient(0deg, transparent, rgba(59,130,246,0.7), transparent)`
- Horizontal: `linear-gradient(90deg, transparent, rgba(59,130,246,0.7), transparent)`
- Default: `opacity-0` → Hover: `opacity-1` with `transition: opacity 0.3s`

### Profile / Hero Card
- Avatar: circular photo, `rounded-full`, `64-80px`
- Name: `font-bold tracking-tight` — "Yury" in foreground, **"Primakov" in `blue-500`**
- Title: `uppercase tracking-wide text-xs font-semibold text-muted-fg` — "PRINCIPAL FULL STACK ENGINEER"
- Bio: `text-sm text-muted-fg leading-relaxed`
- Primary CTA: blue gradient button — `from-blue-400 via-blue-500 to-blue-600`
- Social links: icon + label in glass pill buttons (`rounded-3xl backdrop-blur`)

### Tech Stack Icons
- Icon cards: `rounded-2xl backdrop-blur`, 72px min-width
- Each has a brand-colored 40px icon `(e.g. #f7df1e JS, #3178c6 TypeScript)`
- Section header: "SKILLS/TECH" left, "ALL SKILLS ↗" right in `blue-500`
- Hover: `translateY(-2px)` + `shadow-lg`

### Experience List
- Inside a glass card
- Most-recent role: **full opacity**
- All prior roles: **`opacity-45`** (dimmed) — communicates recency hierarchy
- Row format: role + company left, date range right (`tabular-nums`)
- Dividers: `border-b border-border`

### Skills Marquee
- `animate-scroll` 20s linear infinite
- Fade masks: `w-28 mix-blend-luminosity` using `from-slate-200 (light) / from-slate-950 (dark)` → transparent
- Hover: `animation-play-state: paused`

### Theme System
- Toggle: light / dark / system
- Persisted in `localStorage` key `'theme'`
- System preference: `window.matchMedia('(prefers-color-scheme: dark)')`
- Applied via `.dark` class on `<html>` element

---

## Interactive States

### Links & Nav Items
- **Default:** `text-foreground` or `text-muted-foreground`
- **Hover:** color shift toward `text-primary`, likely `transition-colors duration-200`
- **Focus:** `ring` outline using `--ring` token

### Buttons (Primary)
- **Default:** `bg-primary text-primary-foreground`
- **Hover:** lighter shade or opacity change, `transition-colors`
- **Active:** slight scale-down transform
- **Focus:** ring outline

### Buttons (Secondary/Ghost)
- **Default:** `bg-secondary` or transparent
- **Hover:** `bg-muted` or `bg-accent`

---

## Design Personality

**Atmospheric depth over flat minimalism:** The three-orb ambient background is the first impression — the page feels *lit*, not just styled. Light mode is warm and airy (blue dawn light + amber afternoon warmth); dark mode is cinematic (deep purple twilight + amber glow at the edge). This isn't an afterthought — it's the dominant visual statement.

**Glassmorphism as structure:** Every content panel is frosted glass. The `1px` outer wrapper gap creates a rim light where background orbs bleed through as a subtle colored border — the detail most visitors feel but can't identify. The `rgba(107,33,168,0.3)` purple drop shadow ties all cards to the ambient palette.

**Blue as the single brand color:** `blue-500` (#3b82f6) appears exactly where attention should land — the surname "Primakov", the primary CTA, the card edge hover glow, and skill badge gradients. Everything else is neutral slate. This restraint makes every blue hit land hard.

**Opacity hierarchy in the experience list:** Active/current role at full opacity; all past roles dimmed to 45%. A single CSS rule communicates seniority, recency, and focus simultaneously — no badges, no labels needed.

**Motion that earns its place:** The marquee scrolls on a 20s loop (slow enough to be ambient, not distracting). Card edge hover glow (blue gradient lines) and spotlight orb tracking are the only other animations. The page never feels gratuitously animated.

**Bento grid flexibility:** React Grid Layout lets cards be rearranged/resized — the design system is built for this. `rounded-3xl` (24px) on every card and the ambient background mean any layout reconfiguration still looks cohesive.
